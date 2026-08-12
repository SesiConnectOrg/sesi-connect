/* =========================================================
   SESI CONNECT
   Visualização de aulas, progresso, anotações e materiais
   ========================================================= */

"use strict";

/* =========================
   CONFIGURAÇÕES
   ========================= */

const LESSON_CONFIG = Object.freeze({
  selectedLessonKey: "sesi-connect-selected-lesson",

  progressKey: "sesi-connect-lesson-progress",

  notesKey: "sesi-connect-lesson-notes",

  completedKey: "sesi-connect-completed-lessons",

  notesAutosaveDelay: 700,
  progressSaveInterval: 15 * 1000,

  defaultDuration: 45 * 60,
  minimumCompletionProgress: 90,

  allowedVideoHosts: [
    "youtube.com",
    "www.youtube.com",
    "youtu.be",
    "www.youtu.be",
    "vimeo.com",
    "www.vimeo.com",
    "player.vimeo.com",
  ],
});

/* =========================
   AULA DEMONSTRATIVA
   ========================= */

const DEFAULT_LESSON = Object.freeze({
  id: "lesson-math-functions",

  subject: "Matemática",

  subjectSlug: "math",

  title: "Funções do segundo grau",

  teacher: "Prof. Ricardo Alves",

  description:
    "Nesta aula, você aprenderá os principais conceitos das funções do segundo grau, a representação gráfica da parábola e as formas de encontrar suas raízes.",

  room: "Sala 12",

  date: createRelativeDate(0, 14, 0),

  duration: 45 * 60,

  videoURL: "",

  objectives: [
    "Reconhecer a estrutura de uma função do segundo grau.",
    "Identificar os coeficientes a, b e c.",
    "Calcular o discriminante e as raízes da função.",
    "Interpretar o gráfico de uma parábola.",
  ],

  topics: [
    {
      id: "topic-introduction",
      title: "Introdução às funções quadráticas",
      duration: 6 * 60,
    },
    {
      id: "topic-coefficients",
      title: "Coeficientes a, b e c",
      duration: 8 * 60,
    },
    {
      id: "topic-discriminant",
      title: "Discriminante e fórmula de Bhaskara",
      duration: 14 * 60,
    },
    {
      id: "topic-graph",
      title: "Gráfico e vértice da parábola",
      duration: 12 * 60,
    },
    {
      id: "topic-review",
      title: "Revisão e exercícios",
      duration: 5 * 60,
    },
  ],

  resources: [
    {
      id: "resource-summary",
      title: "Resumo da aula",
      type: "pdf",
      size: "2,4 MB",
      url: null,
    },
    {
      id: "resource-exercises",
      title: "Lista de exercícios",
      type: "document",
      size: "780 KB",
      url: null,
    },
    {
      id: "resource-slides",
      title: "Apresentação da aula",
      type: "powerpoint",
      size: "4,1 MB",
      url: null,
    },
  ],
});

/* =========================
   ESTADO
   ========================= */

const lessonState = {
  initialized: false,

  lesson: null,

  progress: {
    watchedSeconds: 0,
    percentage: 0,
    completed: false,
    startedAt: null,
    lastAccessedAt: null,
    completedAt: null,
  },

  notes: "",

  activeTab: "overview",

  notesTimer: null,
  progressTimer: null,
  studyTimer: null,

  studySessionActive: false,
  videoElement: null,

  lastSavedNotes: "",
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

function emitLessonEvent(name, detail = {}) {
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

function createRelativeDate(dayOffset, hour = 0, minute = 0) {
  const date = new Date();

  date.setDate(date.getDate() + dayOffset);

  date.setHours(hour, minute, 0, 0);

  return date.toISOString();
}

function createId(prefix = "lesson") {
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
   NORMALIZAÇÃO DA AULA
   ========================= */

function normalizeLesson(lesson = {}) {
  const duration = normalizePositiveNumber(
    lesson.duration,
    LESSON_CONFIG.defaultDuration,
  );

  const subject = String(lesson.subject || DEFAULT_LESSON.subject).trim();

  return {
    id: String(lesson.id || createId()),

    subject,

    subjectSlug: String(lesson.subjectSlug || createSubjectSlug(subject))
      .trim()
      .toLowerCase(),

    title: String(lesson.title || DEFAULT_LESSON.title).trim(),

    teacher: String(lesson.teacher || DEFAULT_LESSON.teacher).trim(),

    description: String(
      lesson.description || DEFAULT_LESSON.description,
    ).trim(),

    room: String(lesson.room || DEFAULT_LESSON.room).trim(),

    date: isValidDate(lesson.date || lesson.startAt)
      ? lesson.date || lesson.startAt
      : DEFAULT_LESSON.date,

    endAt: isValidDate(lesson.endAt) ? lesson.endAt : null,

    duration,

    videoURL: String(lesson.videoURL || lesson.videoUrl || "").trim(),

    objectives: Array.isArray(lesson.objectives)
      ? lesson.objectives
          .map((objective) => String(objective).trim())
          .filter(Boolean)
      : [...DEFAULT_LESSON.objectives],

    topics: Array.isArray(lesson.topics)
      ? lesson.topics.map(normalizeTopic)
      : DEFAULT_LESSON.topics.map(normalizeTopic),

    resources: Array.isArray(lesson.resources)
      ? lesson.resources.map(normalizeResource)
      : DEFAULT_LESSON.resources.map(normalizeResource),
  };
}

function normalizeTopic(topic = {}) {
  return {
    id: String(topic.id || createId("topic")),

    title: String(topic.title || "Tópico da aula").trim(),

    duration: normalizePositiveNumber(topic.duration, 5 * 60),

    completed: Boolean(topic.completed),
  };
}

function normalizeResource(resource = {}) {
  return {
    id: String(resource.id || createId("resource")),

    title: String(resource.title || "Material da aula").trim(),

    type: String(resource.type || "document")
      .trim()
      .toLowerCase(),

    size: String(resource.size || "Tamanho não informado").trim(),

    url: resource.url ? String(resource.url).trim() : null,
  };
}

function normalizePositiveNumber(value, fallback) {
  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function createSubjectSlug(subject) {
  const normalizedSubject = String(subject || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  const subjects = {
    matematica: "math",
    portugues: "portuguese",
    "lingua portuguesa": "portuguese",
    fisica: "physics",
    historia: "history",
    quimica: "chemistry",
    biologia: "biology",
    geografia: "geography",
  };

  return (
    subjects[normalizedSubject] ||
    normalizedSubject.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") ||
    "general"
  );
}

/* =========================
   CARREGAMENTO DA AULA
   ========================= */

function loadSelectedLesson() {
  const selectedLesson = readStorage(
    sessionStorage,
    LESSON_CONFIG.selectedLessonKey,
  );

  lessonState.lesson = normalizeLesson(selectedLesson || DEFAULT_LESSON);

  return cloneData(lessonState.lesson);
}

/* =========================
   PROGRESSO
   ========================= */

function getAllLessonProgress() {
  const progress = readStorage(localStorage, LESSON_CONFIG.progressKey, {});

  return progress && typeof progress === "object" && !Array.isArray(progress)
    ? progress
    : {};
}

function normalizeProgress(progress = {}, lesson) {
  const watchedSeconds = Math.min(
    lesson.duration,
    Math.max(0, Number(progress.watchedSeconds) || 0),
  );

  const calculatedPercentage =
    lesson.duration > 0 ? (watchedSeconds / lesson.duration) * 100 : 0;

  const percentage = Math.min(
    100,
    Math.max(
      Number(progress.percentage) || calculatedPercentage,
      calculatedPercentage,
    ),
  );

  return {
    watchedSeconds,

    percentage: Math.round(percentage),

    completed: Boolean(progress.completed),

    startedAt: isValidDate(progress.startedAt) ? progress.startedAt : null,

    lastAccessedAt: isValidDate(progress.lastAccessedAt)
      ? progress.lastAccessedAt
      : null,

    completedAt: isValidDate(progress.completedAt)
      ? progress.completedAt
      : null,
  };
}

function loadLessonProgress() {
  const lesson = lessonState.lesson;

  const allProgress = getAllLessonProgress();

  const storedProgress = allProgress[lesson.id] || {};

  lessonState.progress = normalizeProgress(storedProgress, lesson);

  if (!lessonState.progress.startedAt) {
    lessonState.progress.startedAt = new Date().toISOString();
  }

  lessonState.progress.lastAccessedAt = new Date().toISOString();

  saveLessonProgress();

  return cloneData(lessonState.progress);
}

function saveLessonProgress() {
  if (!lessonState.lesson) {
    return false;
  }

  const allProgress = getAllLessonProgress();

  lessonState.progress.lastAccessedAt = new Date().toISOString();

  allProgress[lessonState.lesson.id] = {
    ...lessonState.progress,
  };

  const saved = writeStorage(
    localStorage,
    LESSON_CONFIG.progressKey,
    allProgress,
  );

  if (saved) {
    updateCompletedLessons();
  }

  return saved;
}

function updateProgressFromSeconds(watchedSeconds, options = {}) {
  const { save = true, render = true } = options;

  if (!lessonState.lesson) {
    return;
  }

  const duration = lessonState.lesson.duration;

  const normalizedSeconds = Math.min(
    duration,
    Math.max(lessonState.progress.watchedSeconds, Number(watchedSeconds) || 0),
  );

  const percentage =
    duration > 0
      ? Math.min(100, Math.round((normalizedSeconds / duration) * 100))
      : 0;

  lessonState.progress.watchedSeconds = normalizedSeconds;

  lessonState.progress.percentage = percentage;

  if (
    percentage >= LESSON_CONFIG.minimumCompletionProgress &&
    !lessonState.progress.completed
  ) {
    markLessonAsCompleted({
      notify: false,
      render: false,
    });
  }

  if (save) {
    saveLessonProgress();
  }

  if (render) {
    renderProgress();
    renderTopics();
  }

  emitLessonEvent("sesi:lesson-progress", {
    lessonId: lessonState.lesson.id,

    progress: cloneData(lessonState.progress),
  });
}

function addWatchedSecond() {
  if (!lessonState.studySessionActive || lessonState.progress.completed) {
    return;
  }

  updateProgressFromSeconds(lessonState.progress.watchedSeconds + 1, {
    save: false,
    render: true,
  });
}

/* =========================
   AULA CONCLUÍDA
   ========================= */

function markLessonAsCompleted(options = {}) {
  const { notify = true, render = true } = options;

  if (!lessonState.lesson || lessonState.progress.completed) {
    return false;
  }

  const now = new Date().toISOString();

  lessonState.progress.completed = true;

  lessonState.progress.percentage = 100;

  lessonState.progress.watchedSeconds = lessonState.lesson.duration;

  lessonState.progress.completedAt = now;

  saveLessonProgress();

  stopStudySession();

  if (render) {
    renderProgress();
    renderTopics();
    applyCompletedState();
  }

  if (notify) {
    showMessage("Aula concluída com sucesso.", "success");

    createCompletionNotification();
  }

  emitLessonEvent("sesi:lesson-completed", {
    lesson: cloneData(lessonState.lesson),

    progress: cloneData(lessonState.progress),
  });

  return true;
}

function reopenLesson() {
  if (!lessonState.progress.completed) {
    return false;
  }

  if (!window.confirm("Deseja reabrir esta aula e continuar estudando?")) {
    return false;
  }

  lessonState.progress.completed = false;

  lessonState.progress.completedAt = null;

  lessonState.progress.percentage = Math.min(
    lessonState.progress.percentage,
    89,
  );

  lessonState.progress.watchedSeconds = Math.min(
    lessonState.progress.watchedSeconds,
    lessonState.lesson.duration * 0.89,
  );

  saveLessonProgress();
  renderProgress();
  renderTopics();
  applyCompletedState();

  showMessage("Aula reaberta.", "success");

  return true;
}

function updateCompletedLessons() {
  const completedLessons = readStorage(
    localStorage,
    LESSON_CONFIG.completedKey,
    [],
  );

  const list = Array.isArray(completedLessons) ? completedLessons : [];

  const lessonId = lessonState.lesson.id;

  const withoutCurrent = list.filter((item) => item.id !== lessonId);

  if (lessonState.progress.completed) {
    withoutCurrent.unshift({
      id: lessonId,

      title: lessonState.lesson.title,

      subject: lessonState.lesson.subject,

      completedAt: lessonState.progress.completedAt,
    });
  }

  writeStorage(localStorage, LESSON_CONFIG.completedKey, withoutCurrent);
}

/* =========================
   ANOTAÇÕES
   ========================= */

function getAllLessonNotes() {
  const notes = readStorage(localStorage, LESSON_CONFIG.notesKey, {});

  return notes && typeof notes === "object" && !Array.isArray(notes)
    ? notes
    : {};
}

function loadLessonNotes() {
  const allNotes = getAllLessonNotes();

  const storedNotes = allNotes[lessonState.lesson.id];

  lessonState.notes =
    typeof storedNotes === "string" ? storedNotes : storedNotes?.content || "";

  lessonState.lastSavedNotes = lessonState.notes;

  return lessonState.notes;
}

function saveLessonNotes(options = {}) {
  const { notify = true } = options;

  const textarea = getNotesTextarea();

  const content = textarea ? textarea.value : lessonState.notes;

  lessonState.notes = content;

  const allNotes = getAllLessonNotes();

  allNotes[lessonState.lesson.id] = {
    content,

    updatedAt: new Date().toISOString(),
  };

  const saved = writeStorage(localStorage, LESSON_CONFIG.notesKey, allNotes);

  if (!saved) {
    setNotesStatus("error", "Erro ao salvar");

    if (notify) {
      showMessage("Não foi possível salvar as anotações.", "error");
    }

    return false;
  }

  lessonState.lastSavedNotes = content;

  setNotesStatus("saved", `Salvo às ${formatTime(new Date())}`);

  if (notify) {
    showMessage("Anotações salvas.", "success");
  }

  emitLessonEvent("sesi:lesson-notes-saved", {
    lessonId: lessonState.lesson.id,

    notes: content,
  });

  return true;
}

function scheduleNotesSave() {
  window.clearTimeout(lessonState.notesTimer);

  setNotesStatus("pending", "Alterações não salvas");

  lessonState.notesTimer = window.setTimeout(() => {
    saveLessonNotes({
      notify: false,
    });
  }, LESSON_CONFIG.notesAutosaveDelay);
}

function clearLessonNotes() {
  const textarea = getNotesTextarea();

  if (!lessonState.notes.trim() && !textarea?.value.trim()) {
    showMessage("As anotações já estão vazias.", "info");

    return false;
  }

  if (!window.confirm("Deseja apagar todas as anotações desta aula?")) {
    return false;
  }

  lessonState.notes = "";

  if (textarea) {
    textarea.value = "";
  }

  saveLessonNotes({
    notify: false,
  });

  updateNotesCount();

  showMessage("Anotações removidas.", "success");

  return true;
}

function getNotesTextarea() {
  return (
    document.getElementById("lesson-notes") ||
    select(
      [
        "[data-lesson-notes]",
        ".lesson-notes-textarea",
        "textarea[name='lesson-notes']",
      ].join(","),
    )
  );
}

function setNotesStatus(status, message) {
  selectAll("[data-lesson-notes-status]").forEach((element) => {
    element.dataset.status = status;

    element.textContent = message;

    element.classList.remove("is-pending", "is-saved", "is-error");

    element.classList.add(`is-${status}`);
  });
}

function updateNotesCount() {
  const textarea = getNotesTextarea();

  const content = textarea?.value || lessonState.notes;

  const words = countWords(content);

  const characters = content.length;

  selectAll("[data-lesson-notes-words]").forEach((element) => {
    element.textContent = String(words);
  });

  selectAll("[data-lesson-notes-characters]").forEach((element) => {
    element.textContent = String(characters);
  });
}

function countWords(content) {
  const normalized = String(content || "").trim();

  return normalized ? normalized.split(/\s+/).filter(Boolean).length : 0;
}

/* =========================
   EXPORTAÇÃO DAS ANOTAÇÕES
   ========================= */

function downloadLessonNotes() {
  const content = getNotesTextarea()?.value || lessonState.notes;

  if (!content.trim()) {
    showMessage("Não há anotações para baixar.", "warning");

    return false;
  }

  const fileContent = [
    lessonState.lesson.title,
    lessonState.lesson.subject,
    lessonState.lesson.teacher,
    "",
    "ANOTAÇÕES",
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

  link.download = `${sanitizeFileName(lessonState.lesson.title)}-anotacoes.txt`;

  document.body.appendChild(link);

  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  showMessage("Anotações baixadas.", "success");

  return true;
}

function sanitizeFileName(value) {
  return String(value || "aula")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

/* =========================
   SESSÃO DE ESTUDO
   ========================= */

function startStudySession() {
  if (lessonState.progress.completed) {
    showMessage("Esta aula já foi concluída.", "info");

    return false;
  }

  lessonState.studySessionActive = true;

  document.body.classList.add("lesson-playing");

  startStudyTimer();

  updateStudyButtons();

  emitLessonEvent("sesi:lesson-study-started", {
    lessonId: lessonState.lesson.id,
  });

  return true;
}

function pauseStudySession() {
  lessonState.studySessionActive = false;

  document.body.classList.remove("lesson-playing");

  stopStudyTimer();
  saveLessonProgress();
  updateStudyButtons();

  emitLessonEvent("sesi:lesson-study-paused", {
    lessonId: lessonState.lesson.id,
  });

  return true;
}

function toggleStudySession() {
  if (lessonState.studySessionActive) {
    return pauseStudySession();
  }

  return startStudySession();
}

function stopStudySession() {
  lessonState.studySessionActive = false;

  document.body.classList.remove("lesson-playing");

  stopStudyTimer();
  updateStudyButtons();
}

function startStudyTimer() {
  stopStudyTimer();

  lessonState.studyTimer = window.setInterval(addWatchedSecond, 1000);
}

function stopStudyTimer() {
  if (lessonState.studyTimer) {
    window.clearInterval(lessonState.studyTimer);

    lessonState.studyTimer = null;
  }
}

function updateStudyButtons() {
  selectAll("[data-lesson-play]").forEach((button) => {
    const icon = select("i", button);

    const text = select("[data-lesson-play-text]", button);

    if (icon) {
      icon.className = lessonState.studySessionActive
        ? "fa-solid fa-pause"
        : "fa-solid fa-play";
    }

    if (text) {
      text.textContent = lessonState.studySessionActive
        ? "Pausar aula"
        : "Continuar aula";
    }

    button.setAttribute(
      "aria-label",
      lessonState.studySessionActive ? "Pausar aula" : "Iniciar aula",
    );
  });
}

/* =========================
   VÍDEO
   ========================= */

function getVideoContainer() {
  return (
    document.getElementById("lesson-video") ||
    select(
      ["[data-lesson-video]", ".lesson-video-container", ".lesson-player"].join(
        ",",
      ),
    )
  );
}

function initializeVideo() {
  const container = getVideoContainer();

  if (!container) {
    return;
  }

  const existingVideo = container.matches("video")
    ? container
    : select("video", container);

  if (existingVideo) {
    lessonState.videoElement = existingVideo;

    configureHTMLVideo(existingVideo);

    return;
  }

  if (lessonState.lesson.videoURL) {
    const embedURL = createEmbedVideoURL(lessonState.lesson.videoURL);

    if (embedURL) {
      renderEmbeddedVideo(container, embedURL);

      return;
    }
  }

  renderVideoPlaceholder(container);
}

function configureHTMLVideo(video) {
  if (lessonState.lesson.videoURL && !video.src) {
    video.src = lessonState.lesson.videoURL;
  }

  if (lessonState.progress.watchedSeconds > 0) {
    video.addEventListener(
      "loadedmetadata",
      () => {
        video.currentTime = Math.min(
          lessonState.progress.watchedSeconds,
          video.duration || 0,
        );
      },
      {
        once: true,
      },
    );
  }

  video.addEventListener("play", startStudySession);

  video.addEventListener("pause", pauseStudySession);

  video.addEventListener("timeupdate", () => {
    updateProgressFromSeconds(video.currentTime, {
      save: false,
      render: true,
    });
  });

  video.addEventListener("ended", () => {
    markLessonAsCompleted();
  });
}

function createEmbedVideoURL(rawURL) {
  try {
    const url = new URL(rawURL);

    const host = url.hostname.toLowerCase();

    const allowedHost = LESSON_CONFIG.allowedVideoHosts.includes(host);

    if (!allowedHost) {
      return null;
    }

    if (host.includes("youtube.com")) {
      const videoId =
        url.searchParams.get("v") || getYouTubeEmbedId(url.pathname);

      return videoId
        ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`
        : null;
    }

    if (host.includes("youtu.be")) {
      const videoId = url.pathname.replace(/^\/+/, "").split("/")[0];

      return videoId
        ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`
        : null;
    }

    if (host.includes("vimeo.com")) {
      const videoId = url.pathname.split("/").filter(Boolean).pop();

      return videoId
        ? `https://player.vimeo.com/video/${encodeURIComponent(videoId)}`
        : null;
    }

    return null;
  } catch {
    return null;
  }
}

function getYouTubeEmbedId(pathname) {
  const parts = pathname.split("/").filter(Boolean);

  const embedIndex = parts.indexOf("embed");

  if (embedIndex !== -1 && parts[embedIndex + 1]) {
    return parts[embedIndex + 1];
  }

  return null;
}

function renderEmbeddedVideo(container, embedURL) {
  container.innerHTML = "";

  const iframe = document.createElement("iframe");

  iframe.src = embedURL;

  iframe.title = lessonState.lesson.title;

  iframe.loading = "lazy";

  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";

  iframe.allowFullscreen = true;

  iframe.referrerPolicy = "strict-origin-when-cross-origin";

  iframe.className = "lesson-video-iframe";

  container.appendChild(iframe);

  const notice = createElement(
    "p",
    "lesson-video-notice",
    "O progresso de vídeos externos é estimado pelo tempo de estudo nesta página.",
  );

  container.appendChild(notice);
}

function renderVideoPlaceholder(container) {
  container.innerHTML = "";

  const placeholder = createElement("div", "lesson-video-placeholder");

  const icon = createElement("div", "lesson-video-placeholder-icon");

  icon.appendChild(createIcon("fa-circle-play"));

  const title = createElement("h3", "", lessonState.lesson.title);

  const description = createElement(
    "p",
    "",
    "Use o botão abaixo para iniciar a sessão de estudo desta aula demonstrativa.",
  );

  const button = createElement("button", "btn-primary");

  button.type = "button";
  button.dataset.lessonPlay = "";

  button.append(
    createIcon("fa-play"),

    createElement("span", "", "Iniciar aula"),
  );

  button.addEventListener("click", toggleStudySession);

  placeholder.append(icon, title, description, button);

  container.appendChild(placeholder);
}

/* =========================
   RENDERIZAÇÃO DA AULA
   ========================= */

function renderLessonInformation() {
  const lesson = lessonState.lesson;

  const values = {
    title: lesson.title,
    subject: lesson.subject,
    teacher: lesson.teacher,
    description: lesson.description,
    room: lesson.room,
    date: formatDateTime(lesson.date),
    duration: formatDuration(lesson.duration),
  };

  Object.entries(values).forEach(([field, value]) => {
    selectAll(`[data-lesson-info="${field}"]`).forEach((element) => {
      element.textContent = value;
    });
  });

  selectAll("[data-lesson-title]").forEach((element) => {
    element.textContent = lesson.title;
  });

  selectAll("[data-lesson-subject]").forEach((element) => {
    element.textContent = lesson.subject;

    element.dataset.subject = lesson.subjectSlug;
  });

  selectAll("[data-lesson-teacher]").forEach((element) => {
    element.textContent = lesson.teacher;
  });

  selectAll("[data-lesson-description]").forEach((element) => {
    element.textContent = lesson.description;
  });

  document.title = `${lesson.title} | SESI Connect`;
}

/* =========================
   OBJETIVOS
   ========================= */

function renderObjectives() {
  const containers = selectAll(
    ["[data-lesson-objectives]", ".lesson-objectives-list"].join(","),
  );

  containers.forEach((container) => {
    container.innerHTML = "";

    const fragment = document.createDocumentFragment();

    lessonState.lesson.objectives.forEach((objective, index) => {
      const item = createElement("li", "lesson-objective-item");

      const number = createElement(
        "span",
        "lesson-objective-number",
        String(index + 1),
      );

      const text = createElement("span", "", objective);

      item.append(number, text);

      fragment.appendChild(item);
    });

    container.appendChild(fragment);
  });
}

/* =========================
   TÓPICOS
   ========================= */

function renderTopics() {
  const containers = selectAll(
    ["[data-lesson-topics]", ".lesson-topics-list"].join(","),
  );

  const watchedSeconds = lessonState.progress.watchedSeconds;

  let elapsedDuration = 0;

  const topics = lessonState.lesson.topics.map((topic) => {
    const topicStart = elapsedDuration;

    elapsedDuration += topic.duration;

    const topicCompleted =
      lessonState.progress.completed || watchedSeconds >= elapsedDuration;

    const topicActive =
      !topicCompleted &&
      watchedSeconds >= topicStart &&
      watchedSeconds < elapsedDuration;

    return {
      ...topic,
      completed: topicCompleted,
      active: topicActive,
    };
  });

  containers.forEach((container) => {
    container.innerHTML = "";

    const fragment = document.createDocumentFragment();

    topics.forEach((topic, index) => {
      fragment.appendChild(createTopicElement(topic, index));
    });

    container.appendChild(fragment);
  });
}

function createTopicElement(topic, index) {
  const item = createElement("article", "lesson-topic-item");

  item.classList.toggle("is-completed", topic.completed);

  item.classList.toggle("is-active", topic.active);

  const indicator = createElement("span", "lesson-topic-indicator");

  if (topic.completed) {
    indicator.appendChild(createIcon("fa-circle-check"));
  } else {
    indicator.textContent = String(index + 1);
  }

  const content = createElement("div", "lesson-topic-content");

  content.append(
    createElement("strong", "lesson-topic-title", topic.title),

    createElement(
      "span",
      "lesson-topic-duration",
      formatDuration(topic.duration),
    ),
  );

  item.append(indicator, content);

  return item;
}

/* =========================
   MATERIAIS
   ========================= */

function renderResources() {
  const containers = selectAll(
    ["[data-lesson-resources]", ".lesson-resources-list"].join(","),
  );

  containers.forEach((container) => {
    container.innerHTML = "";

    const resources = lessonState.lesson.resources;

    if (resources.length === 0) {
      container.appendChild(
        createElement(
          "p",
          "lesson-resources-empty",
          "Nenhum material disponível para esta aula.",
        ),
      );

      return;
    }

    const fragment = document.createDocumentFragment();

    resources.forEach((resource) => {
      fragment.appendChild(createResourceElement(resource));
    });

    container.appendChild(fragment);
  });
}

function createResourceElement(resource) {
  const item = createElement("article", "lesson-resource-item");

  const iconContainer = createElement(
    "div",
    ["lesson-resource-icon", `lesson-resource-icon--${resource.type}`].join(
      " ",
    ),
  );

  iconContainer.appendChild(createIcon(getResourceIcon(resource.type)));

  const content = createElement("div", "lesson-resource-content");

  content.append(
    createElement("strong", "lesson-resource-title", resource.title),

    createElement(
      "span",
      "lesson-resource-meta",
      `${getResourceTypeLabel(resource.type)} • ${resource.size}`,
    ),
  );

  const button = createElement("button", "lesson-resource-button");

  button.type = "button";

  button.setAttribute("aria-label", `Abrir ${resource.title}`);

  button.appendChild(
    createIcon(resource.url ? "fa-arrow-up-right-from-square" : "fa-eye"),
  );

  button.addEventListener("click", () => openResource(resource));

  item.append(iconContainer, content, button);

  return item;
}

function getResourceIcon(type) {
  const icons = {
    pdf: "fa-file-pdf",
    powerpoint: "fa-file-powerpoint",
    slides: "fa-file-powerpoint",
    document: "fa-file-lines",
    word: "fa-file-word",
    video: "fa-file-video",
    image: "fa-file-image",
    link: "fa-link",
  };

  return icons[type] || "fa-file";
}

function getResourceTypeLabel(type) {
  const labels = {
    pdf: "PDF",
    powerpoint: "Apresentação",
    slides: "Apresentação",
    document: "Documento",
    word: "Documento Word",
    video: "Vídeo",
    image: "Imagem",
    link: "Link externo",
  };

  return labels[type] || "Arquivo";
}

function openResource(resource) {
  emitLessonEvent("sesi:lesson-resource-opened", {
    lessonId: lessonState.lesson.id,

    resource: cloneData(resource),
  });

  if (resource.url) {
    try {
      const url = new URL(resource.url, window.location.href);

      window.open(url.href, "_blank", "noopener,noreferrer");

      return;
    } catch {
      showMessage("O endereço deste material é inválido.", "error");

      return;
    }
  }

  try {
    sessionStorage.setItem(
      "sesi-connect-selected-material",
      JSON.stringify({
        ...resource,

        subject: lessonState.lesson.subject,

        lessonId: lessonState.lesson.id,
      }),
    );
  } catch (error) {
    console.warn(
      "[SESI Connect] Não foi possível selecionar o material.",
      error,
    );
  }

  navigateTo("materials");
}

/* =========================
   PROGRESSO NA INTERFACE
   ========================= */

function renderProgress() {
  const progress = lessonState.progress;

  selectAll("[data-lesson-progress-value]").forEach((element) => {
    element.textContent = `${Math.round(progress.percentage)}%`;
  });

  selectAll("[data-lesson-progress-bar]").forEach((element) => {
    element.style.width = `${progress.percentage}%`;

    element.style.setProperty("--lesson-progress", `${progress.percentage}%`);

    element.setAttribute("aria-valuenow", String(progress.percentage));
  });

  selectAll("[data-lesson-watched-time]").forEach((element) => {
    element.textContent = formatDuration(progress.watchedSeconds);
  });

  selectAll("[data-lesson-total-time]").forEach((element) => {
    element.textContent = formatDuration(lessonState.lesson.duration);
  });

  selectAll("[data-lesson-remaining-time]").forEach((element) => {
    const remaining = Math.max(
      0,
      lessonState.lesson.duration - progress.watchedSeconds,
    );

    element.textContent = formatDuration(remaining);
  });

  selectAll("[data-lesson-completion-status]").forEach((element) => {
    element.textContent = progress.completed
      ? "Concluída"
      : progress.percentage > 0
        ? "Em andamento"
        : "Não iniciada";

    element.dataset.status = progress.completed
      ? "completed"
      : progress.percentage > 0
        ? "progress"
        : "pending";
  });

  applyCompletedState();
}

/* =========================
   ESTADO CONCLUÍDO
   ========================= */

function applyCompletedState() {
  const completed = lessonState.progress.completed;

  document.body.classList.toggle("lesson-completed", completed);

  selectAll("[data-lesson-completed-message]").forEach((element) => {
    element.hidden = !completed;

    element.classList.toggle("is-visible", completed);
  });

  selectAll("[data-lesson-complete]").forEach((button) => {
    button.disabled = completed;

    button.classList.toggle("is-completed", completed);

    const text = select("[data-complete-text]", button);

    if (text) {
      text.textContent = completed ? "Aula concluída" : "Marcar como concluída";
    }
  });

  selectAll("[data-lesson-reopen]").forEach((button) => {
    button.hidden = !completed;
  });

  selectAll("[data-lesson-completed-at]").forEach((element) => {
    element.textContent =
      completed && lessonState.progress.completedAt
        ? formatDateTime(lessonState.progress.completedAt)
        : "";
  });
}

/* =========================
   ABAS
   ========================= */

function setActiveTab(tabName) {
  const tab = String(tabName || "").trim();

  if (!tab) {
    return;
  }

  lessonState.activeTab = tab;

  selectAll("[data-lesson-tab]").forEach((button) => {
    const active = button.dataset.lessonTab === tab;

    button.classList.toggle("active", active);

    button.classList.toggle("is-active", active);

    button.setAttribute("aria-selected", String(active));
  });

  selectAll("[data-lesson-panel]").forEach((panel) => {
    const active = panel.dataset.lessonPanel === tab;

    panel.hidden = !active;

    panel.classList.toggle("active", active);

    panel.classList.toggle("is-active", active);
  });

  emitLessonEvent("sesi:lesson-tab-change", {
    tab,
  });
}

/* =========================
   FORMATAÇÃO
   ========================= */

function formatDateTime(dateValue) {
  if (!isValidDate(dateValue)) {
    return "Data não informada";
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

function formatDuration(secondsValue) {
  const totalSeconds = Math.max(0, Math.round(Number(secondsValue) || 0));

  const hours = Math.floor(totalSeconds / 3600);

  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [
      String(hours),
      String(minutes).padStart(2, "0"),
      String(seconds).padStart(2, "0"),
    ].join(":");
  }

  return [String(minutes), String(seconds).padStart(2, "0")].join(":");
}

/* =========================
   NOTIFICAÇÃO DE CONCLUSÃO
   ========================= */

function createCompletionNotification() {
  if (
    !window.SESINotifications ||
    typeof window.SESINotifications.add !== "function"
  ) {
    return;
  }

  window.SESINotifications.add({
    type: "success",

    title: "Aula concluída",

    message: `Você concluiu a aula “${lessonState.lesson.title}”.`,

    route: "lessons",

    metadata: {
      lessonId: lessonState.lesson.id,
    },
  });
}

/* =========================
   BOTÕES DA INTERFACE
   ========================= */

function initializeButton(button, handler) {
  if (button.dataset.lessonInitialized === "true") {
    return;
  }

  button.dataset.lessonInitialized = "true";

  button.addEventListener("click", handler);
}

function initLessonButtons() {
  selectAll("[data-lesson-play]").forEach((button) => {
    initializeButton(button, toggleStudySession);
  });

  selectAll("[data-lesson-complete]").forEach((button) => {
    initializeButton(button, () => {
      if (window.confirm("Deseja marcar esta aula como concluída?")) {
        markLessonAsCompleted();
      }
    });
  });

  selectAll("[data-lesson-reopen]").forEach((button) => {
    initializeButton(button, reopenLesson);
  });

  selectAll("[data-lesson-notes-save]").forEach((button) => {
    initializeButton(button, () => {
      saveLessonNotes({
        notify: true,
      });
    });
  });

  selectAll("[data-lesson-notes-clear]").forEach((button) => {
    initializeButton(button, clearLessonNotes);
  });

  selectAll("[data-lesson-notes-download]").forEach((button) => {
    initializeButton(button, downloadLessonNotes);
  });

  selectAll("[data-lesson-back]").forEach((button) => {
    initializeButton(button, () => {
      navigateTo("lessons");
    });
  });

  selectAll("[data-lesson-ai-help]").forEach((button) => {
    initializeButton(button, openAIHelp);
  });

  selectAll("[data-lesson-tab]").forEach((button) => {
    initializeButton(button, () => {
      setActiveTab(button.dataset.lessonTab);
    });
  });
}

/* =========================
   EVENTOS DAS ANOTAÇÕES
   ========================= */

function initNotesEvents() {
  const textarea = getNotesTextarea();

  if (!textarea) {
    return;
  }

  if (textarea.dataset.lessonInitialized === "true") {
    return;
  }

  textarea.dataset.lessonInitialized = "true";

  textarea.value = lessonState.notes;

  textarea.addEventListener("input", () => {
    lessonState.notes = textarea.value;

    updateNotesCount();
    scheduleNotesSave();
  });

  updateNotesCount();

  if (lessonState.notes) {
    setNotesStatus("saved", "Anotações carregadas");
  } else {
    setNotesStatus("saved", "Nenhuma anotação");
  }
}

/* =========================
   AJUDA COM IA
   ========================= */

function openAIHelp() {
  const prompt = [
    `Estou estudando a aula “${lessonState.lesson.title}” da disciplina de ${lessonState.lesson.subject}.`,
    "",
    lessonState.lesson.description,
    "",
    "Explique os principais conceitos dessa aula de forma simples e crie três perguntas para revisão.",
  ].join("\n");

  writeStorage(localStorage, "sesi-connect-ai-draft", prompt);

  navigateTo("ai");
}

/* =========================
   NAVEGAÇÃO
   ========================= */

function navigateTo(routeName) {
  stopStudySession();
  saveLessonProgress();

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
   SALVAMENTO PERIÓDICO
   ========================= */

function startProgressSaveInterval() {
  stopProgressSaveInterval();

  lessonState.progressTimer = window.setInterval(
    saveLessonProgress,
    LESSON_CONFIG.progressSaveInterval,
  );
}

function stopProgressSaveInterval() {
  if (lessonState.progressTimer) {
    window.clearInterval(lessonState.progressTimer);

    lessonState.progressTimer = null;
  }
}

/* =========================
   SAÍDA DA PÁGINA
   ========================= */

function initBeforeUnload() {
  window.addEventListener("beforeunload", () => {
    window.clearTimeout(lessonState.notesTimer);

    stopStudySession();
    saveLessonProgress();

    const currentNotes = getNotesTextarea()?.value || lessonState.notes;

    if (currentNotes !== lessonState.lastSavedNotes) {
      lessonState.notes = currentNotes;

      saveLessonNotes({
        notify: false,
      });
    }
  });
}

/* =========================
   VISIBILIDADE DA PÁGINA
   ========================= */

function initVisibilityHandling() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      if (lessonState.studySessionActive) {
        pauseStudySession();
      }

      saveLessonProgress();
      saveLessonNotes({
        notify: false,
      });
    }
  });
}

/* =========================
   ATALHOS DE TECLADO
   ========================= */

function initKeyboardShortcuts() {
  document.addEventListener("keydown", (event) => {
    const activeElement = document.activeElement;

    const typing = activeElement?.matches("input, textarea, select");

    if (event.code === "Space" && !typing) {
      event.preventDefault();
      toggleStudySession();
    }

    const saveShortcut =
      (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";

    if (saveShortcut) {
      event.preventDefault();

      saveLessonNotes({
        notify: true,
      });
    }
  });
}

/* =========================
   SINCRONIZAÇÃO ENTRE ABAS
   ========================= */

function initStorageSynchronization() {
  window.addEventListener("storage", (event) => {
    if (event.key === LESSON_CONFIG.progressKey) {
      loadLessonProgress();
      renderProgress();
      renderTopics();
    }

    if (event.key === LESSON_CONFIG.notesKey) {
      loadLessonNotes();

      const textarea = getNotesTextarea();

      if (textarea) {
        textarea.value = lessonState.notes;
      }

      updateNotesCount();
    }
  });
}

/* =========================
   OBSERVADOR DO DOM
   ========================= */

function initLessonObserver() {
  const observer = new MutationObserver((mutations) => {
    const hasAddedNodes = mutations.some(
      (mutation) => mutation.addedNodes.length > 0,
    );

    if (!hasAddedNodes) {
      return;
    }

    initLessonButtons();
    initNotesEvents();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/* =========================
   RENDERIZAÇÃO
   ========================= */

function renderLesson() {
  if (!lessonState.lesson) {
    return;
  }

  renderLessonInformation();
  renderObjectives();
  renderTopics();
  renderResources();
  renderProgress();

  initNotesEvents();
  updateStudyButtons();

  setActiveTab(lessonState.activeTab);

  emitLessonEvent("sesi:lesson-rendered", {
    lesson: cloneData(lessonState.lesson),

    progress: cloneData(lessonState.progress),
  });
}

/* =========================
   ATUALIZAÇÃO
   ========================= */

function refreshLesson() {
  loadSelectedLesson();
  loadLessonProgress();
  loadLessonNotes();

  renderLesson();

  initializeVideo();
  initLessonButtons();
}

/* =========================
   RESTAURAÇÃO
   ========================= */

function resetLessonProgress() {
  if (!window.confirm("Deseja apagar o progresso desta aula?")) {
    return false;
  }

  stopStudySession();

  lessonState.progress = normalizeProgress({}, lessonState.lesson);

  lessonState.progress.startedAt = new Date().toISOString();

  saveLessonProgress();
  renderProgress();
  renderTopics();

  if (lessonState.videoElement) {
    lessonState.videoElement.currentTime = 0;
  }

  showMessage("Progresso restaurado.", "success");

  emitLessonEvent("sesi:lesson-progress-reset", {
    lessonId: lessonState.lesson.id,
  });

  return true;
}

/* =========================
   INICIALIZAÇÃO
   ========================= */

function initLesson() {
  if (lessonState.initialized) {
    refreshLesson();
    return;
  }

  const isLessonPage =
    document.body?.dataset.page === "lesson" ||
    Boolean(
      select(
        [
          ".lesson-page",
          "[data-lesson-page]",
          "[data-lesson-title]",
          "[data-lesson-video]",
        ].join(","),
      ),
    );

  if (!isLessonPage) {
    return;
  }

  lessonState.initialized = true;

  loadSelectedLesson();
  loadLessonProgress();
  loadLessonNotes();

  renderLesson();
  initializeVideo();

  initLessonButtons();
  initNotesEvents();
  initBeforeUnload();
  initVisibilityHandling();
  initKeyboardShortcuts();
  initStorageSynchronization();
  initLessonObserver();

  startProgressSaveInterval();

  emitLessonEvent("sesi:lesson-ready", {
    lesson: cloneData(lessonState.lesson),

    progress: cloneData(lessonState.progress),

    notes: lessonState.notes,
  });
}

/* =========================
   API GLOBAL
   ========================= */

const SESILesson = Object.freeze({
  config: LESSON_CONFIG,

  init: initLesson,
  refresh: refreshLesson,
  render: renderLesson,

  getLesson: () => (lessonState.lesson ? cloneData(lessonState.lesson) : null),

  getProgress: () => cloneData(lessonState.progress),

  getNotes: () => lessonState.notes,

  start: startStudySession,

  pause: pauseStudySession,

  toggle: toggleStudySession,

  updateProgress: updateProgressFromSeconds,

  complete: markLessonAsCompleted,

  reopen: reopenLesson,

  resetProgress: resetLessonProgress,

  saveNotes: saveLessonNotes,

  clearNotes: clearLessonNotes,

  downloadNotes: downloadLessonNotes,

  setActiveTab,
  openResource,
  openAIHelp,
});

window.SESILesson = SESILesson;

/* =========================
   COMPATIBILIDADE
   ========================= */

window.startLesson = startStudySession;

window.pauseLesson = pauseStudySession;

window.completeLesson = markLessonAsCompleted;

window.saveLessonNotes = saveLessonNotes;

/* =========================
   EXECUÇÃO AUTOMÁTICA
   ========================= */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLesson, {
    once: true,
  });
} else {
  initLesson();
}

/* =========================
   EXPORTAÇÕES
   ========================= */

export {
  LESSON_CONFIG,
  SESILesson,
  initLesson,
  refreshLesson,
  renderLesson,
  startStudySession,
  pauseStudySession,
  toggleStudySession,
  updateProgressFromSeconds,
  markLessonAsCompleted,
  reopenLesson,
  resetLessonProgress,
  saveLessonNotes,
  clearLessonNotes,
  downloadLessonNotes,
  setActiveTab,
  openResource,
  openAIHelp,
};
