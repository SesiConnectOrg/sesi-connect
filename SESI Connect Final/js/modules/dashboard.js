/* =========================================================
   SESI CONNECT
   Módulo da página inicial e visão geral
   ========================================================= */

"use strict";

/* =========================
   CONFIGURAÇÕES
   ========================= */

const DASHBOARD_CONFIG = Object.freeze({
  storageKey: "sesi-connect-dashboard-data",
  selectedLessonKey: "sesi-connect-selected-lesson",
  selectedMaterialKey: "sesi-connect-selected-material",

  automaticRefreshInterval: 60 * 1000,
  maximumActivities: 4,
  maximumMaterials: 4,
  maximumAnnouncements: 3,
});

/* =========================
   DADOS DEMONSTRATIVOS
   ========================= */

const DEFAULT_DASHBOARD_DATA = Object.freeze({
  statistics: {
    attendance: 94,
    averageGrade: 8.4,
    completedActivities: 18,
    studyHours: 32,
  },

 nextLessons: [
    {
        id: "dashboard-lesson-math",
        subject: "Matemática",
        title: "Funções do segundo grau",
    },
    {
        id: "dashboard-lesson-portuguese",
        subject: "Língua Portuguesa",
        title: "Estratégias de argumentação",
    }
  ],

  activities: [
    {
      id: "dashboard-activity-math",
      title: "Lista de exercícios — Funções",
      subject: "Matemática",
      subjectSlug: "math",
      deadline: createRelativeDate(1, 23, 59),
      status: "pending",
      progress: 0,
    },

    {
      id: "dashboard-activity-essay",
      title: "Redação sobre inclusão social",
      subject: "Língua Portuguesa",
      subjectSlug: "portuguese",
      deadline: createRelativeDate(3, 23, 59),
      status: "progress",
      progress: 35,
    },

    {
      id: "dashboard-activity-history",
      title: "Relatório — Revolução Industrial",
      subject: "História",
      subjectSlug: "history",
      deadline: createRelativeDate(5, 18, 0),
      status: "pending",
      progress: 0,
    },
  ],

  materials: [
    {
      id: "dashboard-material-math",
      title: "Resumo de funções quadráticas",
      subject: "Matemática",
      type: "pdf",
      size: "2,4 MB",
      addedAt: createRelativeDate(-1, 10, 30),
    },

    {
      id: "dashboard-material-history",
      title: "Revolução Industrial — Slides",
      subject: "História",
      type: "powerpoint",
      size: "5,8 MB",
      addedAt: createRelativeDate(-2, 14, 20),
    },

    {
      id: "dashboard-material-physics",
      title: "Movimento uniforme",
      subject: "Física",
      type: "document",
      size: "1,2 MB",
      addedAt: createRelativeDate(-3, 9, 0),
    },
  ],

  announcements: [
    {
      id: "announcement-school-event",
      title: "Feira de Ciências",
      message: "As inscrições para a Feira de Ciências estão abertas.",
      type: "info",
      route: "dashboard",
      createdAt: createRelativeDate(-1, 8, 0),
    },

    {
      id: "announcement-essay",
      title: "Oficina de redação",
      message: "A oficina de redação acontecerá nesta sexta-feira.",
      type: "warning",
      route: "activities",
      createdAt: createRelativeDate(-2, 15, 30),
    },
  ],
});

/* =========================
   ESTADO
   ========================= */

const dashboardState = {
  initialized: false,
  data: null,
  refreshTimer: null,
  lastUpdatedAt: null,
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

function emitDashboardEvent(name, detail = {}) {
  document.dispatchEvent(
    new CustomEvent(name, {
      bubbles: true,
      detail,
    }),
  );
}

function createRelativeDate(dayOffset, hour = 0, minute = 0) {
  const date = new Date();

  date.setDate(date.getDate() + dayOffset);

  date.setHours(hour, minute, 0, 0);

  return date.toISOString();
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function isValidDate(value) {
  return Boolean(value && !Number.isNaN(new Date(value).getTime()));
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

function normalizeDashboardData(data = {}) {
  const defaultData = cloneData(DEFAULT_DASHBOARD_DATA);

  return {
    statistics: {
      attendance: normalizeNumber(
        data.statistics?.attendance,
        defaultData.statistics.attendance,
      ),

      averageGrade: normalizeNumber(
        data.statistics?.averageGrade,
        defaultData.statistics.averageGrade,
      ),

      completedActivities: normalizeNumber(
        data.statistics?.completedActivities,
        defaultData.statistics.completedActivities,
      ),

      studyHours: normalizeNumber(
        data.statistics?.studyHours,
        defaultData.statistics.studyHours,
      ),
    },

    nextLesson: normalizeLesson(data.nextLesson || defaultData.nextLesson),

    activities: Array.isArray(data.activities)
      ? data.activities.map(normalizeActivity)
      : defaultData.activities.map(normalizeActivity),

    materials: Array.isArray(data.materials)
      ? data.materials.map(normalizeMaterial)
      : defaultData.materials.map(normalizeMaterial),

    announcements: Array.isArray(data.announcements)
      ? data.announcements.map(normalizeAnnouncement)
      : defaultData.announcements.map(normalizeAnnouncement),
  };
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function normalizeLesson(lesson = {}) {
  return {
    id: String(lesson.id || "dashboard-lesson"),

    subject: String(lesson.subject || "Disciplina"),

    title: String(lesson.title || "Próxima aula"),

    teacher: String(lesson.teacher || "Professor não informado"),

    room: String(lesson.room || "Sala não informada"),

    startAt: isValidDate(lesson.startAt)
      ? lesson.startAt
      : createRelativeDate(0, 14, 0),

    endAt: isValidDate(lesson.endAt) ? lesson.endAt : null,

    status: String(lesson.status || "scheduled"),
  };
}

function normalizeActivity(activity = {}) {
  return {
    id: String(activity.id || `activity-${Date.now()}`),

    title: String(activity.title || "Atividade"),

    subject: String(activity.subject || "Geral"),

    subjectSlug: String(activity.subjectSlug || "general")
      .trim()
      .toLowerCase(),

    deadline: isValidDate(activity.deadline)
      ? activity.deadline
      : createRelativeDate(7, 23, 59),

    status: String(activity.status || "pending"),

    progress: Math.min(100, Math.max(0, normalizeNumber(activity.progress, 0))),
  };
}

function normalizeMaterial(material = {}) {
  return {
    id: String(material.id || `material-${Date.now()}`),

    title: String(material.title || "Material didático"),

    subject: String(material.subject || "Geral"),

    type: String(material.type || "document"),

    size: String(material.size || "Tamanho não informado"),

    addedAt: isValidDate(material.addedAt)
      ? material.addedAt
      : new Date().toISOString(),

    url: material.url ? String(material.url) : null,
  };
}

function normalizeAnnouncement(announcement = {}) {
  return {
    id: String(announcement.id || `announcement-${Date.now()}`),

    title: String(announcement.title || "Comunicado"),

    message: String(announcement.message || ""),

    type: String(announcement.type || "info"),

    route: announcement.route ? String(announcement.route) : null,

    createdAt: isValidDate(announcement.createdAt)
      ? announcement.createdAt
      : new Date().toISOString(),
  };
}

/* =========================
   CARREGAMENTO
   ========================= */

function loadDashboardData() {
  const storedData = readStorage(DASHBOARD_CONFIG.storageKey);

  dashboardState.data = normalizeDashboardData(
    storedData || DEFAULT_DASHBOARD_DATA,
  );

  if (!storedData) {
    saveDashboardData();
  }

  synchronizeExternalData();

  return getDashboardData();
}

function saveDashboardData() {
  return writeStorage(DASHBOARD_CONFIG.storageKey, dashboardState.data);
}

function getDashboardData() {
  return dashboardState.data ? cloneData(dashboardState.data) : null;
}

/* =========================
   SINCRONIZAÇÃO COM MÓDULOS
   ========================= */

function synchronizeExternalData() {
  if (!dashboardState.data) {
    return;
  }

  synchronizeActivities();
  synchronizeCalendar();
}

function synchronizeActivities() {
  let activities = [];

  if (
    window.SESIActivities &&
    typeof window.SESIActivities.getAll === "function"
  ) {
    activities = window.SESIActivities.getAll();
  } else {
    const storedActivities = readStorage("sesi-connect-activities", []);

    activities = Array.isArray(storedActivities) ? storedActivities : [];
  }

  if (activities.length === 0) {
    return;
  }

  const activeActivities = activities
    .filter((activity) => activity.status !== "completed")
    .sort(
      (first, second) =>
        new Date(first.deadline).getTime() -
        new Date(second.deadline).getTime(),
    )
    .slice(0, DASHBOARD_CONFIG.maximumActivities)
    .map(normalizeActivity);

  dashboardState.data.activities = activeActivities;

  dashboardState.data.statistics.completedActivities = activities.filter(
    (activity) => activity.status === "completed",
  ).length;
}

function synchronizeCalendar() {
  if (
    !window.SESICalendar ||
    typeof window.SESICalendar.getUpcoming !== "function"
  ) {
    return;
  }

  const events = window.SESICalendar.getUpcoming(10);

  const nextLessonEvent = events.find((event) => event.type === "lesson");

  if (!nextLessonEvent) {
    return;
  }

  dashboardState.data.nextLesson = normalizeLesson({
    id: nextLessonEvent.id,
    subject: nextLessonEvent.subject || "Aula",
    title: nextLessonEvent.title,
    teacher: nextLessonEvent.teacher,
    room: nextLessonEvent.location,
    startAt: nextLessonEvent.date,
    endAt: nextLessonEvent.endDate,
    status: "scheduled",
  });
}

/* =========================
   USUÁRIO
   ========================= */

function getCurrentUser() {
  if (window.SESIAuth && typeof window.SESIAuth.getCurrentUser === "function") {
    return window.SESIAuth.getCurrentUser() || null;
  }

  if (
    window.SESIConnect &&
    typeof window.SESIConnect.getSession === "function"
  ) {
    return window.SESIConnect.getSession()?.user || null;
  }

  return null;
}

function getFirstName() {
  const user = getCurrentUser();

  const fullName = user?.name || "Estudante";

  return fullName.trim().split(/\s+/)[0];
}

/* =========================
   SAUDAÇÃO
   ========================= */

function getGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) {
    return "Bom dia";
  }

  if (hour < 18) {
    return "Boa tarde";
  }

  return "Boa noite";
}

function renderGreeting() {
  const greeting = `${getGreeting()}, ${getFirstName()}!`;

  selectAll(
    ["[data-dashboard-greeting]", ".dashboard-greeting"].join(","),
  ).forEach((element) => {
    element.textContent = greeting;
  });

  selectAll("[data-dashboard-date]").forEach((element) => {
    element.textContent = formatLongDate(new Date());
  });
}

/* =========================
   FORMATAÇÃO DE DATAS
   ========================= */

function formatLongDate(dateValue) {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(dateValue));

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatShortDate(dateValue) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(dateValue));
}

function formatTime(dateValue) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function formatRelativeTime(dateValue) {
  const date = new Date(dateValue);

  const difference = date.getTime() - Date.now();

  const absoluteDifference = Math.abs(difference);

  const minutes = Math.floor(absoluteDifference / (60 * 1000));

  if (minutes < 1) {
    return "Agora";
  }

  if (minutes < 60) {
    return difference >= 0 ? `Em ${minutes} min` : `${minutes} min atrás`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return difference >= 0 ? `Em ${hours} h` : `${hours} h atrás`;
  }

  const days = Math.floor(hours / 24);

  return difference >= 0
    ? `Em ${days} ${days === 1 ? "dia" : "dias"}`
    : `${days} ${days === 1 ? "dia atrás" : "dias atrás"}`;
}

/* =========================
   ESTATÍSTICAS
   ========================= */

function getDashboardStatistics() {
  const statistics = {
    ...dashboardState.data.statistics,
  };

  if (
    window.SESINotifications &&
    typeof window.SESINotifications.getUnreadCount === "function"
  ) {
    statistics.unreadNotifications = window.SESINotifications.getUnreadCount();
  }

  statistics.pendingActivities = dashboardState.data.activities.filter(
    (activity) => activity.status !== "completed",
  ).length;

  return statistics;
}

function renderStatistics() {
  const statistics = getDashboardStatistics();

  const values = {
    attendance: `${statistics.attendance}%`,

    averageGrade: Number(statistics.averageGrade).toFixed(1),

    completedActivities: String(statistics.completedActivities),

    studyHours: `${statistics.studyHours}h`,

    pendingActivities: String(statistics.pendingActivities),

    unreadNotifications: String(statistics.unreadNotifications || 0),
  };

  Object.entries(values).forEach(([name, value]) => {
    selectAll(`[data-dashboard-stat="${name}"]`).forEach((element) => {
      element.textContent = value;
    });
  });

  renderProgressValue("attendance", statistics.attendance);

  renderProgressValue("averageGrade", statistics.averageGrade * 10);
}

function renderProgressValue(name, value) {
  const percentage = Math.min(100, Math.max(0, Number(value) || 0));

  selectAll(`[data-dashboard-progress="${name}"]`).forEach((element) => {
    element.style.width = `${percentage}%`;

    element.style.setProperty("--dashboard-progress", `${percentage}%`);

    element.setAttribute("aria-valuenow", String(percentage));
  });
}

/* =========================
   PRÓXIMA AULA
   ========================= */

function renderNextLesson() {
  const containers = selectAll(
    ["[data-dashboard-next-lesson]", ".dashboard-next-lesson"].join(","),
  );

  if (containers.length === 0) {
    return;
  }

  const lesson = dashboardState.data.nextLesson;

  containers.forEach((container) => {
    container.innerHTML = "";

    if (!lesson) {
      container.appendChild(createEmptyMessage("Nenhuma aula agendada."));

      return;
    }

    container.appendChild(createNextLessonContent(lesson));
  });
}

function createNextLessonContent(lesson) {
  const wrapper = createElement("div", "dashboard-next-class");

  const iconContainer = createElement("div", "dashboard-next-class-icon");

  iconContainer.appendChild(createIcon("fa-book-open"));

  const content = createElement("div", "dashboard-next-class-content");

  const subject = createElement(
    "span",
    "dashboard-next-class-subject",
    lesson.subject,
  );

  const title = createElement("h3", "dashboard-next-class-title", lesson.title);

  const teacher = createElement(
    "p",
    "dashboard-next-class-teacher",
    lesson.teacher,
  );

  const metadata = createElement("div", "dashboard-next-class-meta");

  metadata.append(
    createMetaItem(
      "fa-clock",
      `${formatTime(lesson.startAt)}${
        lesson.endAt ? ` – ${formatTime(lesson.endAt)}` : ""
      }`,
    ),

    createMetaItem("fa-location-dot", lesson.room),

    createMetaItem("fa-hourglass-half", formatRelativeTime(lesson.startAt)),
  );

  const button = createElement(
    "button",
    "btn-primary dashboard-next-class-button",
  );

  button.type = "button";

  button.append(
    createIcon("fa-circle-play"),
    document.createTextNode("Abrir aula"),
  );

  button.addEventListener("click", () => openLesson(lesson));

  content.append(subject, title, teacher, metadata, button);

  wrapper.append(iconContainer, content);

  return wrapper;
}

/* =========================
   ATIVIDADES
   ========================= */

function renderActivities() {
  const containers = selectAll(
    ["[data-dashboard-activities]", ".dashboard-activities-list"].join(","),
  );

  if (containers.length === 0) {
    return;
  }

  const activities = dashboardState.data.activities.slice(
    0,
    DASHBOARD_CONFIG.maximumActivities,
  );

  containers.forEach((container) => {
    container.innerHTML = "";

    if (activities.length === 0) {
      container.appendChild(createEmptyMessage("Nenhuma atividade pendente."));

      return;
    }

    const fragment = document.createDocumentFragment();

    activities.forEach((activity) => {
      fragment.appendChild(createActivityElement(activity));
    });

    container.appendChild(fragment);
  });
}

function createActivityElement(activity) {
  const item = createElement("article", "dashboard-activity-item");

  const icon = createElement(
    "div",
    [
      "dashboard-activity-icon",
      `dashboard-activity-icon--${activity.subjectSlug}`,
    ].join(" "),
  );

  icon.appendChild(createIcon(getSubjectIcon(activity.subjectSlug)));

  const content = createElement("div", "dashboard-activity-content");

  const title = createElement(
    "button",
    "dashboard-activity-title",
    activity.title,
  );

  title.type = "button";

  title.addEventListener("click", () => {
    navigateTo(
      activity.subjectSlug === "portuguese" &&
        activity.title.toLowerCase().includes("redação")
        ? "essay"
        : "activities",
    );
  });

  const subject = createElement(
    "span",
    "dashboard-activity-subject",
    activity.subject,
  );

  const deadline = createElement("span", "dashboard-activity-deadline");

  deadline.append(
    createIcon("fa-clock"),
    document.createTextNode(
      `${formatShortDate(activity.deadline)} — ${formatRelativeTime(
        activity.deadline,
      )}`,
    ),
  );

  content.append(title, subject, deadline);

  const status = createElement(
    "span",
    ["activity-status", `activity-status--${activity.status}`].join(" "),
    getActivityStatusLabel(activity.status),
  );

  item.append(icon, content, status);

  return item;
}

function getActivityStatusLabel(status) {
  const labels = {
    pending: "Pendente",
    progress: "Em andamento",
    completed: "Concluída",
    late: "Atrasada",
  };

  return labels[status] || "Pendente";
}

/* =========================
   MATERIAIS RECENTES
   ========================= */

function renderMaterials() {
  const containers = selectAll(
    [
      "[data-dashboard-materials]",
      ".dashboard-materials-list",
      ".recent-materials-list",
    ].join(","),
  );

  if (containers.length === 0) {
    return;
  }

  const materials = dashboardState.data.materials
    .sort(
      (first, second) =>
        new Date(second.addedAt).getTime() - new Date(first.addedAt).getTime(),
    )
    .slice(0, DASHBOARD_CONFIG.maximumMaterials);

  containers.forEach((container) => {
    container.innerHTML = "";

    if (materials.length === 0) {
      container.appendChild(createEmptyMessage("Nenhum material recente."));

      return;
    }

    const fragment = document.createDocumentFragment();

    materials.forEach((material) => {
      fragment.appendChild(createMaterialElement(material));
    });

    container.appendChild(fragment);
  });
}

function createMaterialElement(material) {
  const item = createElement("article", "dashboard-material-item");

  const icon = createElement(
    "div",
    [
      "dashboard-material-icon",
      `dashboard-material-icon--${material.type}`,
    ].join(" "),
  );

  icon.appendChild(createIcon(getMaterialIcon(material.type)));

  const content = createElement("div", "dashboard-material-content");

  const title = createElement(
    "button",
    "dashboard-material-title",
    material.title,
  );

  title.type = "button";

  title.addEventListener("click", () => openMaterial(material));

  const metadata = createElement(
    "span",
    "dashboard-material-meta",
    `${material.subject} • ${material.size}`,
  );

  content.append(title, metadata);

  const time = createElement(
    "span",
    "dashboard-material-time",
    formatRelativeTime(material.addedAt),
  );

  item.append(icon, content, time);

  return item;
}

/* =========================
   COMUNICADOS
   ========================= */

function renderAnnouncements() {
  const containers = selectAll(
    ["[data-dashboard-announcements]", ".dashboard-announcements"].join(","),
  );

  if (containers.length === 0) {
    return;
  }

  const announcements = dashboardState.data.announcements.slice(
    0,
    DASHBOARD_CONFIG.maximumAnnouncements,
  );

  containers.forEach((container) => {
    container.innerHTML = "";

    if (announcements.length === 0) {
      container.appendChild(
        createEmptyMessage("Nenhum comunicado disponível."),
      );

      return;
    }

    const fragment = document.createDocumentFragment();

    announcements.forEach((announcement) => {
      fragment.appendChild(createAnnouncementElement(announcement));
    });

    container.appendChild(fragment);
  });
}

function createAnnouncementElement(announcement) {
  const item = createElement(
    "article",
    ["announcement-item", `announcement-item--${announcement.type}`].join(" "),
  );

  const icon = createElement("div", "announcement-icon");

  icon.appendChild(createIcon(getAnnouncementIcon(announcement.type)));

  const content = createElement("div", "announcement-content");

  const title = createElement(
    "strong",
    "announcement-title",
    announcement.title,
  );

  const message = createElement(
    "p",
    "announcement-message",
    announcement.message,
  );

  const time = createElement(
    "span",
    "announcement-time",
    formatRelativeTime(announcement.createdAt),
  );

  content.append(title, message, time);

  item.append(icon, content);

  if (announcement.route) {
    item.tabIndex = 0;
    item.setAttribute("role", "button");

    item.addEventListener("click", () => navigateTo(announcement.route));

    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();

        navigateTo(announcement.route);
      }
    });
  }

  return item;
}

/* =========================
   CONTADORES EXTERNOS
   ========================= */

function updateExternalCounters() {
  selectAll("[data-dashboard-activity-count]").forEach((element) => {
    element.textContent = String(dashboardState.data.activities.length);
  });

  selectAll("[data-dashboard-material-count]").forEach((element) => {
    element.textContent = String(dashboardState.data.materials.length);
  });

  selectAll("[data-dashboard-announcement-count]").forEach((element) => {
    element.textContent = String(dashboardState.data.announcements.length);
  });
}

/* =========================
   ÍCONES
   ========================= */

function getSubjectIcon(subject) {
  const icons = {
    math: "fa-calculator",
    portuguese: "fa-book",
    physics: "fa-atom",
    history: "fa-landmark",
    chemistry: "fa-flask",
    biology: "fa-leaf",
    geography: "fa-earth-americas",
  };

  return icons[subject] || "fa-book-open";
}

function getMaterialIcon(type) {
  const icons = {
    pdf: "fa-file-pdf",
    powerpoint: "fa-file-powerpoint",
    slides: "fa-file-powerpoint",
    word: "fa-file-word",
    document: "fa-file-lines",
    video: "fa-file-video",
    image: "fa-file-image",
  };

  return icons[type] || "fa-file";
}

function getAnnouncementIcon(type) {
  const icons = {
    info: "fa-circle-info",
    warning: "fa-triangle-exclamation",
    success: "fa-circle-check",
    error: "fa-circle-xmark",
  };

  return icons[type] || icons.info;
}

/* =========================
   METADADOS
   ========================= */

function createMetaItem(iconClass, text) {
  const item = createElement("span", "dashboard-meta-item");

  item.append(createIcon(iconClass), document.createTextNode(text));

  return item;
}

function createEmptyMessage(message) {
  const container = createElement("div", "dashboard-empty-message");

  container.append(
    createIcon("fa-circle-info"),
    createElement("span", "", message),
  );

  return container;
}

/* =========================
   ABERTURA DA AULA
   ========================= */

function openLesson(lesson) {
  try {
    sessionStorage.setItem(
      DASHBOARD_CONFIG.selectedLessonKey,
      JSON.stringify({
        ...lesson,
        selectedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    console.warn("[SESI Connect] Não foi possível selecionar a aula.", error);
  }

  navigateTo("lesson");
}

/* =========================
   ABERTURA DO MATERIAL
   ========================= */

function openMaterial(material) {
  try {
    sessionStorage.setItem(
      DASHBOARD_CONFIG.selectedMaterialKey,
      JSON.stringify({
        ...material,
        selectedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    console.warn(
      "[SESI Connect] Não foi possível selecionar o material.",
      error,
    );
  }

  if (material.url) {
    window.open(material.url, "_blank", "noopener,noreferrer");

    return;
  }

  navigateTo("materials");
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
   ATUALIZAÇÃO DOS DADOS
   ========================= */

function updateDashboardData(updates = {}) {
  dashboardState.data = normalizeDashboardData({
    ...dashboardState.data,
    ...updates,

    statistics: {
      ...dashboardState.data.statistics,
      ...updates.statistics,
    },
  });

  saveDashboardData();
  renderDashboard();

  emitDashboardEvent("sesi:dashboard-updated", {
    data: getDashboardData(),
  });

  return getDashboardData();
}

function addAnnouncement(announcement) {
  const normalizedAnnouncement = normalizeAnnouncement(announcement);

  dashboardState.data.announcements.unshift(normalizedAnnouncement);

  dashboardState.data.announcements = dashboardState.data.announcements.slice(
    0,
    20,
  );

  saveDashboardData();
  renderAnnouncements();
  updateExternalCounters();

  return {
    ...normalizedAnnouncement,
  };
}

function removeAnnouncement(announcementId) {
  const previousLength = dashboardState.data.announcements.length;

  dashboardState.data.announcements = dashboardState.data.announcements.filter(
    (announcement) => announcement.id !== announcementId,
  );

  if (previousLength === dashboardState.data.announcements.length) {
    return false;
  }

  saveDashboardData();
  renderAnnouncements();
  updateExternalCounters();

  return true;
}

/* =========================
   RENDERIZAÇÃO
   ========================= */

function renderDashboard() {
  if (!dashboardState.data) {
    return;
  }

  synchronizeExternalData();

  renderGreeting();
  renderStatistics();
  renderNextLesson();
  renderActivities();
  renderMaterials();
  renderAnnouncements();
  updateExternalCounters();
  updateLastUpdatedTime();

  emitDashboardEvent("sesi:dashboard-rendered", {
    data: getDashboardData(),
  });
}

function updateLastUpdatedTime() {
  dashboardState.lastUpdatedAt = new Date();

  selectAll("[data-dashboard-last-update]").forEach((element) => {
    element.textContent = `Atualizado às ${formatTime(
      dashboardState.lastUpdatedAt,
    )}`;
  });
}

/* =========================
   BOTÕES
   ========================= */

function initDashboardButtons() {
  selectAll("[data-dashboard-refresh]").forEach((button) => {
    if (button.dataset.dashboardInitialized === "true") {
      return;
    }

    button.dataset.dashboardInitialized = "true";

    button.addEventListener("click", async () => {
      await refreshDashboard(button);
    });
  });

  selectAll("[data-dashboard-route]").forEach((button) => {
    if (button.dataset.dashboardInitialized === "true") {
      return;
    }

    button.dataset.dashboardInitialized = "true";

    button.addEventListener("click", () => {
      navigateTo(button.dataset.dashboardRoute);
    });
  });
}

/* =========================
   ATUALIZAÇÃO MANUAL
   ========================= */

async function refreshDashboard(button = null) {
  setButtonLoading(button, true, "Atualizando...");

  await wait(350);

  synchronizeExternalData();
  renderDashboard();

  setButtonLoading(button, false);

  showMessage("Painel atualizado.", "success");

  return getDashboardData();
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
   ATUALIZAÇÃO AUTOMÁTICA
   ========================= */

function startAutomaticRefresh() {
  stopAutomaticRefresh();

  dashboardState.refreshTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") {
      renderDashboard();
    }
  }, DASHBOARD_CONFIG.automaticRefreshInterval);
}

function stopAutomaticRefresh() {
  if (dashboardState.refreshTimer) {
    window.clearInterval(dashboardState.refreshTimer);

    dashboardState.refreshTimer = null;
  }
}

/* =========================
   VISIBILIDADE DA PÁGINA
   ========================= */

function initVisibilityHandling() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      renderDashboard();
      startAutomaticRefresh();
    } else {
      stopAutomaticRefresh();
    }
  });
}

/* =========================
   EVENTOS DE OUTROS MÓDULOS
   ========================= */

function initModuleEvents() {
  const refreshEvents = [
    "sesi:activity-submitted",
    "sesi:activity-added",
    "sesi:activity-updated",
    "sesi:calendar-event-added",
    "sesi:calendar-event-updated",
    "sesi:notification-added",
    "sesi:notifications-read-all",
    "sesi:user-updated",
  ];

  refreshEvents.forEach((eventName) => {
    document.addEventListener(eventName, () => {
      synchronizeExternalData();
      renderDashboard();
    });
  });
}

/* =========================
   SINCRONIZAÇÃO ENTRE ABAS
   ========================= */

function initStorageSynchronization() {
  const relevantKeys = [
    DASHBOARD_CONFIG.storageKey,
    "sesi-connect-activities",
    "sesi-connect-calendar-events",
    "sesi-connect-notifications-data",
  ];

  window.addEventListener("storage", (event) => {
    if (!relevantKeys.includes(event.key)) {
      return;
    }

    loadDashboardData();
    renderDashboard();
  });
}

/* =========================
   OBSERVADOR DO DOM
   ========================= */

function initDashboardObserver() {
  const observer = new MutationObserver((mutations) => {
    const containsNewNodes = mutations.some(
      (mutation) => mutation.addedNodes.length > 0,
    );

    if (!containsNewNodes) {
      return;
    }

    initDashboardButtons();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
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
      id: `dashboard-toast-${Date.now()}`,
      title:
        type === "success"
          ? "Sucesso"
          : type === "error"
            ? "Erro"
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
   RESTAURAÇÃO
   ========================= */

function resetDashboard() {
  dashboardState.data = normalizeDashboardData(DEFAULT_DASHBOARD_DATA);

  saveDashboardData();
  renderDashboard();

  showMessage("Painel restaurado.", "success");

  emitDashboardEvent("sesi:dashboard-reset");
}

/* =========================
   INICIALIZAÇÃO
   ========================= */

function initDashboard() {
  if (dashboardState.initialized) {
    renderDashboard();
    return;
  }

  const isDashboardPage =
    document.body?.dataset.page === "dashboard" ||
    Boolean(
      select(
        [
          ".dashboard-page",
          "[data-dashboard-page]",
          ".dash-cards",
          ".dashboard-summary",
        ].join(","),
      ),
    );

  if (!isDashboardPage) {
    return;
  }

  dashboardState.initialized = true;

  loadDashboardData();

  initDashboardButtons();
  initVisibilityHandling();
  initModuleEvents();
  initStorageSynchronization();
  initDashboardObserver();

  renderDashboard();
  startAutomaticRefresh();

  emitDashboardEvent("sesi:dashboard-ready", {
    data: getDashboardData(),
  });
}

/* =========================
   API GLOBAL
   ========================= */

const SESIDashboard = Object.freeze({
  config: DASHBOARD_CONFIG,

  init: initDashboard,
  refresh: refreshDashboard,
  render: renderDashboard,
  reset: resetDashboard,

  getData: getDashboardData,
  update: updateDashboardData,

  addAnnouncement,
  removeAnnouncement,

  openLesson,
  openMaterial,

  startAutomaticRefresh,
  stopAutomaticRefresh,
});

window.SESIDashboard = SESIDashboard;

/* =========================
   EXECUÇÃO AUTOMÁTICA
   ========================= */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDashboard, {
    once: true,
  });
} else {
  initDashboard();
}

/* =========================
   EXPORTAÇÕES
   ========================= */

export {
  DASHBOARD_CONFIG,
  SESIDashboard,
  initDashboard,
  refreshDashboard,
  renderDashboard,
  resetDashboard,
  getDashboardData,
  updateDashboardData,
  addAnnouncement,
  removeAnnouncement,
  openLesson,
  openMaterial,
  startAutomaticRefresh,
  stopAutomaticRefresh,
};
