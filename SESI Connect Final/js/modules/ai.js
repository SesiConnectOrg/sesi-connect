/* =========================================================
   SESI CONNECT
   Módulo do assistente educacional com IA
   ========================================================= */

"use strict";

/* =========================
   CONFIGURAÇÕES
   ========================= */

const AI_CONFIG = Object.freeze({
  conversationsKey: "sesi-connect-ai-conversations",
  activeConversationKey: "sesi-connect-ai-active-conversation",
  draftKey: "sesi-connect-ai-draft",

  maximumConversations: 30,
  maximumMessagesPerConversation: 100,
  maximumMessageLength: 4000,
  maximumAttachmentSize: 10 * 1024 * 1024,

  simulatedResponseDelay: {
    minimum: 650,
    maximum: 1300,
  },

  acceptedFileTypes: [
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
  ],
});

/* =========================
   SUGESTÕES INICIAIS
   ========================= */

const AI_SUGGESTIONS = Object.freeze([
  {
    id: "suggestion-math",
    icon: "fa-calculator",
    title: "Explicar Matemática",
    description: "Explique funções do segundo grau de maneira simples.",
    prompt:
      "Explique funções do segundo grau de maneira simples, com definição, fórmula e um exemplo resolvido.",
  },

  {
    id: "suggestion-essay",
    icon: "fa-pen-nib",
    title: "Ajuda com redação",
    description: "Crie uma estrutura para uma redação do ENEM.",
    prompt:
      "Ajude-me a montar uma estrutura de redação do ENEM sobre inclusão social, sem escrever o texto inteiro.",
  },

  {
    id: "suggestion-summary",
    icon: "fa-file-lines",
    title: "Criar resumo",
    description: "Resuma um conteúdo para facilitar a revisão.",
    prompt:
      "Crie um resumo organizado sobre Revolução Industrial, destacando causas, características e consequências.",
  },

  {
    id: "suggestion-study",
    icon: "fa-graduation-cap",
    title: "Plano de estudos",
    description: "Organize uma rotina de estudos para esta semana.",
    prompt:
      "Monte um plano de estudos de cinco dias, com duas horas por dia, para Matemática, Português, História e Física.",
  },
]);

/* =========================
   ESTADO
   ========================= */

const aiState = {
  initialized: false,
  conversations: [],
  activeConversationId: null,
  attachment: null,
  generating: false,
  mobileHistoryOpen: false,
};

/* =========================
   UTILITÁRIOS DO DOM
   ========================= */

function select(selector, context = document) {
  return context.querySelector(selector);
}

function selectAll(selector, context = document) {
  return [...context.querySelectorAll(selector)];
}

function emitAIEvent(name, detail = {}) {
  document.dispatchEvent(
    new CustomEvent(name, {
      bubbles: true,
      detail,
    }),
  );
}

function createElement(tagName, className = "", textContent = null) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (textContent !== null) {
    element.textContent = textContent;
  }

  return element;
}

function createIcon(iconClass) {
  const icon = createElement("i");

  icon.className = `fa-solid ${iconClass}`;

  return icon;
}

function createId(prefix = "ai") {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return [prefix, Date.now(), Math.random().toString(16).slice(2)].join("-");
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

/* =========================
   ARMAZENAMENTO
   ========================= */

function readStorage(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);

    if (value === null) {
      return fallback;
    }

    return JSON.parse(value);
  } catch (error) {
    console.warn(`[SESI Connect] Não foi possível ler "${key}".`, error);

    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));

    return true;
  } catch (error) {
    console.warn(`[SESI Connect] Não foi possível salvar "${key}".`, error);

    return false;
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[SESI Connect] Não foi possível remover "${key}".`, error);
  }
}

/* =========================
   NORMALIZAÇÃO
   ========================= */

function normalizeMessage(message = {}) {
  const validRoles = ["user", "assistant"];

  return {
    id: String(message.id || createId("message")),

    role: validRoles.includes(message.role) ? message.role : "user",

    content: String(message.content || "").trim(),

    createdAt: isValidDate(message.createdAt)
      ? message.createdAt
      : new Date().toISOString(),

    attachment:
      message.attachment && typeof message.attachment === "object"
        ? {
            name: String(message.attachment.name || ""),
            type: String(message.attachment.type || ""),
            size: Number(message.attachment.size || 0),
          }
        : null,
  };
}

function normalizeConversation(conversation = {}) {
  const messages = Array.isArray(conversation.messages)
    ? conversation.messages
        .map(normalizeMessage)
        .slice(-AI_CONFIG.maximumMessagesPerConversation)
    : [];

  return {
    id: String(conversation.id || createId("conversation")),

    title: String(conversation.title || "Nova conversa").trim(),

    createdAt: isValidDate(conversation.createdAt)
      ? conversation.createdAt
      : new Date().toISOString(),

    updatedAt: isValidDate(conversation.updatedAt)
      ? conversation.updatedAt
      : new Date().toISOString(),

    messages,
  };
}

function isValidDate(value) {
  return Boolean(value && !Number.isNaN(new Date(value).getTime()));
}

/* =========================
   CONVERSAS
   ========================= */

function loadConversations() {
  const storedConversations = readStorage(AI_CONFIG.conversationsKey, []);

  aiState.conversations = Array.isArray(storedConversations)
    ? storedConversations
        .map(normalizeConversation)
        .sort(sortConversations)
        .slice(0, AI_CONFIG.maximumConversations)
    : [];

  const storedActiveId = readStorage(AI_CONFIG.activeConversationKey);

  if (storedActiveId && getConversationById(storedActiveId)) {
    aiState.activeConversationId = storedActiveId;
  } else {
    aiState.activeConversationId = aiState.conversations[0]?.id || null;
  }

  return getConversations();
}

function saveConversations() {
  aiState.conversations = aiState.conversations
    .sort(sortConversations)
    .slice(0, AI_CONFIG.maximumConversations);

  writeStorage(AI_CONFIG.conversationsKey, aiState.conversations);

  writeStorage(AI_CONFIG.activeConversationKey, aiState.activeConversationId);
}

function sortConversations(first, second) {
  return (
    new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
  );
}

function getConversations() {
  return cloneData(aiState.conversations);
}

function getConversationById(conversationId) {
  return (
    aiState.conversations.find(
      (conversation) => conversation.id === conversationId,
    ) || null
  );
}

function getActiveConversation() {
  return getConversationById(aiState.activeConversationId);
}

function createConversation({ title = "Nova conversa", activate = true } = {}) {
  const now = new Date().toISOString();

  const conversation = normalizeConversation({
    id: createId("conversation"),
    title,
    createdAt: now,
    updatedAt: now,
    messages: [],
  });

  aiState.conversations.unshift(conversation);

  if (activate) {
    aiState.activeConversationId = conversation.id;
  }

  saveConversations();
  renderAI();

  emitAIEvent("sesi:ai-conversation-created", {
    conversation: cloneData(conversation),
  });

  return cloneData(conversation);
}

function ensureActiveConversation() {
  let conversation = getActiveConversation();

  if (!conversation) {
    createConversation();

    conversation = getActiveConversation();
  }

  return conversation;
}

function setActiveConversation(conversationId) {
  const conversation = getConversationById(conversationId);

  if (!conversation) {
    return false;
  }

  aiState.activeConversationId = conversationId;

  writeStorage(AI_CONFIG.activeConversationKey, conversationId);

  renderAI();
  closeMobileHistory();

  emitAIEvent("sesi:ai-conversation-selected", {
    conversation: cloneData(conversation),
  });

  return true;
}

function removeConversation(conversationId) {
  const previousLength = aiState.conversations.length;

  aiState.conversations = aiState.conversations.filter(
    (conversation) => conversation.id !== conversationId,
  );

  if (previousLength === aiState.conversations.length) {
    return false;
  }

  if (aiState.activeConversationId === conversationId) {
    aiState.activeConversationId = aiState.conversations[0]?.id || null;
  }

  saveConversations();
  renderAI();

  showMessage("Conversa removida.", "success");

  emitAIEvent("sesi:ai-conversation-removed", {
    conversationId,
  });

  return true;
}

function clearConversationHistory({ confirm = true } = {}) {
  if (aiState.conversations.length === 0) {
    showMessage("O histórico já está vazio.", "info");

    return false;
  }

  if (
    confirm &&
    !window.confirm("Deseja apagar todo o histórico de conversas?")
  ) {
    return false;
  }

  aiState.conversations = [];
  aiState.activeConversationId = null;

  saveConversations();
  renderAI();

  showMessage("Histórico apagado.", "success");

  emitAIEvent("sesi:ai-history-cleared");

  return true;
}

/* =========================
   TÍTULO DA CONVERSA
   ========================= */

function generateConversationTitle(content) {
  const normalizedContent = normalizeText(content);

  if (!normalizedContent) {
    return "Nova conversa";
  }

  const maximumLength = 42;

  if (normalizedContent.length <= maximumLength) {
    return normalizedContent;
  }

  return normalizedContent.slice(0, maximumLength).trimEnd() + "...";
}

function updateConversationTitle(conversation, firstMessage) {
  if (
    conversation.messages.length <= 1 ||
    conversation.title === "Nova conversa"
  ) {
    conversation.title = generateConversationTitle(firstMessage);
  }
}

/* =========================
   MENSAGENS
   ========================= */

function addMessage(conversationId, message) {
  const conversation = getConversationById(conversationId);

  if (!conversation) {
    return null;
  }

  const normalizedMessage = normalizeMessage(message);

  conversation.messages.push(normalizedMessage);

  conversation.messages = conversation.messages.slice(
    -AI_CONFIG.maximumMessagesPerConversation,
  );

  conversation.updatedAt = new Date().toISOString();

  if (normalizedMessage.role === "user") {
    updateConversationTitle(conversation, normalizedMessage.content);
  }

  saveConversations();

  return cloneData(normalizedMessage);
}

function getConversationMessages(
  conversationId = aiState.activeConversationId,
) {
  const conversation = getConversationById(conversationId);

  return conversation ? cloneData(conversation.messages) : [];
}

/* =========================
   ENVIO DA MENSAGEM
   ========================= */

async function sendMessage(rawContent, options = {}) {
  if (aiState.generating) {
    showMessage("Aguarde a resposta atual terminar.", "warning");

    return false;
  }

  const content = normalizeText(rawContent);

  if (!content && !aiState.attachment) {
    showMessage("Digite uma mensagem.", "warning");

    return false;
  }

  if (content.length > AI_CONFIG.maximumMessageLength) {
    showMessage(
      `A mensagem deve ter no máximo ${AI_CONFIG.maximumMessageLength} caracteres.`,
      "error",
    );

    return false;
  }

  const conversation = ensureActiveConversation();

  const userMessage = addMessage(conversation.id, {
    role: "user",
    content: content || "Analise o arquivo anexado.",
    createdAt: new Date().toISOString(),
    attachment: aiState.attachment
      ? {
          ...aiState.attachment,
        }
      : null,
  });

  const attachment = aiState.attachment
    ? {
        ...aiState.attachment,
      }
    : null;

  clearAttachment();
  clearInput();
  clearDraft();

  aiState.generating = true;

  renderMessages();
  renderHistory();
  updateChatControls();
  showTypingIndicator();

  emitAIEvent("sesi:ai-message-sent", {
    conversationId: conversation.id,
    message: userMessage,
  });

  try {
    const response = await generateEducationalResponse(content, {
      attachment,
      conversation: getConversationById(conversation.id),
      ...options,
    });

    addMessage(conversation.id, {
      role: "assistant",
      content: response,
      createdAt: new Date().toISOString(),
    });

    renderAI();
    scrollMessagesToBottom();

    emitAIEvent("sesi:ai-response-generated", {
      conversationId: conversation.id,
      response,
    });

    return true;
  } catch (error) {
    console.error("[SESI Connect] Erro ao gerar resposta.", error);

    showMessage("Não foi possível gerar uma resposta.", "error");

    return false;
  } finally {
    aiState.generating = false;

    hideTypingIndicator();
    updateChatControls();
  }
}

/* =========================
   RESPOSTA DEMONSTRATIVA
   ========================= */

async function generateEducationalResponse(prompt, context = {}) {
  const delay = randomNumber(
    AI_CONFIG.simulatedResponseDelay.minimum,
    AI_CONFIG.simulatedResponseDelay.maximum,
  );

  await wait(delay);

  const normalizedPrompt = normalizeText(prompt).toLowerCase();

  if (context.attachment) {
    return createAttachmentResponse(context.attachment, normalizedPrompt);
  }

  if (
    containsAny(normalizedPrompt, [
      "função do segundo grau",
      "funcao do segundo grau",
      "função quadrática",
      "funcao quadratica",
      "bhaskara",
    ])
  ) {
    return [
      "Uma função do segundo grau tem a forma:",
      "",
      "f(x) = ax² + bx + c, com a diferente de zero.",
      "",
      "• a determina a abertura e a direção da parábola.",
      "• b influencia a posição do vértice.",
      "• c indica onde o gráfico cruza o eixo y.",
      "",
      "Exemplo: f(x) = x² - 5x + 6.",
      "",
      "Para encontrar as raízes, resolvemos x² - 5x + 6 = 0. A expressão pode ser fatorada como (x - 2)(x - 3), então as raízes são x = 2 e x = 3.",
      "",
      "O vértice pode ser encontrado pelas fórmulas xv = -b/(2a) e yv = -Δ/(4a).",
    ].join("\n");
  }

  if (
    containsAny(normalizedPrompt, [
      "redação",
      "redacao",
      "enem",
      "introdução",
      "introducao",
      "dissertativo",
    ])
  ) {
    return [
      "Você pode estruturar sua redação em quatro partes:",
      "",
      "1. Introdução: apresente o tema, contextualize o problema e indique as duas ideias que serão desenvolvidas.",
      "",
      "2. Desenvolvimento 1: explique a primeira causa ou barreira, usando argumento, exemplo e consequência.",
      "",
      "3. Desenvolvimento 2: desenvolva a segunda ideia com outro argumento e um repertório pertinente.",
      "",
      "4. Conclusão: apresente uma proposta de intervenção com agente, ação, meio de execução, finalidade e detalhamento.",
      "",
      "Evite copiar os textos motivadores e revise a conexão entre os parágrafos.",
    ].join("\n");
  }

  if (
    containsAny(normalizedPrompt, [
      "revolução industrial",
      "revolucao industrial",
    ])
  ) {
    return [
      "Resumo — Revolução Industrial",
      "",
      "• Iniciou-se na Inglaterra durante o século XVIII.",
      "• Foi impulsionada pelo acúmulo de capital, disponibilidade de carvão, avanços técnicos e mão de obra.",
      "• A produção artesanal foi progressivamente substituída pela produção mecanizada.",
      "• Houve crescimento das fábricas, urbanização e formação do operariado.",
      "• As jornadas eram longas e as condições de trabalho, precárias.",
      "• O processo aumentou a produtividade, mas também aprofundou desigualdades sociais e impactos ambientais.",
      "",
      "Para revisar, tente explicar a relação entre industrialização, urbanização e mudanças no trabalho.",
    ].join("\n");
  }

  if (
    containsAny(normalizedPrompt, [
      "plano de estudos",
      "rotina de estudos",
      "cronograma de estudos",
    ])
  ) {
    return [
      "Plano de estudos de cinco dias — 2 horas por dia",
      "",
      "Segunda: 50 min de Matemática, 10 min de intervalo e 60 min de Português.",
      "",
      "Terça: 50 min de História, 10 min de intervalo e 60 min de Física.",
      "",
      "Quarta: 50 min de Matemática, 10 min de intervalo e 60 min de redação.",
      "",
      "Quinta: 50 min de Física, 10 min de intervalo e 60 min de História.",
      "",
      "Sexta: 40 min de exercícios, 40 min de revisão dos erros e 40 min de resumo.",
      "",
      "Comece cada sessão definindo uma meta pequena e termine registrando as dúvidas.",
    ].join("\n");
  }

  if (containsAny(normalizedPrompt, ["resuma", "resumo", "resumir"])) {
    return [
      "Posso organizar um resumo em:",
      "",
      "• conceito principal;",
      "• causas;",
      "• características;",
      "• consequências;",
      "• exemplos;",
      "• perguntas para revisão.",
      "",
      "Envie o conteúdo ou informe o assunto específico que deseja resumir.",
    ].join("\n");
  }

  if (
    containsAny(normalizedPrompt, [
      "exercício",
      "exercicio",
      "questão",
      "questao",
    ])
  ) {
    return [
      "Vamos resolver por etapas:",
      "",
      "1. Identifique o que a questão pede.",
      "2. Separe os dados fornecidos.",
      "3. Escolha a fórmula ou conceito adequado.",
      "4. Substitua os valores com atenção às unidades.",
      "5. Confira se o resultado faz sentido.",
      "",
      "Envie o enunciado completo para eu orientar cada etapa sem apenas entregar a resposta.",
    ].join("\n");
  }

  return [
    "Posso ajudar a estudar esse conteúdo de forma organizada.",
    "",
    "Para começar, tente informar:",
    "",
    "• a disciplina;",
    "• o assunto específico;",
    "• sua principal dúvida;",
    "• se prefere explicação, resumo, exercícios ou um plano de revisão.",
    "",
    `Sua solicitação foi: “${limitText(prompt, 180)}”.`,
    "",
    "Este assistente está funcionando em modo demonstrativo e não está conectado a um serviço externo de inteligência artificial.",
  ].join("\n");
}

function createAttachmentResponse(attachment, normalizedPrompt) {
  const fileName = attachment.name || "arquivo anexado";

  if (normalizedPrompt.includes("resum")) {
    return [
      `O arquivo “${fileName}” foi anexado.`,
      "",
      "Nesta versão demonstrativa, o sistema registra o arquivo, mas ainda não consegue ler o conteúdo real dele.",
      "",
      "Cole o texto principal na conversa para que eu possa criar um resumo estruturado.",
    ].join("\n");
  }

  return [
    `Recebi o arquivo “${fileName}”.`,
    "",
    "O envio está funcionando, porém a leitura automática do conteúdo depende de uma integração futura com um servidor ou serviço de IA.",
    "",
    "Você pode copiar o trecho que deseja estudar e enviá-lo nesta conversa.",
  ].join("\n");
}

function containsAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function limitText(text, maximumLength) {
  const normalized = normalizeText(text);

  if (normalized.length <= maximumLength) {
    return normalized;
  }

  return normalized.slice(0, maximumLength).trimEnd() + "...";
}

function randomNumber(minimum, maximum) {
  return Math.floor(Math.random() * (maximum - minimum + 1) + minimum);
}

function wait(duration) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

/* =========================
   ELEMENTOS PRINCIPAIS
   ========================= */

function getChatMessagesContainer() {
  return (
    document.getElementById("ai-chat-messages") ||
    document.getElementById("chat-messages") ||
    select(
      [".ai-chat-messages", ".chat-messages", "[data-ai-messages]"].join(","),
    )
  );
}

function getHistoryContainer() {
  return (
    document.getElementById("ai-history-list") ||
    select([".ai-history-list", "[data-ai-history]"].join(","))
  );
}

function getChatInput() {
  return (
    document.getElementById("chat-input") ||
    document.getElementById("ai-chat-input") ||
    select([".ai-chat-input", "[data-ai-input]"].join(","))
  );
}

function getChatForm() {
  return (
    document.getElementById("ai-chat-form") ||
    select([".ai-chat-form", "[data-ai-form]"].join(","))
  );
}

function getSendButton() {
  return (
    document.getElementById("ai-send-button") ||
    select([".ai-send-button", "[data-ai-send]"].join(","))
  );
}

function getAttachmentInput() {
  return (
    document.getElementById("ai-attachment-input") ||
    select(["[data-ai-attachment-input]", ".ai-attachment-input"].join(","))
  );
}

/* =========================
   RENDERIZAÇÃO GERAL
   ========================= */

function renderAI() {
  renderHistory();
  renderMessages();
  renderAttachmentPreview();
  updateChatHeader();
  updateChatControls();
}

function renderHistory() {
  const container = getHistoryContainer();

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (aiState.conversations.length === 0) {
    container.appendChild(createHistoryEmptyState());

    return;
  }

  const fragment = document.createDocumentFragment();

  aiState.conversations.sort(sortConversations).forEach((conversation) => {
    fragment.appendChild(createHistoryItem(conversation));
  });

  container.appendChild(fragment);
}

function createHistoryItem(conversation) {
  const item = createElement("div", "ai-history-item");

  item.dataset.conversationId = conversation.id;

  item.classList.toggle(
    "active",
    conversation.id === aiState.activeConversationId,
  );

  item.setAttribute("role", "button");

  item.tabIndex = 0;

  item.appendChild(createIcon("fa-message"));

  const text = createElement("span", "ai-history-text", conversation.title);

  const menuButton = createElement("button", "ai-history-menu");

  menuButton.type = "button";
  menuButton.setAttribute("aria-label", "Remover conversa");

  menuButton.appendChild(createIcon("fa-trash"));

  item.append(text, menuButton);

  item.addEventListener("click", (event) => {
    if (event.target.closest(".ai-history-menu")) {
      return;
    }

    setActiveConversation(conversation.id);
  });

  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      setActiveConversation(conversation.id);
    }
  });

  menuButton.addEventListener("click", (event) => {
    event.stopPropagation();

    if (window.confirm("Deseja remover esta conversa?")) {
      removeConversation(conversation.id);
    }
  });

  return item;
}

function createHistoryEmptyState() {
  const container = createElement("div", "ai-history-empty");

  container.append(
    createIcon("fa-comments"),
    createElement("p", "", "Seu histórico de conversas aparecerá aqui."),
  );

  return container;
}

/* =========================
   MENSAGENS
   ========================= */

function renderMessages() {
  const container = getChatMessagesContainer();

  if (!container) {
    return;
  }

  container.innerHTML = "";

  const conversation = getActiveConversation();

  if (!conversation || conversation.messages.length === 0) {
    container.appendChild(createWelcomeContent());

    return;
  }

  const fragment = document.createDocumentFragment();

  conversation.messages.forEach((message) => {
    fragment.appendChild(createMessageElement(message));
  });

  container.appendChild(fragment);

  if (aiState.generating) {
    container.appendChild(createTypingElement());
  }

  scrollMessagesToBottom(false);
}

function createMessageElement(message) {
  const isUser = message.role === "user";

  const messageElement = createElement(
    "article",
    ["ai-message", isUser ? "ai-message--user" : "ai-message--assistant"].join(
      " ",
    ),
  );

  messageElement.dataset.messageId = message.id;

  const avatar = createElement("div", "ai-message-avatar");

  avatar.appendChild(createIcon(isUser ? "fa-user" : "fa-robot"));

  const contentContainer = createElement("div", "ai-message-content");

  const bubble = createElement("div", "ai-message-bubble");

  appendFormattedMessage(bubble, message.content);

  if (message.attachment) {
    bubble.appendChild(createMessageAttachment(message.attachment));
  }

  const meta = createElement("div", "ai-message-meta");

  meta.appendChild(
    createElement("time", "", formatMessageTime(message.createdAt)),
  );

  if (!isUser) {
    const actions = createElement("div", "ai-message-actions");

    const copyButton = createElement("button", "ai-message-action");

    copyButton.type = "button";
    copyButton.setAttribute("aria-label", "Copiar resposta");

    copyButton.appendChild(createIcon("fa-copy"));

    copyButton.addEventListener("click", () => {
      copyMessageContent(message.content);
    });

    actions.appendChild(copyButton);
    meta.appendChild(actions);
  }

  contentContainer.append(bubble, meta);

  messageElement.append(avatar, contentContainer);

  return messageElement;
}

function appendFormattedMessage(container, content) {
  const lines = String(content || "").split("\n");

  let list = null;

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      list = null;

      const spacer = createElement("br");

      container.appendChild(spacer);

      return;
    }

    const isBullet = trimmedLine.startsWith("• ");

    const isNumbered = /^\d+\.\s/.test(trimmedLine);

    if (isBullet || isNumbered) {
      const listType = isNumbered ? "ol" : "ul";

      if (!list || list.tagName.toLowerCase() !== listType) {
        list = createElement(listType);
        container.appendChild(list);
      }

      const itemText = isBullet
        ? trimmedLine.slice(2)
        : trimmedLine.replace(/^\d+\.\s/, "");

      list.appendChild(createElement("li", "", itemText));

      return;
    }

    list = null;

    container.appendChild(createElement("p", "", trimmedLine));
  });
}

function createMessageAttachment(attachment) {
  const container = createElement("div", "ai-attachment-preview is-visible");

  const icon = createElement("div", "ai-attachment-icon");

  icon.appendChild(
    createIcon(getAttachmentIcon(attachment.type, attachment.name)),
  );

  const info = createElement("div", "ai-attachment-info");

  info.append(
    createElement("span", "ai-attachment-name", attachment.name),
    createElement(
      "span",
      "ai-attachment-size",
      formatFileSize(attachment.size),
    ),
  );

  container.append(icon, info);

  return container;
}

/* =========================
   CONTEÚDO INICIAL
   ========================= */

function createWelcomeContent() {
  const welcome = createElement("section", "ai-welcome");

  const icon = createElement("div", "ai-welcome-icon");

  icon.appendChild(createIcon("fa-robot"));

  welcome.append(
    icon,
    createElement("h2", "", "Como posso ajudar nos seus estudos?"),
    createElement(
      "p",
      "",
      "Faça uma pergunta, peça uma explicação ou escolha uma das sugestões abaixo.",
    ),
    createSuggestionsGrid(),
  );

  return welcome;
}

function createSuggestionsGrid() {
  const grid = createElement("div", "ai-suggestions");

  AI_SUGGESTIONS.forEach((suggestion) => {
    const button = createElement("button", "ai-suggestion-button");

    button.type = "button";
    button.dataset.aiSuggestion = suggestion.id;

    const icon = createElement("div", "ai-suggestion-icon");

    icon.appendChild(createIcon(suggestion.icon));

    const content = createElement("div", "ai-suggestion-content");

    content.append(
      createElement("span", "ai-suggestion-title", suggestion.title),
      createElement(
        "span",
        "ai-suggestion-description",
        suggestion.description,
      ),
    );

    button.append(icon, content);

    button.addEventListener("click", () => {
      applySuggestion(suggestion.id);
    });

    grid.appendChild(button);
  });

  return grid;
}

function applySuggestion(suggestionId) {
  const suggestion = AI_SUGGESTIONS.find((item) => item.id === suggestionId);

  if (!suggestion) {
    return;
  }

  const input = getChatInput();

  if (input) {
    input.value = suggestion.prompt;

    autoResizeInput(input);
    updateCharacterCount();
    updateChatControls();
    saveDraft(input.value);

    input.focus();
  }
}

/* =========================
   INDICADOR DE DIGITAÇÃO
   ========================= */

function createTypingElement() {
  const container = createElement("div", "ai-typing");

  const avatar = createElement("div", "ai-message-avatar");

  avatar.appendChild(createIcon("fa-robot"));

  const bubble = createElement("div", "ai-typing-bubble");

  for (let index = 0; index < 3; index += 1) {
    bubble.appendChild(createElement("span", "ai-typing-dot"));
  }

  container.append(avatar, bubble);

  return container;
}

function showTypingIndicator() {
  const container = getChatMessagesContainer();

  if (!container) {
    return;
  }

  select(".ai-typing", container)?.remove();

  container.appendChild(createTypingElement());

  scrollMessagesToBottom();
}

function hideTypingIndicator() {
  getChatMessagesContainer()?.querySelector(".ai-typing")?.remove();
}

/* =========================
   CABEÇALHO DO CHAT
   ========================= */

function updateChatHeader() {
  const conversation = getActiveConversation();

  selectAll("[data-ai-chat-title]").forEach((element) => {
    element.textContent = conversation?.title || "Assistente educacional";
  });

  selectAll("[data-ai-chat-subtitle]").forEach((element) => {
    const messageCount = conversation?.messages.length || 0;

    element.textContent =
      messageCount === 0
        ? "Pronto para ajudar"
        : `${messageCount} ${messageCount === 1 ? "mensagem" : "mensagens"}`;
  });
}

/* =========================
   CAMPO DE MENSAGEM
   ========================= */

function initChatForm() {
  const form = getChatForm();
  const input = getChatInput();

  if (!form || !input) {
    return;
  }

  if (form.dataset.aiInitialized === "true") {
    return;
  }

  form.dataset.aiInitialized = "true";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    await sendMessage(input.value);
  });

  input.addEventListener("input", () => {
    autoResizeInput(input);
    updateCharacterCount();
    updateChatControls();
    saveDraft(input.value);
  });

  input.addEventListener("keydown", async (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      await sendMessage(input.value);
    }
  });

  restoreDraft();
  autoResizeInput(input);
  updateCharacterCount();
}

function clearInput() {
  const input = getChatInput();

  if (!input) {
    return;
  }

  input.value = "";
  input.style.height = "";

  updateCharacterCount();
}

function autoResizeInput(input) {
  if (!input || !(input instanceof HTMLElement)) {
    return;
  }

  input.style.height = "auto";

  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
}

function updateCharacterCount() {
  const input = getChatInput();

  const characterCount = input?.value.length || 0;

  selectAll("[data-ai-character-count]").forEach((element) => {
    element.textContent = `${characterCount}/${AI_CONFIG.maximumMessageLength}`;

    element.classList.toggle(
      "is-limit",
      characterCount > AI_CONFIG.maximumMessageLength,
    );
  });
}

function updateChatControls() {
  const input = getChatInput();
  const sendButton = getSendButton();

  if (!sendButton) {
    return;
  }

  const hasContent =
    Boolean(input?.value.trim()) || Boolean(aiState.attachment);

  sendButton.disabled = aiState.generating || !hasContent;

  sendButton.classList.toggle("is-loading", aiState.generating);

  sendButton.setAttribute(
    "aria-label",
    aiState.generating ? "Gerando resposta" : "Enviar mensagem",
  );

  const icon = select("i", sendButton);

  if (icon) {
    icon.className = aiState.generating
      ? "fa-solid fa-spinner fa-spin"
      : "fa-solid fa-paper-plane";
  }
}

/* =========================
   RASCUNHO
   ========================= */

function saveDraft(content) {
  const normalizedContent = String(content || "");

  if (!normalizedContent.trim()) {
    clearDraft();
    return;
  }

  writeStorage(AI_CONFIG.draftKey, normalizedContent);
}

function restoreDraft() {
  const draft = readStorage(AI_CONFIG.draftKey, "");

  const input = getChatInput();

  if (input && typeof draft === "string") {
    input.value = draft;
  }
}

function clearDraft() {
  removeStorage(AI_CONFIG.draftKey);
}

/* =========================
   ARQUIVOS
   ========================= */

function initAttachmentControls() {
  const input = getAttachmentInput();

  selectAll(["[data-ai-attach]", ".ai-attach-button"].join(",")).forEach(
    (button) => {
      if (button.dataset.aiInitialized === "true") {
        return;
      }

      button.dataset.aiInitialized = "true";

      button.addEventListener("click", () => {
        input?.click();
      });
    },
  );

  if (input && input.dataset.aiInitialized !== "true") {
    input.dataset.aiInitialized = "true";

    input.addEventListener("change", () => {
      selectAttachment(input.files?.[0] || null);
    });
  }

  selectAll("[data-ai-attachment-remove]").forEach((button) => {
    if (button.dataset.aiInitialized === "true") {
      return;
    }

    button.dataset.aiInitialized = "true";

    button.addEventListener("click", clearAttachment);
  });
}

function validateAttachment(file) {
  if (!file) {
    return {
      valid: false,
      error: "Nenhum arquivo selecionado.",
    };
  }

  if (file.size > AI_CONFIG.maximumAttachmentSize) {
    return {
      valid: false,
      error: "O arquivo deve ter no máximo 10 MB.",
    };
  }

  const extension = getFileExtension(file.name);

  const acceptedExtensions = [
    "pdf",
    "txt",
    "doc",
    "docx",
    "jpg",
    "jpeg",
    "png",
  ];

  const validType =
    AI_CONFIG.acceptedFileTypes.includes(file.type) ||
    acceptedExtensions.includes(extension);

  if (!validType) {
    return {
      valid: false,
      error: "Formato de arquivo não permitido.",
    };
  }

  return {
    valid: true,
    error: null,
  };
}

function selectAttachment(file) {
  if (!file) {
    clearAttachment();
    return false;
  }

  const validation = validateAttachment(file);

  if (!validation.valid) {
    showMessage(validation.error, "error");

    clearAttachment();
    return false;
  }

  aiState.attachment = {
    name: file.name,
    size: file.size,
    type: file.type,
  };

  renderAttachmentPreview();
  updateChatControls();

  showMessage(`${file.name} foi anexado.`, "success");

  emitAIEvent("sesi:ai-attachment-selected", {
    attachment: {
      ...aiState.attachment,
    },
  });

  return true;
}

function clearAttachment() {
  aiState.attachment = null;

  const input = getAttachmentInput();

  if (input) {
    input.value = "";
  }

  renderAttachmentPreview();
  updateChatControls();
}

function renderAttachmentPreview() {
  const containers = selectAll(
    [
      "#ai-attachment-preview",
      ".ai-attachment-preview[data-ai-preview]",
      "[data-ai-attachment-preview]",
    ].join(","),
  );

  containers.forEach((container) => {
    container.innerHTML = "";

    if (!aiState.attachment) {
      container.classList.remove("is-visible");

      container.hidden = true;
      return;
    }

    container.hidden = false;

    container.classList.add("is-visible");

    const icon = createElement("div", "ai-attachment-icon");

    icon.appendChild(
      createIcon(
        getAttachmentIcon(aiState.attachment.type, aiState.attachment.name),
      ),
    );

    const info = createElement("div", "ai-attachment-info");

    info.append(
      createElement("span", "ai-attachment-name", aiState.attachment.name),
      createElement(
        "span",
        "ai-attachment-size",
        formatFileSize(aiState.attachment.size),
      ),
    );

    const removeButton = createElement("button", "ai-attachment-remove");

    removeButton.type = "button";
    removeButton.setAttribute("aria-label", "Remover arquivo");

    removeButton.appendChild(createIcon("fa-xmark"));

    removeButton.addEventListener("click", clearAttachment);

    container.append(icon, info, removeButton);
  });
}

function getAttachmentIcon(fileType, fileName) {
  const extension = getFileExtension(fileName);

  if (fileType === "application/pdf" || extension === "pdf") {
    return "fa-file-pdf";
  }

  if (
    fileType?.startsWith("image/") ||
    ["jpg", "jpeg", "png"].includes(extension)
  ) {
    return "fa-file-image";
  }

  if (["doc", "docx"].includes(extension)) {
    return "fa-file-word";
  }

  return "fa-file-lines";
}

function getFileExtension(fileName) {
  return String(fileName || "")
    .split(".")
    .pop()
    .toLowerCase();
}

function formatFileSize(bytes) {
  const size = Number(bytes);

  if (!Number.isFinite(size) || size <= 0) {
    return "0 KB";
  }

  const units = ["B", "KB", "MB", "GB"];

  const unitIndex = Math.min(
    Math.floor(Math.log(size) / Math.log(1024)),
    units.length - 1,
  );

  const value = size / 1024 ** unitIndex;

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/* =========================
   CÓPIA DA RESPOSTA
   ========================= */

async function copyMessageContent(content) {
  try {
    await navigator.clipboard.writeText(content);

    showMessage("Resposta copiada.", "success");

    return true;
  } catch (error) {
    console.warn("[SESI Connect] Não foi possível copiar a mensagem.", error);

    showMessage("Não foi possível copiar a resposta.", "error");

    return false;
  }
}

/* =========================
   FORMATAÇÃO DE HORÁRIO
   ========================= */

function formatMessageTime(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/* =========================
   ROLAGEM
   ========================= */

function scrollMessagesToBottom(smooth = true) {
  const container = getChatMessagesContainer();

  if (!container) {
    return;
  }

  window.requestAnimationFrame(() => {
    container.scrollTo({
      top: container.scrollHeight,
      behavior:
        smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "smooth"
          : "auto",
    });
  });
}

/* =========================
   HISTÓRICO MOBILE
   ========================= */

function getAISidebar() {
  return select([".ai-sidebar", "[data-ai-sidebar]"].join(","));
}

function openMobileHistory() {
  const sidebar = getAISidebar();

  if (!sidebar) {
    return;
  }

  sidebar.classList.add("is-open");

  aiState.mobileHistoryOpen = true;

  document.body.classList.add("ai-history-open");
}

function closeMobileHistory() {
  getAISidebar()?.classList.remove("is-open");

  aiState.mobileHistoryOpen = false;

  document.body.classList.remove("ai-history-open");
}

function toggleMobileHistory() {
  if (aiState.mobileHistoryOpen) {
    closeMobileHistory();
  } else {
    openMobileHistory();
  }
}

/* =========================
   EVENTOS DOS BOTÕES
   ========================= */

function initActionButtons() {
  selectAll(["[data-ai-new-chat]", ".ai-new-chat"].join(",")).forEach(
    (button) => {
      if (button.dataset.aiInitialized === "true") {
        return;
      }

      button.dataset.aiInitialized = "true";

      button.addEventListener("click", () => {
        createConversation();
        getChatInput()?.focus();
      });
    },
  );

  selectAll(["[data-ai-clear-history]", ".ai-clear-history"].join(",")).forEach(
    (button) => {
      if (button.dataset.aiInitialized === "true") {
        return;
      }

      button.dataset.aiInitialized = "true";

      button.addEventListener("click", () => {
        clearConversationHistory();
      });
    },
  );

  selectAll(
    ["[data-ai-history-toggle]", ".ai-history-mobile-button"].join(","),
  ).forEach((button) => {
    if (button.dataset.aiInitialized === "true") {
      return;
    }

    button.dataset.aiInitialized = "true";

    button.addEventListener("click", toggleMobileHistory);
  });

  selectAll("[data-ai-close-history]").forEach((button) => {
    if (button.dataset.aiInitialized === "true") {
      return;
    }

    button.dataset.aiInitialized = "true";

    button.addEventListener("click", closeMobileHistory);
  });
}

/* =========================
   TECLADO
   ========================= */

function initKeyboardControls() {
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && aiState.mobileHistoryOpen) {
      closeMobileHistory();
    }

    if (event.ctrlKey && event.key.toLowerCase() === "k") {
      event.preventDefault();

      getChatInput()?.focus();
    }

    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "n") {
      event.preventDefault();

      createConversation();
      getChatInput()?.focus();
    }
  });
}

/* =========================
   SINCRONIZAÇÃO ENTRE ABAS
   ========================= */

function initStorageSynchronization() {
  window.addEventListener("storage", (event) => {
    if (
      ![AI_CONFIG.conversationsKey, AI_CONFIG.activeConversationKey].includes(
        event.key,
      )
    ) {
      return;
    }

    loadConversations();
    renderAI();
  });
}

/* =========================
   OBSERVADOR DO DOM
   ========================= */

function initAIObserver() {
  const observer = new MutationObserver((mutations) => {
    const containsNewNodes = mutations.some(
      (mutation) => mutation.addedNodes.length > 0,
    );

    if (!containsNewNodes) {
      return;
    }

    initActionButtons();
    initAttachmentControls();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/* =========================
   MENSAGENS AUXILIARES
   ========================= */

function showMessage(message, type = "info") {
  if (
    window.SESIConnect &&
    typeof window.SESIConnect.showToast === "function"
  ) {
    window.SESIConnect.showToast(message, type);

    return;
  }

  if (
    window.SESINotifications &&
    typeof window.SESINotifications.showToast === "function"
  ) {
    window.SESINotifications.showToast({
      id: createId("toast"),
      title:
        type === "success"
          ? "Sucesso"
          : type === "error"
            ? "Erro"
            : type === "warning"
              ? "Atenção"
              : "Informação",
      message,
      type,
      read: true,
      createdAt: new Date().toISOString(),
    });

    return;
  }

  console[type === "error" ? "error" : "info"](`[SESI Connect] ${message}`);
}

/* =========================
   ATUALIZAÇÃO
   ========================= */

function refreshAI() {
  loadConversations();

  initChatForm();
  initActionButtons();
  initAttachmentControls();

  renderAI();
}

/* =========================
   INICIALIZAÇÃO
   ========================= */

function initAI() {
  if (aiState.initialized) {
    refreshAI();
    return;
  }

  const isAIPage =
    document.body?.dataset.page === "ai" ||
    Boolean(
      select(
        [".ai-page", ".ai-layout", "[data-ai-page]", "[data-ai-messages]"].join(
          ",",
        ),
      ),
    );

  if (!isAIPage) {
    return;
  }

  aiState.initialized = true;

  loadConversations();

  initChatForm();
  initActionButtons();
  initAttachmentControls();
  initKeyboardControls();
  initStorageSynchronization();
  initAIObserver();

  renderAI();

  emitAIEvent("sesi:ai-ready", {
    conversations: getConversations(),
    activeConversation: getActiveConversation()
      ? cloneData(getActiveConversation())
      : null,
  });
}

/* =========================
   API GLOBAL
   ========================= */

const SESIAI = Object.freeze({
  config: AI_CONFIG,
  suggestions: AI_SUGGESTIONS,

  init: initAI,
  refresh: refreshAI,
  render: renderAI,

  getConversations,
  getConversationById,
  getActiveConversation,
  getMessages: getConversationMessages,

  createConversation,
  setActiveConversation,
  removeConversation,
  clearHistory: clearConversationHistory,

  sendMessage,
  generateResponse: generateEducationalResponse,

  selectAttachment,
  clearAttachment,

  openHistory: openMobileHistory,
  closeHistory: closeMobileHistory,
  toggleHistory: toggleMobileHistory,
});

window.SESIAI = SESIAI;

/* =========================
   COMPATIBILIDADE
   ========================= */

window.sendChatMessage = function sendChatMessage() {
  const input = getChatInput();

  return sendMessage(input?.value || "");
};

window.newAIConversation = createConversation;

window.clearAIHistory = clearConversationHistory;

/* =========================
   EXECUÇÃO AUTOMÁTICA
   ========================= */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAI, {
    once: true,
  });
} else {
  initAI();
}

/* =========================
   EXPORTAÇÕES
   ========================= */

export {
  AI_CONFIG,
  AI_SUGGESTIONS,
  SESIAI,
  initAI,
  refreshAI,
  renderAI,
  getConversations,
  getConversationById,
  getActiveConversation,
  getConversationMessages,
  createConversation,
  setActiveConversation,
  removeConversation,
  clearConversationHistory,
  sendMessage,
  generateEducationalResponse,
  selectAttachment,
  clearAttachment,
  openMobileHistory,
  closeMobileHistory,
  toggleMobileHistory,
};
