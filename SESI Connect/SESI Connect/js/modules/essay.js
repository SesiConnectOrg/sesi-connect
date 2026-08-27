/* =========================================================
   SESI CONNECT
   Editor de redação, rascunhos e entregas
   ========================================================= */

"use strict";

/* =========================
   CONFIGURAÇÕES
   ========================= */

const ESSAY_CONFIG = Object.freeze({
  draftsKey: "sesi-connect-essay-drafts",
  selectedEssayKey: "sesi-connect-selected-essay",
  activitiesKey: "sesi-connect-activities",
  aiDraftKey: "sesi-connect-ai-draft",

  automaticSaveDelay: 700,
  maximumRevisions: 10,

  defaultMinimumWords: 160,
  defaultRecommendedWords: 240,
  defaultMaximumWords: 4000,

  defaultMinimumParagraphs: 4,
});

/* =========================
   REDAÇÃO PADRÃO
   ========================= */

const DEFAULT_ESSAY = Object.freeze({
  id: "activity-essay-001",
  activityId: "activity-essay-001",

  title: "Redação dissertativo-argumentativa",

  theme: "Os desafios para a inclusão social no Brasil",

  description:
    "Produza um texto dissertativo-argumentativo, no modelo ENEM, apresentando uma proposta de intervenção que respeite os direitos humanos.",

  subject: "Língua Portuguesa",

  teacher: "Profa. Renata Souza",

  deadline: createFutureDate(3, 23, 59),

  minimumWords: ESSAY_CONFIG.defaultMinimumWords,

  recommendedWords: ESSAY_CONFIG.defaultRecommendedWords,

  maximumWords: ESSAY_CONFIG.defaultMaximumWords,

  minimumParagraphs: ESSAY_CONFIG.defaultMinimumParagraphs,
});

/* =========================
   MODELOS DE PARÁGRAFO
   ========================= */

const ESSAY_TEMPLATES = Object.freeze({
  introduction: [
    "[Contextualização do tema]",
    "",
    "Nesse contexto, observa-se que [apresente o problema central]. Assim, é necessário analisar [argumento 1] e [argumento 2].",
  ].join("\n"),

  development1: [
    "[Desenvolvimento 1]",
    "",
    "Em primeiro lugar, [apresente o primeiro argumento]. Isso ocorre porque [explique a causa]. Como consequência, [mostre o impacto do problema].",
  ].join("\n"),

  development2: [
    "[Desenvolvimento 2]",
    "",
    "Além disso, [apresente o segundo argumento]. Segundo [repertório ou referência], [relacione o repertório ao tema]. Dessa forma, [explique a consequência].",
  ].join("\n"),

  conclusion: [
    "[Conclusão]",
    "",
    "Portanto, cabe a [agente] promover [ação], por meio de [meio ou modo], com o objetivo de [finalidade]. Além disso, [detalhamento da proposta].",
  ].join("\n"),
});

/* =========================
   ESTADO
   ========================= */

const essayState = {
  initialized: false,
  essay: null,
  draft: null,
  autosaveTimer: null,
  saving: false,
  lastSavedContent: "",
  submitted: false,
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

function emitEssayEvent(name, detail = {}) {
  document.dispatchEvent(
    new CustomEvent(name, {
      bubbles: true,
      detail,
    }),
  );
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function createFutureDate(dayOffset, hour = 23, minute = 59) {
  const date = new Date();

  date.setDate(date.getDate() + dayOffset);

  date.setHours(hour, minute, 0, 0);

  return date.toISOString();
}

function createId(prefix = "essay") {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return [prefix, Date.now(), Math.random().toString(16).slice(2)].join("-");
}

function isValidDate(value) {
  return Boolean(value && !Number.isNaN(new Date(value).getTime()));
}

/* =========================
   ARMAZENAMENTO
   ========================= */

function readStorage(storage, key, fallback = null) {
  try {
    const value = storage.getItem(key);

    if (value === null) {
      return fallback;
    }

    return JSON.parse(value);
  } catch (error) {
    console.warn(`[SESI Connect] Não foi possível ler "${key}".`, error);

    return fallback;
  }
}

function writeStorage(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));

    return true;
  } catch (error) {
    console.warn(`[SESI Connect] Não foi possível salvar "${key}".`, error);

    return false;
  }
}

/* =========================
   NORMALIZAÇÃO DA REDAÇÃO
   ========================= */

function normalizeEssay(essay = {}) {
  const activityId = String(
    essay.activityId || essay.id || DEFAULT_ESSAY.activityId,
  );

  return {
    id: String(essay.id || activityId),

    activityId,

    title: String(essay.title || DEFAULT_ESSAY.title).trim(),

    theme: String(
      essay.theme || essay.description || DEFAULT_ESSAY.theme,
    ).trim(),

    description: String(essay.description || DEFAULT_ESSAY.description).trim(),

    subject: String(essay.subject || DEFAULT_ESSAY.subject).trim(),

    teacher: String(essay.teacher || DEFAULT_ESSAY.teacher).trim(),

    deadline: isValidDate(essay.deadline)
      ? essay.deadline
      : DEFAULT_ESSAY.deadline,

    minimumWords: normalizePositiveNumber(
      essay.minimumWords,
      DEFAULT_ESSAY.minimumWords,
    ),

    recommendedWords: normalizePositiveNumber(
      essay.recommendedWords,
      DEFAULT_ESSAY.recommendedWords,
    ),

    maximumWords: normalizePositiveNumber(
      essay.maximumWords,
      DEFAULT_ESSAY.maximumWords,
    ),

    minimumParagraphs: normalizePositiveNumber(
      essay.minimumParagraphs,
      DEFAULT_ESSAY.minimumParagraphs,
    ),
  };
}

function normalizePositiveNumber(value, fallback) {
  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? number : fallback;
}

/* =========================
   NORMALIZAÇÃO DO RASCUNHO
   ========================= */

function normalizeDraft(draft = {}, essay) {
  return {
    essayId: String(draft.essayId || essay.id),

    activityId: String(draft.activityId || essay.activityId),

    content: String(draft.content || ""),

    status: draft.status === "submitted" ? "submitted" : "draft",

    createdAt: isValidDate(draft.createdAt)
      ? draft.createdAt
      : new Date().toISOString(),

    updatedAt: isValidDate(draft.updatedAt)
      ? draft.updatedAt
      : new Date().toISOString(),

    submittedAt: isValidDate(draft.submittedAt) ? draft.submittedAt : null,

    revisions: Array.isArray(draft.revisions)
      ? draft.revisions
          .map(normalizeRevision)
          .slice(0, ESSAY_CONFIG.maximumRevisions)
      : [],
  };
}

function normalizeRevision(revision = {}) {
  return {
    id: String(revision.id || createId("revision")),

    content: String(revision.content || ""),

    savedAt: isValidDate(revision.savedAt)
      ? revision.savedAt
      : new Date().toISOString(),

    wordCount: Number.isFinite(Number(revision.wordCount))
      ? Number(revision.wordCount)
      : countWords(revision.content),
  };
}

/* =========================
   IDENTIFICAÇÃO DA REDAÇÃO
   ========================= */

function loadSelectedEssay() {
  const selectedEssay = readStorage(
    sessionStorage,
    ESSAY_CONFIG.selectedEssayKey,
  );

  essayState.essay = normalizeEssay(selectedEssay || DEFAULT_ESSAY);

  return cloneData(essayState.essay);
}

/* =========================
   RASCUNHOS
   ========================= */

function getAllDrafts() {
  const drafts = readStorage(localStorage, ESSAY_CONFIG.draftsKey, {});

  return drafts && typeof drafts === "object" && !Array.isArray(drafts)
    ? drafts
    : {};
}

function getDraftByEssayId(essayId) {
  const drafts = getAllDrafts();

  return drafts[essayId] || null;
}

function loadDraft() {
  const essay = essayState.essay || loadSelectedEssay();

  const storedDraft = getDraftByEssayId(essay.id);

  essayState.draft = normalizeDraft(storedDraft, essay);

  essayState.submitted = essayState.draft.status === "submitted";

  essayState.lastSavedContent = essayState.draft.content;

  return cloneData(essayState.draft);
}

function persistDraft(draft) {
  const drafts = getAllDrafts();

  drafts[draft.essayId] = draft;

  return writeStorage(localStorage, ESSAY_CONFIG.draftsKey, drafts);
}

/* =========================
   ELEMENTO DO EDITOR
   ========================= */

function getEssayEditor() {
  return (
    document.getElementById("essay-editor") ||
    document.getElementById("essay-textarea") ||
    select(
      [
        "[data-essay-editor]",
        ".essay-editor-textarea",
        ".essay-textarea",
        "textarea[name='essay']",
      ].join(","),
    )
  );
}

function getEditorContent() {
  const editor = getEssayEditor();

  if (!editor) {
    return "";
  }

  if (
    editor instanceof HTMLTextAreaElement ||
    editor instanceof HTMLInputElement
  ) {
    return editor.value;
  }

  return editor.textContent || "";
}

function setEditorContent(content, options = {}) {
  const { focus = false, placeCursorAtEnd = true } = options;

  const editor = getEssayEditor();

  if (!editor) {
    return;
  }

  if (
    editor instanceof HTMLTextAreaElement ||
    editor instanceof HTMLInputElement
  ) {
    editor.value = content;

    if (focus && placeCursorAtEnd) {
      editor.focus();

      editor.setSelectionRange(content.length, content.length);
    }
  } else {
    editor.textContent = content;

    if (focus) {
      editor.focus();
    }
  }

  autoResizeEditor();
  updateEssayStatistics();
}

/* =========================
   CONTAGEM
   ========================= */

function countWords(content) {
  const normalized = String(content || "").trim();

  if (!normalized) {
    return 0;
  }

  return normalized.split(/\s+/).filter(Boolean).length;
}

function countCharacters(content) {
  return String(content || "").length;
}

function countCharactersWithoutSpaces(content) {
  return String(content || "").replace(/\s/g, "").length;
}

function countParagraphs(content) {
  const normalized = String(content || "").trim();

  if (!normalized) {
    return 0;
  }

  return normalized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean).length;
}

function countLines(content) {
  const normalized = String(content || "");

  if (!normalized.trim()) {
    return 0;
  }

  return normalized.split("\n").length;
}

function calculateReadingTime(wordCount) {
  if (wordCount === 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(wordCount / 200));
}

function getEssayStatistics(content = getEditorContent()) {
  const words = countWords(content);

  return {
    words,
    characters: countCharacters(content),

    charactersWithoutSpaces: countCharactersWithoutSpaces(content),

    paragraphs: countParagraphs(content),

    lines: countLines(content),

    readingTime: calculateReadingTime(words),
  };
}

/* =========================
   PROGRESSO
   ========================= */

function calculateEssayProgress(statistics) {
  const recommendedWords =
    essayState.essay?.recommendedWords || ESSAY_CONFIG.defaultRecommendedWords;

  const minimumParagraphs =
    essayState.essay?.minimumParagraphs ||
    ESSAY_CONFIG.defaultMinimumParagraphs;

  const wordProgress = Math.min(
    100,
    (statistics.words / recommendedWords) * 100,
  );

  const paragraphProgress = Math.min(
    100,
    (statistics.paragraphs / minimumParagraphs) * 100,
  );

  return Math.round(wordProgress * 0.75 + paragraphProgress * 0.25);
}

/* =========================
   ATUALIZAÇÃO DAS ESTATÍSTICAS
   ========================= */

function updateEssayStatistics() {
  const statistics = getEssayStatistics();

  const progress = calculateEssayProgress(statistics);

  const values = {
    words: String(statistics.words),

    characters: String(statistics.characters),

    charactersWithoutSpaces: String(statistics.charactersWithoutSpaces),

    paragraphs: String(statistics.paragraphs),

    lines: String(statistics.lines),

    readingTime: `${statistics.readingTime} min`,
  };

  Object.entries(values).forEach(([name, value]) => {
    selectAll(`[data-essay-${toKebabCase(name)}]`).forEach((element) => {
      element.textContent = value;
    });
  });

  selectAll("[data-essay-word-count]").forEach((element) => {
    element.textContent = String(statistics.words);
  });

  selectAll("[data-essay-character-count]").forEach((element) => {
    element.textContent = String(statistics.characters);
  });

  selectAll("[data-essay-paragraph-count]").forEach((element) => {
    element.textContent = String(statistics.paragraphs);
  });

  selectAll("[data-essay-line-count]").forEach((element) => {
    element.textContent = String(statistics.lines);
  });

  selectAll("[data-essay-progress-value]").forEach((element) => {
    element.textContent = `${progress}%`;
  });

  selectAll("[data-essay-progress]").forEach((element) => {
    element.style.width = `${progress}%`;

    element.style.setProperty("--essay-progress", `${progress}%`);

    element.setAttribute("aria-valuenow", String(progress));
  });

  updateRecommendationStatus(statistics);

  emitEssayEvent("sesi:essay-statistics", {
    statistics,
    progress,
  });

  return {
    statistics,
    progress,
  };
}

function toKebabCase(value) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

/* =========================
   RECOMENDAÇÕES
   ========================= */

function updateRecommendationStatus(statistics) {
  const essay = essayState.essay;

  if (!essay) {
    return;
  }

  let status = "progress";
  let message = "Continue desenvolvendo sua redação.";

  if (statistics.words === 0) {
    status = "empty";
    message = "Comece escrevendo a introdução.";
  } else if (statistics.words < essay.minimumWords) {
    status = "warning";
    message = `Escreva pelo menos ${essay.minimumWords} palavras antes de enviar.`;
  } else if (statistics.paragraphs < essay.minimumParagraphs) {
    status = "warning";
    message = `A estrutura recomendada possui ao menos ${essay.minimumParagraphs} parágrafos.`;
  } else if (statistics.words > essay.maximumWords) {
    status = "error";
    message = `O limite de ${essay.maximumWords} palavras foi ultrapassado.`;
  } else {
    status = "success";
    message = "Sua redação possui uma extensão adequada para envio.";
  }

  selectAll("[data-essay-recommendation]").forEach((element) => {
    element.textContent = message;

    element.dataset.status = status;

    element.classList.remove(
      "is-empty",
      "is-progress",
      "is-warning",
      "is-error",
      "is-success",
    );

    element.classList.add(`is-${status}`);
  });
}

/* =========================
   INFORMAÇÕES DA PROPOSTA
   ========================= */

function renderEssayInformation() {
  const essay = essayState.essay;

  if (!essay) {
    return;
  }

  const values = {
    title: essay.title,
    theme: essay.theme,
    description: essay.description,
    subject: essay.subject,
    teacher: essay.teacher,
    deadline: formatDateTime(essay.deadline),
    minimumWords: String(essay.minimumWords),
    recommendedWords: String(essay.recommendedWords),
    maximumWords: String(essay.maximumWords),
    minimumParagraphs: String(essay.minimumParagraphs),
  };

  Object.entries(values).forEach(([field, value]) => {
    selectAll(`[data-essay-info="${field}"]`).forEach((element) => {
      element.textContent = value;
    });
  });

  selectAll("[data-essay-title]").forEach((element) => {
    element.textContent = essay.title;
  });

  selectAll("[data-essay-theme]").forEach((element) => {
    element.textContent = essay.theme;
  });

  selectAll("[data-essay-description]").forEach((element) => {
    element.textContent = essay.description;
  });

  selectAll("[data-essay-deadline]").forEach((element) => {
    element.textContent = formatDateTime(essay.deadline);
  });
}

/* =========================
   FORMATAÇÃO DE DATAS
   ========================= */

function formatDateTime(dateValue) {
  if (!isValidDate(dateValue)) {
    return "Prazo não informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function formatTime(dateValue) {
  if (!isValidDate(dateValue)) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

/* =========================
   SALVAMENTO
   ========================= */

function scheduleAutomaticSave() {
  window.clearTimeout(essayState.autosaveTimer);

  setSaveStatus("pending", "Alterações não salvas");

  essayState.autosaveTimer = window.setTimeout(() => {
    saveDraft({
      manual: false,
      createRevision: false,
      notify: false,
    });
  }, ESSAY_CONFIG.automaticSaveDelay);
}

function saveDraft(options = {}) {
  const { manual = true, createRevision = manual, notify = manual } = options;

  if (essayState.saving || !essayState.essay) {
    return false;
  }

  essayState.saving = true;

  const content = getEditorContent();

  const now = new Date().toISOString();

  const existingDraft =
    essayState.draft || normalizeDraft({}, essayState.essay);

  const updatedDraft = {
    ...existingDraft,
    content,
    updatedAt: now,
    status: existingDraft.status === "submitted" ? "submitted" : "draft",
  };

  if (
    createRevision &&
    content.trim() &&
    content !== essayState.lastSavedContent
  ) {
    const revision = {
      id: createId("revision"),
      content,
      savedAt: now,
      wordCount: countWords(content),
    };

    updatedDraft.revisions = [revision, ...updatedDraft.revisions].slice(
      0,
      ESSAY_CONFIG.maximumRevisions,
    );
  }

  const saved = persistDraft(updatedDraft);

  essayState.saving = false;

  if (!saved) {
    setSaveStatus("error", "Erro ao salvar");

    if (notify) {
      showMessage("Não foi possível salvar a redação.", "error");
    }

    return false;
  }

  essayState.draft = updatedDraft;

  essayState.lastSavedContent = content;

  setSaveStatus("saved", `Salvo às ${formatTime(now)}`);

  renderRevisions();

  if (notify) {
    showMessage("Rascunho salvo.", "success");
  }

  emitEssayEvent("sesi:essay-saved", {
    draft: cloneData(updatedDraft),
    manual,
  });

  return true;
}

function setSaveStatus(status, message) {
  selectAll("[data-essay-save-status]").forEach((element) => {
    element.dataset.status = status;

    element.classList.remove("is-pending", "is-saving", "is-saved", "is-error");

    element.classList.add(`is-${status}`);

    const textElement = select("[data-save-status-text]", element);

    if (textElement) {
      textElement.textContent = message;
    } else {
      element.textContent = message;
    }
  });
}

/* =========================
   HISTÓRICO DE VERSÕES
   ========================= */

function renderRevisions() {
  const containers = selectAll(
    ["[data-essay-revisions]", ".essay-revisions-list"].join(","),
  );

  if (containers.length === 0) {
    return;
  }

  const revisions = essayState.draft?.revisions || [];

  containers.forEach((container) => {
    container.innerHTML = "";

    if (revisions.length === 0) {
      container.appendChild(
        createElement(
          "p",
          "essay-revisions-empty",
          "Nenhuma versão salva manualmente.",
        ),
      );

      return;
    }

    const fragment = document.createDocumentFragment();

    revisions.forEach((revision) => {
      fragment.appendChild(createRevisionElement(revision));
    });

    container.appendChild(fragment);
  });
}

function createRevisionElement(revision) {
  const item = createElement("article", "essay-revision-item");

  const content = createElement("div", "essay-revision-content");

  content.append(
    createElement("strong", "", formatDateTime(revision.savedAt)),

    createElement("span", "", `${revision.wordCount} palavras`),
  );

  const button = createElement("button", "essay-revision-restore");

  button.type = "button";

  button.append(
    createIcon("fa-clock-rotate-left"),
    document.createTextNode("Restaurar"),
  );

  button.addEventListener("click", () => {
    restoreRevision(revision.id);
  });

  item.append(content, button);

  return item;
}

function restoreRevision(revisionId) {
  const revision = essayState.draft?.revisions?.find(
    (item) => item.id === revisionId,
  );

  if (!revision) {
    showMessage("Versão não encontrada.", "error");

    return false;
  }

  if (
    getEditorContent().trim() &&
    !window.confirm("Deseja substituir o texto atual por esta versão?")
  ) {
    return false;
  }

  setEditorContent(revision.content, {
    focus: true,
  });

  scheduleAutomaticSave();

  showMessage("Versão restaurada.", "success");

  emitEssayEvent("sesi:essay-revision-restored", {
    revision: cloneData(revision),
  });

  return true;
}

/* =========================
   MODELOS DE TEXTO
   ========================= */

function insertTemplate(templateName) {
  const template = ESSAY_TEMPLATES[templateName];

  if (!template) {
    return false;
  }

  const editor = getEssayEditor();

  if (!editor) {
    return false;
  }

  if (
    editor instanceof HTMLTextAreaElement ||
    editor instanceof HTMLInputElement
  ) {
    const start = editor.selectionStart ?? editor.value.length;

    const end = editor.selectionEnd ?? editor.value.length;

    const before = editor.value.slice(0, start);

    const after = editor.value.slice(end);

    const prefix = before && !before.endsWith("\n\n") ? "\n\n" : "";

    const suffix = after && !after.startsWith("\n") ? "\n\n" : "";

    const insertedContent = `${prefix}${template}${suffix}`;

    editor.value = before + insertedContent + after;

    const cursorPosition = start + insertedContent.length;

    editor.focus();

    editor.setSelectionRange(cursorPosition, cursorPosition);
  } else {
    const currentContent = editor.textContent || "";

    editor.textContent = currentContent
      ? `${currentContent}\n\n${template}`
      : template;

    editor.focus();
  }

  autoResizeEditor();
  updateEssayStatistics();
  scheduleAutomaticSave();

  emitEssayEvent("sesi:essay-template-inserted", {
    template: templateName,
  });

  return true;
}

/* =========================
   LIMPEZA
   ========================= */

function clearEssay(options = {}) {
  const { confirm = true } = options;

  const content = getEditorContent();

  if (!content.trim()) {
    showMessage("O editor já está vazio.", "info");

    return false;
  }

  if (confirm && !window.confirm("Deseja apagar todo o texto da redação?")) {
    return false;
  }

  setEditorContent("", {
    focus: true,
  });

  scheduleAutomaticSave();

  showMessage("Texto removido.", "success");

  emitEssayEvent("sesi:essay-cleared");

  return true;
}

/* =========================
   VALIDAÇÃO PARA ENVIO
   ========================= */

function validateEssayForSubmission() {
  const content = getEditorContent();

  const statistics = getEssayStatistics(content);

  const essay = essayState.essay;

  const errors = [];
  const warnings = [];

  if (!content.trim()) {
    errors.push("A redação está vazia.");
  }

  if (statistics.words < essay.minimumWords) {
    errors.push(
      `A redação precisa ter pelo menos ${essay.minimumWords} palavras.`,
    );
  }

  if (statistics.words > essay.maximumWords) {
    errors.push(
      `A redação ultrapassou o limite de ${essay.maximumWords} palavras.`,
    );
  }

  if (statistics.paragraphs < essay.minimumParagraphs) {
    warnings.push(
      `A estrutura recomendada possui pelo menos ${essay.minimumParagraphs} parágrafos.`,
    );
  }

  if (new Date(essay.deadline).getTime() < Date.now()) {
    warnings.push("O prazo original desta atividade já foi encerrado.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    content,
    statistics,
  };
}

/* =========================
   ENVIO DA REDAÇÃO
   ========================= */

async function submitEssay(button = null) {
  if (essayState.submitted) {
    showMessage("Esta redação já foi enviada.", "info");

    return false;
  }

  const validation = validateEssayForSubmission();

  if (!validation.valid) {
    showValidationMessages(validation.errors, "error");

    return false;
  }

  if (validation.warnings.length > 0) {
    const warningMessage = [
      ...validation.warnings,
      "",
      "Deseja enviar mesmo assim?",
    ].join("\n");

    if (!window.confirm(warningMessage)) {
      return false;
    }
  } else if (
    !window.confirm(
      "Deseja enviar esta redação? Após o envio, o texto será bloqueado para edição.",
    )
  ) {
    return false;
  }

  setButtonLoading(button, true, "Enviando...");

  await wait(650);

  const now = new Date().toISOString();

  const updatedDraft = {
    ...essayState.draft,
    content: validation.content,
    status: "submitted",
    updatedAt: now,
    submittedAt: now,
  };

  const saved = persistDraft(updatedDraft);

  if (!saved) {
    setButtonLoading(button, false);

    showMessage("Não foi possível enviar a redação.", "error");

    return false;
  }

  essayState.draft = updatedDraft;

  essayState.submitted = true;

  essayState.lastSavedContent = validation.content;

  updateRelatedActivity(now);
  applySubmittedState();

  setButtonLoading(button, false);

  setSaveStatus("saved", `Enviado às ${formatTime(now)}`);

  showMessage("Redação enviada com sucesso.", "success");

  createSubmissionNotification();

  emitEssayEvent("sesi:essay-submitted", {
    essay: cloneData(essayState.essay),
    draft: cloneData(updatedDraft),
    statistics: validation.statistics,
  });

  return true;
}

/* =========================
   ATIVIDADE RELACIONADA
   ========================= */

function updateRelatedActivity(submittedAt) {
  const activityId = essayState.essay.activityId;

  if (
    window.SESIActivities &&
    typeof window.SESIActivities.update === "function"
  ) {
    window.SESIActivities.update(activityId, {
      status: "completed",
      progress: 100,
      submittedAt,
    });

    return;
  }

  const activities = readStorage(localStorage, ESSAY_CONFIG.activitiesKey, []);

  if (!Array.isArray(activities)) {
    return;
  }

  const activityIndex = activities.findIndex(
    (activity) => activity.id === activityId,
  );

  if (activityIndex === -1) {
    return;
  }

  activities[activityIndex] = {
    ...activities[activityIndex],
    status: "completed",
    progress: 100,
    submittedAt,
  };

  writeStorage(localStorage, ESSAY_CONFIG.activitiesKey, activities);
}

/* =========================
   ESTADO DE ENVIADA
   ========================= */

function applySubmittedState() {
  const editor = getEssayEditor();

  const submitted = essayState.submitted;

  if (editor) {
    if (
      editor instanceof HTMLTextAreaElement ||
      editor instanceof HTMLInputElement
    ) {
      editor.readOnly = submitted;
    } else {
      editor.contentEditable = submitted ? "false" : "true";
    }

    editor.classList.toggle("is-submitted", submitted);
  }

  document.body.classList.toggle("essay-submitted", submitted);

  selectAll(
    [
      "[data-essay-submit]",
      "[data-essay-save]",
      "[data-essay-clear]",
      "[data-essay-template]",
    ].join(","),
  ).forEach((element) => {
    element.disabled = submitted;
  });

  selectAll("[data-essay-submitted-message]").forEach((element) => {
    element.hidden = !submitted;

    element.classList.toggle("is-visible", submitted);
  });

  selectAll("[data-essay-submitted-at]").forEach((element) => {
    element.textContent = essayState.draft?.submittedAt
      ? formatDateTime(essayState.draft.submittedAt)
      : "";
  });
}

function enableSubmittedEditing() {
  if (!essayState.submitted) {
    return;
  }

  if (
    !window.confirm(
      "Deseja reabrir a redação para edição? O status voltará para rascunho.",
    )
  ) {
    return;
  }

  essayState.submitted = false;

  essayState.draft = {
    ...essayState.draft,
    status: "draft",
    submittedAt: null,
    updatedAt: new Date().toISOString(),
  };

  persistDraft(essayState.draft);

  applySubmittedState();

  showMessage("Redação reaberta para edição.", "success");

  getEssayEditor()?.focus();
}

/* =========================
   NOTIFICAÇÃO DO ENVIO
   ========================= */

function createSubmissionNotification() {
  if (
    !window.SESINotifications ||
    typeof window.SESINotifications.add !== "function"
  ) {
    return;
  }

  window.SESINotifications.add({
    type: "success",
    title: "Redação enviada",
    message: `A redação “${essayState.essay.title}” foi entregue com sucesso.`,
    route: "activities",
    metadata: {
      essayId: essayState.essay.id,
      activityId: essayState.essay.activityId,
    },
  });
}

/* =========================
   MENSAGENS DE VALIDAÇÃO
   ========================= */

function showValidationMessages(messages, type = "error") {
  if (!Array.isArray(messages) || messages.length === 0) {
    return;
  }

  showMessage(messages.join(" "), type);

  const container = select("[data-essay-validation]");

  if (!container) {
    return;
  }

  container.innerHTML = "";
  container.hidden = false;

  const list = createElement(
    "ul",
    `essay-validation essay-validation--${type}`,
  );

  messages.forEach((message) => {
    list.appendChild(createElement("li", "", message));
  });

  container.appendChild(list);
}

/* =========================
   EXPORTAÇÃO
   ========================= */

function downloadEssay() {
  const content = getEditorContent();

  if (!content.trim()) {
    showMessage("Não há texto para baixar.", "warning");

    return false;
  }

  const essay = essayState.essay;

  const fileContent = [
    essay.title,
    "",
    `Tema: ${essay.theme}`,
    `Disciplina: ${essay.subject}`,
    `Professor(a): ${essay.teacher}`,
    "",
    "----------------------------------------",
    "",
    content,
  ].join("\n");

  const blob = new Blob([fileContent], {
    type: "text/plain;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = `${sanitizeFileName(essay.title)}.txt`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  showMessage("Redação baixada.", "success");

  emitEssayEvent("sesi:essay-downloaded");

  return true;
}

function sanitizeFileName(value) {
  return String(value || "redacao")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

/* =========================
   CÓPIA
   ========================= */

async function copyEssay() {
  const content = getEditorContent();

  if (!content.trim()) {
    showMessage("Não há texto para copiar.", "warning");

    return false;
  }

  try {
    await navigator.clipboard.writeText(content);

    showMessage("Redação copiada.", "success");

    return true;
  } catch (error) {
    console.warn("[SESI Connect] Não foi possível copiar a redação.", error);

    showMessage("Não foi possível copiar o texto.", "error");

    return false;
  }
}

/* =========================
   AJUDA COM IA
   ========================= */

function openAIHelp() {
  const content = getEditorContent();

  const prompt = content.trim()
    ? [
        `Estou escrevendo uma redação sobre: ${essayState.essay.theme}`,
        "",
        "Analise o texto abaixo e apresente sugestões de melhoria na argumentação, organização e clareza. Não reescreva a redação inteira.",
        "",
        content,
      ].join("\n")
    : [
        `Ajude-me a organizar uma redação sobre: ${essayState.essay.theme}`,
        "",
        "Crie apenas uma estrutura com introdução, dois argumentos e proposta de intervenção.",
      ].join("\n");

  writeStorage(localStorage, ESSAY_CONFIG.aiDraftKey, prompt);

  navigateTo("ai");
}

/* =========================
   REDIMENSIONAMENTO
   ========================= */

function autoResizeEditor() {
  const editor = getEssayEditor();

  if (!editor || !(editor instanceof HTMLTextAreaElement)) {
    return;
  }

  const autoResize = editor.dataset.autoResize !== "false";

  if (!autoResize) {
    return;
  }

  editor.style.height = "auto";

  editor.style.height = `${Math.max(editor.scrollHeight, 420)}px`;
}

/* =========================
   BOTÕES DE CARREGAMENTO
   ========================= */

function setButtonLoading(button, loading, text = "Carregando...") {
  if (!button) {
    return;
  }

  if (
    window.SESIConnect &&
    typeof window.SESIConnect.setButtonLoading === "function"
  ) {
    window.SESIConnect.setButtonLoading(button, loading, text);

    return;
  }

  if (loading) {
    if (!button.dataset.originalContent) {
      button.dataset.originalContent = button.innerHTML;
    }

    button.disabled = true;

    button.innerHTML = `
            <span class="loading-spinner loading-spinner--small"></span>
            <span>${text}</span>
        `;
  } else {
    button.disabled = false;

    if (button.dataset.originalContent) {
      button.innerHTML = button.dataset.originalContent;

      delete button.dataset.originalContent;
    }
  }
}

function wait(duration) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

/* =========================
   EVENTOS DO EDITOR
   ========================= */

function initEditorEvents() {
  const editor = getEssayEditor();

  if (!editor || editor.dataset.essayInitialized === "true") {
    return;
  }

  editor.dataset.essayInitialized = "true";

  editor.addEventListener("input", () => {
    autoResizeEditor();
    updateEssayStatistics();
    scheduleAutomaticSave();
  });

  editor.addEventListener("paste", () => {
    window.requestAnimationFrame(() => {
      autoResizeEditor();
      updateEssayStatistics();
      scheduleAutomaticSave();
    });
  });

  editor.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();

      insertAtCursor("    ");
    }
  });
}

function insertAtCursor(text) {
  const editor = getEssayEditor();

  if (!editor) {
    return;
  }

  if (
    editor instanceof HTMLTextAreaElement ||
    editor instanceof HTMLInputElement
  ) {
    const start = editor.selectionStart ?? editor.value.length;

    const end = editor.selectionEnd ?? editor.value.length;

    editor.value =
      editor.value.slice(0, start) + text + editor.value.slice(end);

    const cursor = start + text.length;

    editor.setSelectionRange(cursor, cursor);

    editor.focus();
  } else {
    document.execCommand("insertText", false, text);
  }

  updateEssayStatistics();
  scheduleAutomaticSave();
}

/* =========================
   BOTÕES DA INTERFACE
   ========================= */

function initEssayButtons() {
  selectAll("[data-essay-save]").forEach((button) => {
    initializeButton(button, () => {
      saveDraft({
        manual: true,
        createRevision: true,
        notify: true,
      });
    });
  });

  selectAll("[data-essay-submit]").forEach((button) => {
    initializeButton(button, async () => {
      await submitEssay(button);
    });
  });

  selectAll("[data-essay-clear]").forEach((button) => {
    initializeButton(button, () => clearEssay());
  });

  selectAll("[data-essay-download]").forEach((button) => {
    initializeButton(button, downloadEssay);
  });

  selectAll("[data-essay-copy]").forEach((button) => {
    initializeButton(button, copyEssay);
  });

  selectAll("[data-essay-ai-help]").forEach((button) => {
    initializeButton(button, openAIHelp);
  });

  selectAll("[data-essay-edit-submitted]").forEach((button) => {
    initializeButton(button, enableSubmittedEditing);
  });

  selectAll("[data-essay-template]").forEach((button) => {
    initializeButton(button, () => {
      insertTemplate(button.dataset.essayTemplate);
    });
  });
}

function initializeButton(button, handler) {
  if (button.dataset.essayInitialized === "true") {
    return;
  }

  button.dataset.essayInitialized = "true";

  button.addEventListener("click", handler);
}

/* =========================
   ATALHOS DE TECLADO
   ========================= */

function initKeyboardShortcuts() {
  document.addEventListener("keydown", (event) => {
    const isSaveShortcut =
      (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";

    if (isSaveShortcut) {
      event.preventDefault();

      if (!essayState.submitted) {
        saveDraft({
          manual: true,
          createRevision: true,
          notify: true,
        });
      }

      return;
    }

    const isSubmitShortcut =
      (event.ctrlKey || event.metaKey) && event.key === "Enter";

    if (isSubmitShortcut && !essayState.submitted) {
      event.preventDefault();

      submitEssay();
    }
  });
}

/* =========================
   SAÍDA DA PÁGINA
   ========================= */

function initBeforeUnload() {
  window.addEventListener("beforeunload", () => {
    window.clearTimeout(essayState.autosaveTimer);

    const content = getEditorContent();

    if (content !== essayState.lastSavedContent && !essayState.submitted) {
      saveDraft({
        manual: false,
        createRevision: false,
        notify: false,
      });
    }
  });
}

/* =========================
   SINCRONIZAÇÃO ENTRE ABAS
   ========================= */

function initStorageSynchronization() {
  window.addEventListener("storage", (event) => {
    if (event.key !== ESSAY_CONFIG.draftsKey) {
      return;
    }

    const externalDraft = getDraftByEssayId(essayState.essay.id);

    if (!externalDraft) {
      return;
    }

    const normalizedDraft = normalizeDraft(externalDraft, essayState.essay);

    if (
      new Date(normalizedDraft.updatedAt).getTime() <=
      new Date(essayState.draft.updatedAt).getTime()
    ) {
      return;
    }

    essayState.draft = normalizedDraft;

    essayState.submitted = normalizedDraft.status === "submitted";

    setEditorContent(normalizedDraft.content);

    applySubmittedState();
    renderRevisions();

    showMessage("A redação foi atualizada em outra aba.", "info");
  });
}

/* =========================
   OBSERVADOR DO DOM
   ========================= */

function initEssayObserver() {
  const observer = new MutationObserver((mutations) => {
    const containsNewNodes = mutations.some(
      (mutation) => mutation.addedNodes.length > 0,
    );

    if (!containsNewNodes) {
      return;
    }

    initEditorEvents();
    initEssayButtons();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/* =========================
   NAVEGAÇÃO
   ========================= */

function navigateTo(routeName) {
  if (
    window.SESINavigation &&
    typeof window.SESINavigation.navigateTo === "function"
  ) {
    window.SESINavigation.navigateTo(routeName);

    return;
  }

  if (
    window.SESIConnect &&
    typeof window.SESIConnect.navigateTo === "function"
  ) {
    window.SESIConnect.navigateTo(routeName);
  }
}

/* =========================
   MENSAGENS
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
   RENDERIZAÇÃO
   ========================= */

function renderEssay() {
  if (!essayState.essay || !essayState.draft) {
    return;
  }

  renderEssayInformation();

  setEditorContent(essayState.draft.content);

  renderRevisions();
  updateEssayStatistics();
  applySubmittedState();

  if (essayState.submitted) {
    setSaveStatus(
      "saved",
      essayState.draft.submittedAt
        ? `Enviado em ${formatDateTime(essayState.draft.submittedAt)}`
        : "Redação enviada",
    );
  } else if (essayState.draft.content) {
    setSaveStatus(
      "saved",
      `Último salvamento às ${formatTime(essayState.draft.updatedAt)}`,
    );
  } else {
    setSaveStatus("saved", "Rascunho vazio");
  }

  emitEssayEvent("sesi:essay-rendered", {
    essay: cloneData(essayState.essay),
    draft: cloneData(essayState.draft),
  });
}

/* =========================
   ATUALIZAÇÃO
   ========================= */

function refreshEssay() {
  loadSelectedEssay();
  loadDraft();

  initEditorEvents();
  initEssayButtons();

  renderEssay();
}

/* =========================
   REINICIALIZAÇÃO
   ========================= */

function resetEssay() {
  if (!window.confirm("Deseja apagar o rascunho e restaurar o editor?")) {
    return false;
  }

  const drafts = getAllDrafts();

  delete drafts[essayState.essay.id];

  writeStorage(localStorage, ESSAY_CONFIG.draftsKey, drafts);

  essayState.draft = normalizeDraft({}, essayState.essay);

  essayState.submitted = false;
  essayState.lastSavedContent = "";

  renderEssay();

  showMessage("Rascunho restaurado.", "success");

  emitEssayEvent("sesi:essay-reset");

  return true;
}

/* =========================
   INICIALIZAÇÃO
   ========================= */

function initEssay() {
  if (essayState.initialized) {
    refreshEssay();
    return;
  }

  const isEssayPage =
    document.body?.dataset.page === "essay" ||
    Boolean(
      select(
        [
          ".essay-page",
          "[data-essay-page]",
          "[data-essay-editor]",
          "#essay-editor",
          "#essay-textarea",
        ].join(","),
      ),
    );

  if (!isEssayPage) {
    return;
  }

  essayState.initialized = true;

  loadSelectedEssay();
  loadDraft();

  initEditorEvents();
  initEssayButtons();
  initKeyboardShortcuts();
  initBeforeUnload();
  initStorageSynchronization();
  initEssayObserver();

  renderEssay();

  emitEssayEvent("sesi:essay-ready", {
    essay: cloneData(essayState.essay),
    draft: cloneData(essayState.draft),
  });
}

/* =========================
   API GLOBAL
   ========================= */

const SESIEssay = Object.freeze({
  config: ESSAY_CONFIG,
  templates: ESSAY_TEMPLATES,

  init: initEssay,
  refresh: refreshEssay,
  render: renderEssay,
  reset: resetEssay,

  getEssay: () => (essayState.essay ? cloneData(essayState.essay) : null),

  getDraft: () => (essayState.draft ? cloneData(essayState.draft) : null),

  getContent: getEditorContent,

  setContent: setEditorContent,

  getStatistics: getEssayStatistics,

  save: saveDraft,
  submit: submitEssay,
  clear: clearEssay,

  insertTemplate,
  restoreRevision,

  download: downloadEssay,
  copy: copyEssay,
  openAIHelp,

  enableEditing: enableSubmittedEditing,
});

window.SESIEssay = SESIEssay;

/* =========================
   COMPATIBILIDADE
   ========================= */

window.saveEssay = saveDraft;
window.submitEssay = submitEssay;
window.clearEssay = clearEssay;
window.downloadEssay = downloadEssay;

/* =========================
   EXECUÇÃO AUTOMÁTICA
   ========================= */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initEssay, {
    once: true,
  });
} else {
  initEssay();
}

/* =========================
   EXPORTAÇÕES
   ========================= */

export {
  ESSAY_CONFIG,
  ESSAY_TEMPLATES,
  SESIEssay,
  initEssay,
  refreshEssay,
  renderEssay,
  resetEssay,
  getEditorContent,
  setEditorContent,
  getEssayStatistics,
  saveDraft,
  submitEssay,
  clearEssay,
  insertTemplate,
  restoreRevision,
  downloadEssay,
  copyEssay,
  openAIHelp,
  enableSubmittedEditing,
};
