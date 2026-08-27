/* =========================================================
   SESI CONNECT
   Módulo de atividades, entregas e filtros
   ========================================================= */

"use strict";

/* =========================
   CONFIGURAÇÕES
   ========================= */

const ACTIVITIES_CONFIG = Object.freeze({
  storageKey: "sesi-connect-activities",
  submissionsKey: "sesi-connect-submissions",

  maximumFileSize: 10 * 1024 * 1024,

  allowedExtensions: [
    "pdf",
    "doc",
    "docx",
    "ppt",
    "pptx",
    "xls",
    "xlsx",
    "jpg",
    "jpeg",
    "png",
    "zip",
  ],

  statuses: {
    ALL: "all",
    PENDING: "pending",
    PROGRESS: "progress",
    COMPLETED: "completed",
    LATE: "late",
  },
});

/* =========================
   ATIVIDADES DO PROTÓTIPO
   ========================= */

const DEFAULT_ACTIVITIES = Object.freeze([
  {
    id: "activity-math-001",
    title: "Lista de exercícios — Funções",
    description:
      "Resolva os exercícios sobre funções do primeiro e segundo grau.",
    subject: "Matemática",
    subjectSlug: "math",
    teacher: "Prof. Ricardo Alves",
    type: "exercise",
    status: "pending",
    deadline: createFutureDate(1, 23, 59),
    points: 10,
    progress: 0,
    deliveryType: "file",
    grade: null,
    feedback: null,
  },

  {
    id: "activity-essay-001",
    title: "Redação dissertativo-argumentativa",
    description: "Produza uma redação no modelo ENEM sobre inclusão social.",
    subject: "Língua Portuguesa",
    subjectSlug: "portuguese",
    teacher: "Profa. Renata Souza",
    type: "essay",
    status: "progress",
    deadline: createFutureDate(3, 23, 59),
    points: 1000,
    progress: 35,
    deliveryType: "essay",
    grade: null,
    feedback: null,
  },

  {
    id: "activity-history-001",
    title: "Relatório — Revolução Industrial",
    description:
      "Elabore um relatório relacionando industrialização e transformações sociais.",
    subject: "História",
    subjectSlug: "history",
    teacher: "Prof. Marcelo Lima",
    type: "report",
    status: "completed",
    deadline: createPastDate(2, 23, 59),
    points: 10,
    progress: 100,
    deliveryType: "file",
    submittedAt: createPastDate(3, 18, 30),
    grade: 8.5,
    feedback:
      "Bom desenvolvimento. Reforce a relação entre urbanização e trabalho fabril.",
  },

  {
    id: "activity-physics-001",
    title: "Experimento de movimento uniforme",
    description:
      "Registre os resultados do experimento e apresente os cálculos realizados.",
    subject: "Física",
    subjectSlug: "physics",
    teacher: "Profa. Camila Rocha",
    type: "project",
    status: "late",
    deadline: createPastDate(1, 18, 0),
    points: 10,
    progress: 20,
    deliveryType: "file",
    grade: null,
    feedback: null,
  },
]);

/* =========================
   ESTADO
   ========================= */

const activitiesState = {
  initialized: false,
  activities: [],
  activeStatus: ACTIVITIES_CONFIG.statuses.ALL,
  activeSubject: "all",
  activeTimeFilter: "all",
  sortMode: "deadline-asc",
  searchQuery: "",
  selectedFiles: new Map(),
  activeActivityId: null,
};

/* =========================
   UTILITÁRIOS
   ========================= */

function select(selector, context = document) {
  return context.querySelector(selector);
}

function selectAll(selector, context = document) {
  return [...context.querySelectorAll(selector)];
}

function emitActivitiesEvent(name, detail = {}) {
  document.dispatchEvent(
    new CustomEvent(name, {
      bubbles: true,
      detail,
    }),
  );
}

function createFutureDate(days, hour = 23, minute = 59) {
  const date = new Date();

  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);

  return date.toISOString();
}

function createPastDate(days, hour = 23, minute = 59) {
  const date = new Date();

  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);

  return date.toISOString();
}

function generateId(prefix = "activity") {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return [prefix, Date.now(), Math.random().toString(16).slice(2)].join("-");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function cloneActivity(activity) {
  return {
    ...activity,
  };
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

/* =========================
   NORMALIZAÇÃO
   ========================= */

function normalizeActivity(activity = {}) {
  const statusValues = Object.values(ACTIVITIES_CONFIG.statuses).filter(
    (status) => status !== "all",
  );

  const normalizedStatus = statusValues.includes(activity.status)
    ? activity.status
    : "pending";

  const deadline = isValidDate(activity.deadline)
    ? activity.deadline
    : createFutureDate(7);

  return {
    id: String(activity.id || generateId()),

    title: String(activity.title || "Atividade sem título").trim(),

    description: String(activity.description || "").trim(),

    subject: String(activity.subject || "Geral").trim(),

    subjectSlug: String(activity.subjectSlug || "general")
      .trim()
      .toLowerCase(),

    teacher: String(activity.teacher || "Professor não informado").trim(),

    type: String(activity.type || "exercise")
      .trim()
      .toLowerCase(),

    status: normalizedStatus,
    deadline,

    points: Number.isFinite(Number(activity.points))
      ? Number(activity.points)
      : 10,

    progress: clampNumber(activity.progress, 0, 100),

    deliveryType: activity.deliveryType === "essay" ? "essay" : "file",

    submittedAt: isValidDate(activity.submittedAt)
      ? activity.submittedAt
      : null,

    grade:
      activity.grade === null ||
      activity.grade === undefined ||
      activity.grade === ""
        ? null
        : Number(activity.grade),

    feedback: activity.feedback ? String(activity.feedback) : null,

    attachment:
      activity.attachment && typeof activity.attachment === "object"
        ? {
            ...activity.attachment,
          }
        : null,
  };
}

function clampNumber(value, minimum, maximum) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return minimum;
  }

  return Math.min(maximum, Math.max(minimum, number));
}

function isValidDate(value) {
  return value && !Number.isNaN(new Date(value).getTime());
}

/* =========================
   CARREGAMENTO
   ========================= */

function loadActivities() {
  const storedActivities = readStorage(ACTIVITIES_CONFIG.storageKey);

  const source = Array.isArray(storedActivities)
    ? storedActivities
    : DEFAULT_ACTIVITIES;

  activitiesState.activities = source
    .map(normalizeActivity)
    .map(updateAutomaticStatus);

  if (!Array.isArray(storedActivities)) {
    saveActivities();
  }

  return getActivities();
}

function saveActivities() {
  return writeStorage(ACTIVITIES_CONFIG.storageKey, activitiesState.activities);
}

function resetActivities() {
  activitiesState.activities = DEFAULT_ACTIVITIES.map(normalizeActivity);

  activitiesState.selectedFiles.clear();

  saveActivities();
  renderActivities();

  showMessage("As atividades foram restauradas.", "success");
}

/* =========================
   STATUS AUTOMÁTICO
   ========================= */

function updateAutomaticStatus(activity) {
  const normalizedActivity = {
    ...activity,
  };

  if (normalizedActivity.status === "completed") {
    return normalizedActivity;
  }

  const deadlineTime = new Date(normalizedActivity.deadline).getTime();

  if (deadlineTime < Date.now() && normalizedActivity.status !== "completed") {
    normalizedActivity.status = "late";
  }

  return normalizedActivity;
}

function refreshAutomaticStatuses() {
  let changed = false;

  activitiesState.activities = activitiesState.activities.map((activity) => {
    const updatedActivity = updateAutomaticStatus(activity);

    if (updatedActivity.status !== activity.status) {
      changed = true;
    }

    return updatedActivity;
  });

  if (changed) {
    saveActivities();
  }
}

/* =========================
   CONSULTAS
   ========================= */

function getActivities() {
  return activitiesState.activities.map(cloneActivity);
}

function getActivityById(activityId) {
  return (
    activitiesState.activities.find((activity) => activity.id === activityId) ||
    null
  );
}

function getFilteredActivities() {
  const query = normalizeText(activitiesState.searchQuery);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date(todayEnd);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const filtered = activitiesState.activities.filter((activity) => {
    const matchesStatus =
      activitiesState.activeStatus === "all" ||
      activity.status === activitiesState.activeStatus;

    const matchesSubject =
      activitiesState.activeSubject === "all" ||
      activity.subjectSlug === activitiesState.activeSubject;

    const searchableText = normalizeText(
      [
        activity.title,
        activity.description,
        activity.subject,
        activity.teacher,
      ].join(" "),
    );

    const matchesSearch = !query || searchableText.includes(query);

    const deadline = new Date(activity.deadline);
    let matchesTime = true;

    if (activitiesState.activeTimeFilter === "today") {
      matchesTime = deadline >= todayStart && deadline <= todayEnd;
    } else if (activitiesState.activeTimeFilter === "week") {
      matchesTime = deadline >= todayStart && deadline <= weekEnd;
    }

    return matchesStatus && matchesSubject && matchesSearch && matchesTime;
  });

  const statusOrder = {
    late: 0,
    pending: 1,
    progress: 2,
    completed: 3,
  };

  filtered.sort((a, b) => {
    switch (activitiesState.sortMode) {
      case "deadline-desc":
        return new Date(b.deadline) - new Date(a.deadline);
      case "title-asc":
        return a.title.localeCompare(b.title, "pt-BR");
      case "subject-asc":
        return a.subject.localeCompare(b.subject, "pt-BR");
      case "status":
        return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
      case "deadline-asc":
      default:
        return new Date(a.deadline) - new Date(b.deadline);
    }
  });

  return filtered;
}

/* =========================
   FORMATAÇÃO
   ========================= */

function formatDate(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Data não informada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatTime(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateTime(dateValue) {
  return `${formatDate(dateValue)} às ${formatTime(dateValue)}`;
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

function getDeadlineState(activity) {
  const difference = new Date(activity.deadline).getTime() - Date.now();

  if (activity.status === "completed") {
    return "completed";
  }

  if (difference < 0) {
    return "late";
  }

  if (difference <= 24 * 60 * 60 * 1000) {
    return "urgent";
  }

  return "normal";
}

/* =========================
   RÓTULOS E ÍCONES
   ========================= */

function getActivityIcon(type) {
  const icons = {
    essay: "fa-pen-nib",
    exercise: "fa-list-check",
    report: "fa-file-lines",
    project: "fa-diagram-project",
    quiz: "fa-circle-question",
  };

  return icons[type] || "fa-file-pen";
}

function getStatusLabel(status) {
  const labels = {
    pending: "Pendente",
    progress: "Em andamento",
    completed: "Concluída",
    late: "Atrasada",
  };

  return labels[status] || "Pendente";
}

function getTypeLabel(type) {
  const labels = {
    essay: "Redação",
    exercise: "Exercício",
    report: "Relatório",
    project: "Projeto",
    quiz: "Questionário",
  };

  return labels[type] || "Atividade";
}

/* =========================
   CRIAÇÃO DE ELEMENTOS
   ========================= */

function createElement(tagName, className = "", text = null) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (text !== null) {
    element.textContent = text;
  }

  return element;
}

function createIcon(iconClass) {
  const icon = createElement("i");

  icon.className = `fa-solid ${iconClass}`;

  return icon;
}

/* =========================
   PERFIL DA ATIVIDADE
   ========================= */

function createActivityInfo(activity) {
  const container = createElement("div", "activity-info");

  const iconContainer = createElement(
    "div",
    `activity-icon activity-icon--${activity.type}`,
  );

  iconContainer.appendChild(createIcon(getActivityIcon(activity.type)));

  const content = createElement("div", "activity-info-content");

  const title = createElement("button", "activity-title", activity.title);

  title.type = "button";
  title.dataset.activityOpen = activity.id;

  title.addEventListener("click", () => openActivity(activity.id));

  const description = createElement(
    "p",
    "activity-description",
    activity.description,
  );

  content.append(title, description);

  container.append(iconContainer, content);

  return container;
}

/* =========================
   DISCIPLINA
   ========================= */

function createSubjectBadge(activity) {
  return createElement(
    "span",
    ["activity-subject", `activity-subject--${activity.subjectSlug}`].join(" "),
    activity.subject,
  );
}

/* =========================
   PRAZO
   ========================= */

function createDeadline(activity) {
  const deadlineState = getDeadlineState(activity);

  const container = createElement(
    "div",
    ["activity-deadline", `activity-deadline--${deadlineState}`].join(" "),
  );

  container.append(
    createElement(
      "span",
      "activity-deadline-date",
      formatDate(activity.deadline),
    ),
    createElement(
      "span",
      "activity-deadline-time",
      `Até ${formatTime(activity.deadline)}`,
    ),
  );

  if (deadlineState === "late" || deadlineState === "urgent") {
    const warning = createElement("span", "activity-deadline-warning");

    warning.append(
      createIcon("fa-triangle-exclamation"),
      document.createTextNode(
        deadlineState === "late" ? "Prazo encerrado" : "Prazo próximo",
      ),
    );

    container.appendChild(warning);
  }

  return container;
}

/* =========================
   STATUS
   ========================= */

function createStatusBadge(activity) {
  return createElement(
    "span",
    ["activity-status", `activity-status--${activity.status}`].join(" "),
    getStatusLabel(activity.status),
  );
}

/* =========================
   ENVIO DA ATIVIDADE
   ========================= */

function createDeliveryArea(activity) {
  if (activity.status === "completed") {
    return createDeliveredArea(activity);
  }

  if (activity.deliveryType === "essay" || activity.type === "essay") {
    const button = createElement("button", "activity-essay-button");

    button.type = "button";
    button.dataset.activityEssay = activity.id;

    button.append(
      createIcon("fa-pen-nib"),
      document.createTextNode(
        activity.status === "progress"
          ? "Continuar redação"
          : "Iniciar redação",
      ),
    );

    button.addEventListener("click", () => openEssay(activity.id));

    return button;
  }

  const container = createElement("div", "activity-delivery");

  const inputId = `activity-file-${activity.id}`;

  const input = createElement("input", "activity-file-input");

  input.type = "file";
  input.id = inputId;
  input.dataset.activityFile = activity.id;

  input.accept = ACTIVITIES_CONFIG.allowedExtensions
    .map((extension) => `.${extension}`)
    .join(",");

  const label = createElement("label", "activity-file-label");

  label.htmlFor = inputId;

  label.append(
    createIcon("fa-paperclip"),
    createElement("span", "", getSelectedFileLabel(activity.id)),
  );

  if (activitiesState.selectedFiles.has(activity.id)) {
    label.classList.add("has-file");
  }

  const submitButton = createElement(
    "button",
    "btn-primary activity-submit-button",
    "Enviar atividade",
  );

  submitButton.type = "button";
  submitButton.dataset.activitySubmit = activity.id;

  input.addEventListener("change", () => {
    handleFileSelection(activity.id, input.files?.[0] || null);
  });

  submitButton.addEventListener("click", () =>
    submitActivity(activity.id, submitButton),
  );

  container.append(input, label, submitButton);

  return container;
}

function createDeliveredArea(activity) {
  const container = createElement("div", "activity-delivered");

  const status = createElement("span", "activity-delivered-status");

  status.append(
    createIcon("fa-circle-check"),
    document.createTextNode("Entregue"),
  );

  container.appendChild(status);

  if (activity.submittedAt) {
    container.appendChild(
      createElement(
        "span",
        "activity-grade",
        `Enviado em ${formatDate(activity.submittedAt)}`,
      ),
    );
  }

  if (activity.grade !== null && Number.isFinite(activity.grade)) {
    const grade = createElement("span", "activity-grade");

    const prefix = document.createTextNode("Nota: ");

    const value = createElement("strong", "", String(activity.grade));

    grade.append(prefix, value);

    container.appendChild(grade);
  }

  return container;
}

function getSelectedFileLabel(activityId) {
  const file = activitiesState.selectedFiles.get(activityId);

  return file ? file.name : "Selecionar arquivo";
}

/* =========================
   LINHA DA TABELA
   ========================= */

function createActivityTableRow(activity) {
  const row = createElement("tr");

  row.dataset.activityId = activity.id;

  row.dataset.activityStatus = activity.status;

  row.dataset.activitySubject = activity.subjectSlug;

  const activityCell = createElement("td");

  activityCell.appendChild(createActivityInfo(activity));

  const subjectCell = createElement("td");

  subjectCell.appendChild(createSubjectBadge(activity));

  const teacherCell = createElement("td", "", activity.teacher);

  const deadlineCell = createElement("td");

  deadlineCell.appendChild(createDeadline(activity));

  const statusCell = createElement("td");

  statusCell.appendChild(createStatusBadge(activity));

  const deliveryCell = createElement("td");

  deliveryCell.appendChild(createDeliveryArea(activity));

  row.append(
    activityCell,
    subjectCell,
    teacherCell,
    deadlineCell,
    statusCell,
    deliveryCell,
  );

  return row;
}

/* =========================
   CARTÃO MOBILE
   ========================= */

function createActivityCard(activity) {
  const card = createElement("article", "activity-card");

  card.dataset.activityId = activity.id;

  const header = createElement("div", "activity-card-header");

  const titleGroup = createElement("div", "activity-card-title-group");

  const iconContainer = createElement(
    "div",
    `activity-icon activity-icon--${activity.type}`,
  );

  iconContainer.appendChild(createIcon(getActivityIcon(activity.type)));

  const titleContent = createElement("div");

  const title = createElement("button", "activity-card-title", activity.title);

  title.type = "button";

  title.addEventListener("click", () => openActivity(activity.id));

  const description = createElement(
    "p",
    "activity-card-description",
    activity.description,
  );

  titleContent.append(title, description);

  titleGroup.append(iconContainer, titleContent);

  header.append(titleGroup, createStatusBadge(activity));

  const details = createElement("div", "activity-card-details");

  details.append(
    createActivityCardDetail("Disciplina", activity.subject),

    createActivityCardDetail("Professor", activity.teacher),

    createActivityCardDetail("Prazo", formatDateTime(activity.deadline)),

    createActivityCardDetail("Tipo", getTypeLabel(activity.type)),
  );

  const actions = createElement("div", "activity-card-actions");

  actions.appendChild(createDeliveryArea(activity));

  card.append(header, details, actions);

  return card;
}

function createActivityCardDetail(label, value) {
  const container = createElement("div", "activity-card-detail");

  container.append(
    createElement("span", "activity-card-detail-label", label),
    createElement("span", "activity-card-detail-value", value),
  );

  return container;
}

/* =========================
   ESTADO VAZIO
   ========================= */

function createEmptyState() {
  const container = createElement("div", "activities-empty");

  const icon = createElement("div", "activities-empty-icon");

  icon.appendChild(createIcon("fa-list-check"));

  container.append(
    icon,
    createElement("h3", "", "Nenhuma atividade encontrada"),
    createElement(
      "p",
      "",
      "Altere os filtros ou a pesquisa para visualizar outras atividades.",
    ),
  );

  return container;
}

/* =========================
   RENDERIZAÇÃO
   ========================= */

function renderActivities() {
  refreshAutomaticStatuses();

  const activities = getFilteredActivities();

  renderActivitiesTable(activities);
  renderActivitiesCards(activities);
  renderActivitiesEmptyState(activities);
  updateSummary();
  updateTabs();
  updateResultsText(activities.length);

  emitActivitiesEvent("sesi:activities-rendered", {
    activities,
    total: activities.length,
  });
}

function renderActivitiesTable(activities) {
  const tableBody = select(
    [
      "[data-activities-table-body]",
      "#activities-table-body",
      ".activities-table tbody",
    ].join(","),
  );

  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = "";

  const fragment = document.createDocumentFragment();

  activities.forEach((activity) => {
    fragment.appendChild(createActivityTableRow(activity));
  });

  tableBody.appendChild(fragment);
}

function renderActivitiesCards(activities) {
  const cardsContainer = select(
    [
      "[data-activities-cards]",
      "[data-activities-container]",
      "[data-activities-list]",
      "#activities-cards",
      ".activities-cards",
      ".activities-grid",
    ].join(","),
  );

  if (!cardsContainer) {
    return;
  }

  cardsContainer.innerHTML = "";

  const fragment = document.createDocumentFragment();

  activities.forEach((activity) => {
    fragment.appendChild(createActivityCard(activity));
  });

  cardsContainer.appendChild(fragment);
}

function renderActivitiesEmptyState(activities) {
  const container = select(
    "[data-activities-empty-container], [data-activities-empty]",
  );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (activities.length === 0) {
    container.appendChild(createEmptyState());

    container.hidden = false;
  } else {
    container.hidden = true;
  }
}

/* =========================
   RESUMO
   ========================= */

function countByStatus(status) {
  return activitiesState.activities.filter(
    (activity) => activity.status === status,
  ).length;
}

function updateSummary() {
  const counters = {
    pending: countByStatus("pending"),
    progress: countByStatus("progress"),
    completed: countByStatus("completed"),
    late: countByStatus("late"),
  };

  Object.entries(counters).forEach(([status, value]) => {
    selectAll(
      `[data-activities-count="${status}"], [data-activities-stat="${status}"]`,
    ).forEach((element) => {
      element.textContent = String(value);
    });

    if (status === "pending") {
      selectAll("[data-activities-pending-count]").forEach((element) => {
        element.textContent = String(value);
        element.hidden = value === 0;
      });
    }
  });
}

function updateTabs() {
  selectAll("[data-activity-tab]").forEach((button) => {
    const status = button.dataset.activityTab;

    const active =
      status === activitiesState.activeStatus &&
      activitiesState.activeTimeFilter === "all";

    button.classList.toggle("active", active);

    button.setAttribute("aria-selected", String(active));

    const counter = select(".activities-tab-count", button);

    if (counter) {
      counter.textContent =
        status === "all"
          ? String(activitiesState.activities.length)
          : String(countByStatus(status));
    }
  });

  selectAll("[data-activity-filter]").forEach((button) => {
    const filter = button.dataset.activityFilter || "all";
    const isTimeFilter = ["today", "week"].includes(filter);
    const active = isTimeFilter
      ? activitiesState.activeTimeFilter === filter
      : activitiesState.activeTimeFilter === "all" &&
        activitiesState.activeStatus === filter;

    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function updateResultsText(filteredCount) {
  selectAll("[data-activities-results]").forEach((element) => {
    const total = activitiesState.activities.length;

    element.textContent = `${filteredCount} de ${total} atividades`;
  });
}

/* =========================
   FILTROS
   ========================= */

function setStatusFilter(status) {
  const validStatuses = Object.values(ACTIVITIES_CONFIG.statuses);

  activitiesState.activeStatus = validStatuses.includes(status)
    ? status
    : "all";

  renderActivities();
}

function setSubjectFilter(subject) {
  activitiesState.activeSubject = subject || "all";

  renderActivities();
}

function setSearchQuery(query) {
  activitiesState.searchQuery = String(query || "");

  renderActivities();
}

function clearFilters() {
  activitiesState.activeStatus = "all";
  activitiesState.activeSubject = "all";
  activitiesState.activeTimeFilter = "all";
  activitiesState.sortMode = "deadline-asc";
  activitiesState.searchQuery = "";

  selectAll(
    ["[data-activities-search]", "#activities-search"].join(","),
  ).forEach((input) => {
    input.value = "";
  });

  selectAll(
    ["[data-activities-subject-filter]", "#activities-subject-filter"].join(
      ",",
    ),
  ).forEach((selectElement) => {
    selectElement.value = "all";
  });

  selectAll("[data-activities-status-filter]").forEach((selectElement) => {
    selectElement.value = "all";
  });

  selectAll("[data-activities-sort]").forEach((selectElement) => {
    selectElement.value = "deadline-asc";
  });

  renderActivities();
}

/* =========================
   SELEÇÃO DE ARQUIVO
   ========================= */

function getFileExtension(fileName) {
  return String(fileName || "")
    .split(".")
    .pop()
    .toLowerCase();
}

function validateFile(file) {
  if (!file) {
    return {
      valid: false,
      error: "Selecione um arquivo para enviar.",
    };
  }

  const extension = getFileExtension(file.name);

  if (!ACTIVITIES_CONFIG.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: "Formato de arquivo não permitido.",
    };
  }

  if (file.size > ACTIVITIES_CONFIG.maximumFileSize) {
    return {
      valid: false,
      error: "O arquivo deve ter no máximo 10 MB.",
    };
  }

  return {
    valid: true,
    error: null,
  };
}

function handleFileSelection(activityId, file) {
  if (!file) {
    activitiesState.selectedFiles.delete(activityId);

    renderActivities();
    return;
  }

  const validation = validateFile(file);

  if (!validation.valid) {
    activitiesState.selectedFiles.delete(activityId);

    showMessage(validation.error, "error");

    renderActivities();
    return;
  }

  activitiesState.selectedFiles.set(activityId, file);

  renderActivities();

  showMessage(`${file.name} selecionado.`, "success");

  emitActivitiesEvent("sesi:activity-file-selected", {
    activityId,
    file: {
      name: file.name,
      size: file.size,
      type: file.type,
    },
  });
}

/* =========================
   ENVIO
   ========================= */

async function submitActivity(activityId, submitButton = null) {
  const activity = getActivityById(activityId);

  if (!activity) {
    showMessage("Atividade não encontrada.", "error");

    return false;
  }

  if (activity.status === "completed") {
    showMessage("Esta atividade já foi entregue.", "info");

    return false;
  }

  if (activity.deliveryType === "essay") {
    openEssay(activityId);
    return false;
  }

  const file = activitiesState.selectedFiles.get(activityId);

  const validation = validateFile(file);

  if (!validation.valid) {
    showMessage(validation.error, "error");

    return false;
  }

  setButtonLoading(submitButton, true, "Enviando...");

  await simulateRequest(650);

  const activityIndex = activitiesState.activities.findIndex(
    (item) => item.id === activityId,
  );

  if (activityIndex === -1) {
    setButtonLoading(submitButton, false);

    return false;
  }

  const submittedAt = new Date().toISOString();

  const attachment = {
    name: file.name,
    size: file.size,
    type: file.type,
    extension: getFileExtension(file.name),
  };

  activitiesState.activities[activityIndex] = {
    ...activitiesState.activities[activityIndex],
    status: "completed",
    progress: 100,
    submittedAt,
    attachment,
  };

  saveActivities();
  saveSubmission({
    activityId,
    submittedAt,
    attachment,
  });

  activitiesState.selectedFiles.delete(activityId);

  setButtonLoading(submitButton, false);

  renderActivities();

  showMessage("Atividade enviada com sucesso.", "success");

  createSubmissionNotification(activitiesState.activities[activityIndex]);

  emitActivitiesEvent("sesi:activity-submitted", {
    activity: cloneActivity(activitiesState.activities[activityIndex]),
  });

  return true;
}

function saveSubmission(submission) {
  const submissions = readStorage(ACTIVITIES_CONFIG.submissionsKey, []);

  const list = Array.isArray(submissions) ? submissions : [];

  list.unshift({
    id: generateId("submission"),
    ...submission,
  });

  writeStorage(ACTIVITIES_CONFIG.submissionsKey, list);
}

function simulateRequest(duration) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

/* =========================
   REDAÇÃO
   ========================= */

function openEssay(activityId) {
  const activity = getActivityById(activityId);

  if (!activity) {
    showMessage("Atividade de redação não encontrada.", "error");

    return;
  }

  try {
    sessionStorage.setItem(
      "sesi-connect-selected-essay",
      JSON.stringify({
        activityId: activity.id,
        title: activity.title,
        description: activity.description,
        subject: activity.subject,
        teacher: activity.teacher,
        deadline: activity.deadline,
      }),
    );
  } catch (error) {
    console.warn("[SESI Connect] Não foi possível preparar a redação.", error);
  }

  const activityIndex = activitiesState.activities.findIndex(
    (item) => item.id === activityId,
  );

  if (
    activityIndex !== -1 &&
    activitiesState.activities[activityIndex].status === "pending"
  ) {
    activitiesState.activities[activityIndex].status = "progress";

    activitiesState.activities[activityIndex].progress = Math.max(
      activitiesState.activities[activityIndex].progress,
      5,
    );

    saveActivities();
  }

  navigateTo("essay");
}

/* =========================
   MODAL
   ========================= */

function openActivity(activityId) {
  const activity = getActivityById(activityId);

  if (!activity) {
    return;
  }

  activitiesState.activeActivityId = activityId;

  populateActivityModal(activity);

  if (
    window.SESIConnect &&
    typeof window.SESIConnect.openModal === "function"
  ) {
    window.SESIConnect.openModal(
      document.getElementById("activity-details-modal") || "activity-modal",
    );

    return;
  }

  const modal =
    document.getElementById("activity-details-modal") ||
    document.getElementById("activity-modal");

  modal?.classList.add("active", "is-open");
}

function populateActivityModal(activity) {
  const modal =
    document.getElementById("activity-details-modal") ||
    document.getElementById("activity-modal");

  if (!modal) {
    return;
  }

  const fields = {
    title: activity.title,
    description: activity.description,
    subject: activity.subject,
    teacher: activity.teacher,
    deadline: formatDateTime(activity.deadline),
    status: getStatusLabel(activity.status),
    type: getTypeLabel(activity.type),
    points: String(activity.points),
  };

  Object.entries(fields).forEach(([field, value]) => {
    selectAll(
      `[data-activity-modal="${field}"], [data-activity-detail="${field}"]`,
      modal,
    ).forEach((element) => {
      element.textContent = value;
    });
  });

  selectAll('[data-activity-detail="instructions"]', modal).forEach(
    (element) => {
      element.textContent = activity.description;
    },
  );

  selectAll('[data-activity-detail="attachments"]', modal).forEach(
    (element) => {
      element.textContent = activity.attachment ? "1 arquivo" : "Nenhum";
    },
  );

  selectAll('[data-activity-detail="submittedAt"]', modal).forEach(
    (element) => {
      element.textContent = activity.submittedAt
        ? formatDateTime(activity.submittedAt)
        : "—";
    },
  );

  const submissionId = document.querySelector("[data-submission-activity-id]");
  if (submissionId) submissionId.value = activity.id;

  selectAll("[data-submission-activity-title]").forEach((element) => {
    element.textContent = activity.title;
  });

  selectAll("[data-submission-activity-subject]").forEach((element) => {
    element.textContent = activity.subject;
  });

  selectAll("[data-activity-modal-progress]", modal).forEach((element) => {
    element.textContent = `${activity.progress}%`;
  });

  selectAll("[data-activity-modal-progress-bar]", modal).forEach((element) => {
    element.style.setProperty("--activity-progress", `${activity.progress}%`);

    element.style.width = `${activity.progress}%`;
  });

  const actionContainer = select("[data-activity-modal-actions]", modal);

  if (actionContainer) {
    actionContainer.innerHTML = "";
    actionContainer.appendChild(createDeliveryArea(activity));
  }
}

/* =========================
   NOTIFICAÇÕES
   ========================= */

function createSubmissionNotification(activity) {
  const notification = {
    type: "success",
    title: "Atividade entregue",
    message: `${activity.title} foi enviada com sucesso.`,
    route: "activities",
    metadata: {
      activityId: activity.id,
    },
  };

  if (
    window.SESINotifications &&
    typeof window.SESINotifications.add === "function"
  ) {
    window.SESINotifications.add(notification);
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
      id: generateId("toast"),
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
    button.dataset.originalText = button.textContent;

    button.disabled = true;
    button.textContent = text;
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || "Enviar atividade";

    delete button.dataset.originalText;
  }
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
   EVENTOS DOS FILTROS
   ========================= */

function initFilterEvents() {
  selectAll("[data-activity-filter]").forEach((button) => {
    if (button.dataset.activitiesInitialized === "true") return;
    button.dataset.activitiesInitialized = "true";
    button.addEventListener("click", () => {
      const filter = button.dataset.activityFilter || "all";
      if (["today", "week"].includes(filter)) {
        activitiesState.activeTimeFilter = filter;
        activitiesState.activeStatus = "all";
      } else {
        activitiesState.activeTimeFilter = "all";
        setStatusFilter(filter);
        return;
      }
      renderActivities();
    });
  });

  selectAll("[data-activities-status-filter]").forEach((selectElement) => {
    if (selectElement.dataset.activitiesInitialized === "true") return;
    selectElement.dataset.activitiesInitialized = "true";
    selectElement.addEventListener("change", () => {
      activitiesState.activeTimeFilter = "all";
      setStatusFilter(selectElement.value);
    });
  });

  selectAll("[data-activities-sort]").forEach((selectElement) => {
    if (selectElement.dataset.activitiesInitialized === "true") return;
    selectElement.dataset.activitiesInitialized = "true";
    selectElement.addEventListener("change", () => {
      activitiesState.sortMode = selectElement.value || "deadline-asc";
      renderActivities();
    });
  });

  selectAll("[data-activity-tab]").forEach((button) => {
    if (button.dataset.activitiesInitialized === "true") {
      return;
    }

    button.dataset.activitiesInitialized = "true";

    button.addEventListener("click", () => {
      setStatusFilter(button.dataset.activityTab);
    });
  });

  selectAll(
    [
      "[data-activities-search]",
      "#activities-search",
      ".activities-search input",
    ].join(","),
  ).forEach((input) => {
    if (input.dataset.activitiesInitialized === "true") {
      return;
    }

    input.dataset.activitiesInitialized = "true";

    input.addEventListener("input", () => {
      setSearchQuery(input.value);
    });
  });

  selectAll(
    ["[data-activities-subject-filter]", "#activities-subject-filter"].join(
      ",",
    ),
  ).forEach((selectElement) => {
    if (selectElement.dataset.activitiesInitialized === "true") {
      return;
    }

    selectElement.dataset.activitiesInitialized = "true";

    selectElement.addEventListener("change", () => {
      setSubjectFilter(selectElement.value);
    });
  });

  selectAll("[data-activities-clear-filters]").forEach((button) => {
    if (button.dataset.activitiesInitialized === "true") {
      return;
    }

    button.dataset.activitiesInitialized = "true";

    button.addEventListener("click", clearFilters);
  });
}

/* =========================
   EVENTOS GERAIS
   ========================= */

function initGeneralEvents() {
  selectAll("[data-activity-open]").forEach((button) => {
    if (button.dataset.activitiesInitialized === "true") {
      return;
    }

    button.dataset.activitiesInitialized = "true";

    button.addEventListener("click", () => {
      openActivity(button.dataset.activityOpen);
    });
  });

  selectAll("[data-activity-essay]").forEach((button) => {
    if (button.dataset.activitiesInitialized === "true") {
      return;
    }

    button.dataset.activitiesInitialized = "true";

    button.addEventListener("click", () => {
      openEssay(button.dataset.activityEssay);
    });
  });

  selectAll("[data-activities-reset]").forEach((button) => {
    if (button.dataset.activitiesInitialized === "true") {
      return;
    }

    button.dataset.activitiesInitialized = "true";

    button.addEventListener("click", () => {
      if (window.confirm("Deseja restaurar as atividades do protótipo?")) {
        resetActivities();
      }
    });
  });
}

/* =========================
   ATUALIZAÇÃO EXTERNA
   ========================= */

function updateActivity(activityId, updates = {}) {
  const index = activitiesState.activities.findIndex(
    (activity) => activity.id === activityId,
  );

  if (index === -1) {
    return {
      success: false,
      error: "Atividade não encontrada.",
    };
  }

  activitiesState.activities[index] = normalizeActivity({
    ...activitiesState.activities[index],
    ...updates,
    id: activityId,
  });

  saveActivities();
  renderActivities();

  emitActivitiesEvent("sesi:activity-updated", {
    activity: cloneActivity(activitiesState.activities[index]),
  });

  return {
    success: true,
    activity: cloneActivity(activitiesState.activities[index]),
  };
}

function addActivity(activity) {
  const normalizedActivity = normalizeActivity(activity);

  activitiesState.activities.unshift(normalizedActivity);

  saveActivities();
  renderActivities();

  emitActivitiesEvent("sesi:activity-added", {
    activity: cloneActivity(normalizedActivity),
  });

  return cloneActivity(normalizedActivity);
}

function removeActivity(activityId) {
  const previousLength = activitiesState.activities.length;

  activitiesState.activities = activitiesState.activities.filter(
    (activity) => activity.id !== activityId,
  );

  if (previousLength === activitiesState.activities.length) {
    return false;
  }

  activitiesState.selectedFiles.delete(activityId);

  saveActivities();
  renderActivities();

  emitActivitiesEvent("sesi:activity-removed", {
    activityId,
  });

  return true;
}

/* =========================
   SINCRONIZAÇÃO ENTRE ABAS
   ========================= */

function initStorageSynchronization() {
  window.addEventListener("storage", (event) => {
    if (event.key !== ACTIVITIES_CONFIG.storageKey) {
      return;
    }

    loadActivities();
    renderActivities();
  });
}

/* =========================
   OBSERVADOR
   ========================= */

function initActivitiesObserver() {
  const observer = new MutationObserver((mutations) => {
    const hasNewElements = mutations.some(
      (mutation) => mutation.addedNodes.length > 0,
    );

    if (!hasNewElements) {
      return;
    }

    initFilterEvents();
    initGeneralEvents();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/* =========================
   ATUALIZAÇÃO
   ========================= */

function refreshActivities() {
  loadActivities();
  renderActivities();
  initFilterEvents();
  initGeneralEvents();
}

/* =========================
   INICIALIZAÇÃO
   ========================= */

function initActivities() {
  if (activitiesState.initialized) {
    refreshActivities();
    return;
  }

  const isActivitiesPage =
    document.body?.dataset.page === "activities" ||
    Boolean(
      select(
        [
          ".activities-page",
          "[data-activities-page]",
          "[data-activities-table-body]",
          ".activities-table",
        ].join(","),
      ),
    );

  if (!isActivitiesPage) {
    return;
  }

  activitiesState.initialized = true;

  loadActivities();
  initFilterEvents();
  initGeneralEvents();
  initStorageSynchronization();
  initActivitiesObserver();

  renderActivities();

  emitActivitiesEvent("sesi:activities-ready", {
    activities: getActivities(),
  });
}

/* =========================
   API GLOBAL
   ========================= */

const SESIActivities = Object.freeze({
  config: ACTIVITIES_CONFIG,

  init: initActivities,
  refresh: refreshActivities,
  reset: resetActivities,
  render: renderActivities,

  getAll: getActivities,
  getById: getActivityById,
  getFiltered: getFilteredActivities,

  add: addActivity,
  update: updateActivity,
  remove: removeActivity,

  setStatusFilter,
  setSubjectFilter,
  setSearchQuery,
  clearFilters,

  selectFile: handleFileSelection,
  submit: submitActivity,

  open: openActivity,
  openEssay,
});

window.SESIActivities = SESIActivities;

/* =========================
   COMPATIBILIDADE
   ========================= */

window.submitActivity = submitActivity;
window.openActivity = openActivity;
window.openEssay = openEssay;

/* =========================
   EXECUÇÃO AUTOMÁTICA
   ========================= */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initActivities, {
    once: true,
  });
} else {
  initActivities();
}

/* =========================
   EXPORTAÇÕES
   ========================= */

export {
  ACTIVITIES_CONFIG,
  SESIActivities,
  initActivities,
  refreshActivities,
  resetActivities,
  renderActivities,
  getActivities,
  getActivityById,
  getFilteredActivities,
  addActivity,
  updateActivity,
  removeActivity,
  setStatusFilter,
  setSubjectFilter,
  setSearchQuery,
  clearFilters,
  handleFileSelection,
  submitActivity,
  openActivity,
  openEssay,
};
