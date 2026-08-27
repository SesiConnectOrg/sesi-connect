/* =========================================================
   SESI CONNECT
   Módulo de calendário e eventos escolares
   ========================================================= */

"use strict";

/* =========================
   CONFIGURAÇÕES
   ========================= */

const CALENDAR_CONFIG = Object.freeze({
  storageKey: "sesi-connect-calendar-events",
  selectedDateKey: "sesi-connect-calendar-selected-date",
  locale: "pt-BR",
  weekStartsOnMonday: true,

  eventTypes: {
    LESSON: "lesson",
    ACTIVITY: "activity",
    EXAM: "exam",
    MEETING: "meeting",
    HOLIDAY: "holiday",
    OTHER: "other",
  },
});

/* =========================
   ESTADO
   ========================= */

const calendarState = {
  initialized: false,
  currentDate: startOfMonth(new Date()),
  selectedDate: startOfDay(new Date()),
  events: [],
  activeEventId: null,
};

/* =========================
   EVENTOS DEMONSTRATIVOS
   ========================= */

const DEFAULT_CALENDAR_EVENTS = Object.freeze([
  {
    id: "calendar-event-lesson-1",
    title: "Aula de Matemática",
    description: "Funções do segundo grau.",
    type: "lesson",
    date: createRelativeDate(0, 8, 0),
    endDate: createRelativeDate(0, 9, 40),
    subject: "Matemática",
    teacher: "Prof. Ricardo Alves",
    location: "Sala 12",
  },

  {
    id: "calendar-event-activity-1",
    title: "Entrega da lista de exercícios",
    description: "Lista sobre funções e gráficos.",
    type: "activity",
    date: createRelativeDate(1, 23, 59),
    endDate: null,
    subject: "Matemática",
    teacher: "Prof. Ricardo Alves",
    location: "SESI Connect",
  },

  {
    id: "calendar-event-exam-1",
    title: "Avaliação de História",
    description: "Revolução Industrial e urbanização.",
    type: "exam",
    date: createRelativeDate(3, 10, 0),
    endDate: createRelativeDate(3, 11, 40),
    subject: "História",
    teacher: "Prof. Marcelo Lima",
    location: "Sala 08",
  },

  {
    id: "calendar-event-meeting-1",
    title: "Reunião pedagógica",
    description: "Acompanhamento do desempenho da turma.",
    type: "meeting",
    date: createRelativeDate(6, 14, 0),
    endDate: createRelativeDate(6, 15, 30),
    subject: null,
    teacher: null,
    location: "Sala de reuniões",
  },
]);

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

function emitCalendarEvent(name, detail = {}) {
  document.dispatchEvent(
    new CustomEvent(name, {
      bubbles: true,
      detail,
    }),
  );
}

/* =========================
   UTILITÁRIOS DE DATA
   ========================= */

function startOfDay(dateValue) {
  const date = new Date(dateValue);

  date.setHours(0, 0, 0, 0);

  return date;
}

function startOfMonth(dateValue) {
  const date = startOfDay(dateValue);

  date.setDate(1);

  return date;
}

function endOfMonth(dateValue) {
  const date = startOfMonth(dateValue);

  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  date.setHours(23, 59, 59, 999);

  return date;
}

function addDays(dateValue, amount) {
  const date = new Date(dateValue);

  date.setDate(date.getDate() + amount);

  return date;
}

function addMonths(dateValue, amount) {
  const date = startOfMonth(dateValue);

  date.setMonth(date.getMonth() + amount);

  return date;
}

function createRelativeDate(dayOffset, hour = 0, minute = 0) {
  const date = new Date();

  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);

  return date.toISOString();
}

function isValidDate(value) {
  return Boolean(value && !Number.isNaN(new Date(value).getTime()));
}

function isSameDay(firstDate, secondDate) {
  const first = startOfDay(firstDate);
  const second = startOfDay(secondDate);

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function isSameMonth(firstDate, secondDate) {
  const first = new Date(firstDate);
  const second = new Date(secondDate);

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth()
  );
}

function dateToKey(dateValue) {
  const date = startOfDay(dateValue);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateTimeLocalValue(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  const hour = String(date.getHours()).padStart(2, "0");

  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function getWeekdayIndex(dateValue) {
  const day = new Date(dateValue).getDay();

  if (!CALENDAR_CONFIG.weekStartsOnMonday) {
    return day;
  }

  return day === 0 ? 6 : day - 1;
}

/* =========================
   FORMATAÇÃO
   ========================= */

function formatMonthTitle(dateValue) {
  const formatted = new Intl.DateTimeFormat(CALENDAR_CONFIG.locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(dateValue));

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatFullDate(dateValue) {
  return new Intl.DateTimeFormat(CALENDAR_CONFIG.locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(dateValue));
}

function formatShortDate(dateValue) {
  return new Intl.DateTimeFormat(CALENDAR_CONFIG.locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateValue));
}

function formatEventTime(dateValue) {
  if (!isValidDate(dateValue)) {
    return "";
  }

  return new Intl.DateTimeFormat(CALENDAR_CONFIG.locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function formatEventPeriod(event) {
  const start = formatEventTime(event.date);

  if (!event.endDate) {
    return start;
  }

  const end = formatEventTime(event.endDate);

  if (!start || !end) {
    return start || end;
  }

  return `${start} – ${end}`;
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

function createEventId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `calendar-${crypto.randomUUID()}`;
  }

  return ["calendar", Date.now(), Math.random().toString(16).slice(2)].join(
    "-",
  );
}

function normalizeEvent(event = {}) {
  const validTypes = Object.values(CALENDAR_CONFIG.eventTypes);

  const type = validTypes.includes(event.type)
    ? event.type
    : CALENDAR_CONFIG.eventTypes.OTHER;

  const date = isValidDate(event.date)
    ? new Date(event.date).toISOString()
    : new Date().toISOString();

  return {
    id: String(event.id || createEventId()),

    title: String(event.title || "Evento sem título").trim(),

    description: String(event.description || "").trim(),

    type,
    date,

    endDate: isValidDate(event.endDate)
      ? new Date(event.endDate).toISOString()
      : null,

    subject: event.subject ? String(event.subject).trim() : null,

    teacher: event.teacher ? String(event.teacher).trim() : null,

    location: event.location ? String(event.location).trim() : null,

    createdAt: isValidDate(event.createdAt)
      ? event.createdAt
      : new Date().toISOString(),
  };
}

/* =========================
   CARREGAMENTO
   ========================= */

function loadCalendarEvents() {
  const storedEvents = readStorage(CALENDAR_CONFIG.storageKey);

  const source = Array.isArray(storedEvents)
    ? storedEvents
    : DEFAULT_CALENDAR_EVENTS;

  calendarState.events = source.map(normalizeEvent).sort(sortEvents);

  if (!Array.isArray(storedEvents)) {
    saveCalendarEvents();
  }

  const savedSelectedDate = readStorage(CALENDAR_CONFIG.selectedDateKey);

  if (isValidDate(savedSelectedDate)) {
    calendarState.selectedDate = startOfDay(savedSelectedDate);

    calendarState.currentDate = startOfMonth(savedSelectedDate);
  }

  return getCalendarEvents();
}

function saveCalendarEvents() {
  return writeStorage(CALENDAR_CONFIG.storageKey, calendarState.events);
}

function saveSelectedDate() {
  return writeStorage(
    CALENDAR_CONFIG.selectedDateKey,
    calendarState.selectedDate.toISOString(),
  );
}

function sortEvents(first, second) {
  return new Date(first.date).getTime() - new Date(second.date).getTime();
}

/* =========================
   CONSULTAS
   ========================= */

function getCalendarEvents() {
  return calendarState.events.map((event) => ({
    ...event,
  }));
}

function getEventById(eventId) {
  return calendarState.events.find((event) => event.id === eventId) || null;
}

function getEventsByDate(dateValue) {
  return calendarState.events
    .filter((event) => isSameDay(event.date, dateValue))
    .sort(sortEvents)
    .map((event) => ({
      ...event,
    }));
}

function getEventsByMonth(dateValue) {
  return calendarState.events
    .filter((event) => isSameMonth(event.date, dateValue))
    .sort(sortEvents)
    .map((event) => ({
      ...event,
    }));
}

function getUpcomingEvents(limit = 5) {
  const now = new Date();

  return calendarState.events
    .filter((event) => new Date(event.date).getTime() >= now.getTime())
    .sort(sortEvents)
    .slice(0, limit)
    .map((event) => ({
      ...event,
    }));
}

/* =========================
   ELEMENTOS DO CALENDÁRIO
   ========================= */

function getCalendarContainers() {
  return selectAll(
    ["[data-calendar]", ".calendar", ".dashboard-calendar"].join(","),
  );
}

function getCalendarGrid(container = document) {
  return select(
    ["[data-calendar-grid]", ".calendar-grid", ".calendar-days"].join(","),
    container,
  );
}

function getCalendarEventList(container = document) {
  return select(
    ["[data-calendar-events]", ".calendar-events", ".calendar-event-list"].join(
      ",",
    ),
    container,
  );
}

/* =========================
   DIAS DA SEMANA
   ========================= */

function getWeekdayNames(compact = false) {
  return compact
    ? ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    : ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
}

function createWeekdayHeader(name) {
  return createElement("div", "calendar-weekday", name);
}

/* =========================
   GERAÇÃO DOS DIAS
   ========================= */

function generateCalendarDays(monthDate) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  const leadingDays = getWeekdayIndex(monthStart);

  const daysInMonth = monthEnd.getDate();

  const totalVisibleDays = Math.ceil((leadingDays + daysInMonth) / 7) * 7;

  const firstVisibleDate = addDays(monthStart, -leadingDays);

  const days = [];

  for (let index = 0; index < totalVisibleDays; index += 1) {
    const date = addDays(firstVisibleDate, index);

    days.push({
      date,
      inCurrentMonth: isSameMonth(date, monthDate),
      isToday: isSameDay(date, new Date()),
      isSelected: isSameDay(date, calendarState.selectedDate),
      events: getEventsByDate(date),
    });
  }

  return days;
}

/* =========================
   ELEMENTO DO DIA
   ========================= */

function createCalendarDay(dayData, compact = false) {
  const button = createElement("button", "calendar-day");

  button.type = "button";

  button.dataset.calendarDate = dateToKey(dayData.date);

  button.setAttribute("aria-label", formatFullDate(dayData.date));

  button.classList.toggle("calendar-day--outside", !dayData.inCurrentMonth);

  button.classList.toggle("is-outside", !dayData.inCurrentMonth);

  button.classList.toggle("calendar-day--today", dayData.isToday);

  button.classList.toggle("is-today", dayData.isToday);

  button.classList.toggle("calendar-day--selected", dayData.isSelected);

  button.classList.toggle("is-selected", dayData.isSelected);

  if (dayData.events.length > 0) {
    button.classList.add("calendar-day--has-events", "has-events");
  }

  const number = createElement(
    "span",
    "calendar-day-number",
    String(dayData.date.getDate()),
  );

  button.appendChild(number);

  if (dayData.events.length > 0) {
    button.appendChild(createDayEventIndicators(dayData.events, compact));
  }

  button.addEventListener("click", () => {
    selectCalendarDate(dayData.date);
  });

  return button;
}

function createDayEventIndicators(events, compact) {
  const container = createElement("span", "calendar-day-events");

  const visibleEvents = events.slice(0, compact ? 3 : 2);

  visibleEvents.forEach((event) => {
    const indicator = createElement(
      "span",
      ["calendar-event-dot", `calendar-event-dot--${event.type}`].join(" "),
    );

    indicator.title = event.title;

    container.appendChild(indicator);
  });

  if (!compact && events.length > visibleEvents.length) {
    container.appendChild(
      createElement(
        "span",
        "calendar-day-more",
        `+${events.length - visibleEvents.length}`,
      ),
    );
  }

  return container;
}

/* =========================
   RENDERIZAÇÃO DO CALENDÁRIO
   ========================= */

function renderCalendar() {
  getCalendarContainers().forEach((container) => {
    renderCalendarContainer(container);
  });

  // A agenda lateral da página de cronograma fica fora do
  // contêiner visual do calendário. Renderize-a globalmente também.
  renderSelectedDateEvents(document);

  updateExternalCalendarElements();

  emitCalendarEvent("sesi:calendar-rendered", {
    month: calendarState.currentDate.toISOString(),
    selectedDate: calendarState.selectedDate.toISOString(),
    events: getEventsByMonth(calendarState.currentDate),
  });
}

function renderCalendarContainer(container) {
  const grid = getCalendarGrid(container);

  if (!grid) {
    return;
  }

  const compact =
    container.dataset.calendarCompact === "true" ||
    container.classList.contains("dashboard-calendar");

  grid.innerHTML = "";

  const fragment = document.createDocumentFragment();

  getWeekdayNames(compact).forEach((weekday) => {
    fragment.appendChild(createWeekdayHeader(weekday));
  });

  generateCalendarDays(calendarState.currentDate).forEach((dayData) => {
    fragment.appendChild(createCalendarDay(dayData, compact));
  });

  grid.appendChild(fragment);

  renderSelectedDateEvents(container);
  updateContainerTitle(container);
}

function updateContainerTitle(container) {
  selectAll(
    ["[data-calendar-title]", ".calendar-title", ".calendar-month-title"].join(
      ",",
    ),
    container,
  ).forEach((element) => {
    element.textContent = formatMonthTitle(calendarState.currentDate);
  });
}

/* =========================
   EVENTOS DO DIA
   ========================= */

function renderSelectedDateEvents(container = document) {
  const list = getCalendarEventList(container);

  if (!list) {
    return;
  }

  const events = getEventsByDate(calendarState.selectedDate);

  list.innerHTML = "";

  const dateTitle = select(
    ["[data-calendar-selected-title]", ".calendar-selected-title"].join(","),
    container,
  );

  if (dateTitle) {
    dateTitle.textContent = formatFullDate(calendarState.selectedDate);
  }

  if (events.length === 0) {
    list.appendChild(createCalendarEmptyState());

    return;
  }

  const fragment = document.createDocumentFragment();

  events.forEach((event) => {
    fragment.appendChild(createCalendarEventElement(event));
  });

  list.appendChild(fragment);
}

function createCalendarEventElement(event) {
  const item = createElement(
    "article",
    ["calendar-event-item", `calendar-event-item--${event.type}`].join(" "),
  );

  item.dataset.calendarEventId = event.id;

  const iconContainer = createElement("div", "calendar-event-icon");

  iconContainer.appendChild(createIcon(getEventIcon(event.type)));

  const content = createElement("div", "calendar-event-content");

  const title = createElement("button", "calendar-event-title", event.title);

  title.type = "button";

  title.addEventListener("click", () => openEvent(event.id));

  const meta = createElement("div", "calendar-event-meta");

  const period = formatEventPeriod(event);

  if (period) {
    meta.appendChild(createMetaItem("fa-clock", period));
  }

  if (event.location) {
    meta.appendChild(createMetaItem("fa-location-dot", event.location));
  }

  content.append(title, meta);

  if (event.description) {
    content.appendChild(
      createElement("p", "calendar-event-description", event.description),
    );
  }

  item.append(iconContainer, content);

  return item;
}

function createMetaItem(iconClass, text) {
  const element = createElement("span", "calendar-event-meta-item");

  element.append(createIcon(iconClass), document.createTextNode(text));

  return element;
}

function createCalendarEmptyState() {
  const container = createElement("div", "calendar-empty");

  container.append(
    createIcon("fa-calendar-check"),
    createElement("p", "", "Nenhum compromisso para esta data."),
  );

  return container;
}

/* =========================
   ÍCONES
   ========================= */

function getEventIcon(type) {
  const icons = {
    lesson: "fa-book-open",
    activity: "fa-list-check",
    exam: "fa-file-pen",
    meeting: "fa-users",
    holiday: "fa-umbrella-beach",
    other: "fa-calendar-day",
  };

  return icons[type] || icons.other;
}

function getEventTypeLabel(type) {
  const labels = {
    lesson: "Aula",
    activity: "Atividade",
    exam: "Avaliação",
    meeting: "Reunião",
    holiday: "Feriado",
    other: "Outro",
  };

  return labels[type] || labels.other;
}

/* =========================
   ELEMENTOS EXTERNOS
   ========================= */

function updateExternalCalendarElements() {
  selectAll("[data-calendar-current-month]").forEach((element) => {
    element.textContent = formatMonthTitle(calendarState.currentDate);
  });

  selectAll("[data-calendar-selected-date]").forEach((element) => {
    element.textContent = formatFullDate(calendarState.selectedDate);
  });

  selectAll("[data-calendar-event-count]").forEach((element) => {
    element.textContent = String(
      getEventsByMonth(calendarState.currentDate).length,
    );
  });

  selectAll("[data-calendar-today-count]").forEach((element) => {
    element.textContent = String(getEventsByDate(new Date()).length);
  });
}

/* =========================
   SELEÇÃO DA DATA
   ========================= */

function selectCalendarDate(dateValue) {
  const date = startOfDay(dateValue);

  calendarState.selectedDate = date;

  if (!isSameMonth(date, calendarState.currentDate)) {
    calendarState.currentDate = startOfMonth(date);
  }

  saveSelectedDate();
  renderCalendar();

  emitCalendarEvent("sesi:calendar-date-selected", {
    date: date.toISOString(),
    events: getEventsByDate(date),
  });
}

/* =========================
   NAVEGAÇÃO DE MESES
   ========================= */

function previousMonth() {
  calendarState.currentDate = addMonths(calendarState.currentDate, -1);

  renderCalendar();
}

function nextMonth() {
  calendarState.currentDate = addMonths(calendarState.currentDate, 1);

  renderCalendar();
}

function goToToday() {
  calendarState.currentDate = startOfMonth(new Date());

  calendarState.selectedDate = startOfDay(new Date());

  saveSelectedDate();
  renderCalendar();
}

function goToDate(dateValue) {
  if (!isValidDate(dateValue)) {
    return false;
  }

  calendarState.currentDate = startOfMonth(dateValue);

  calendarState.selectedDate = startOfDay(dateValue);

  saveSelectedDate();
  renderCalendar();

  return true;
}

/* =========================
   ADICIONAR EVENTO
   ========================= */

function addEvent(eventData) {
  const event = normalizeEvent({
    ...eventData,
    id: eventData.id || createEventId(),
  });

  calendarState.events.push(event);

  calendarState.events.sort(sortEvents);

  saveCalendarEvents();
  renderCalendar();

  showMessage("Evento adicionado ao calendário.", "success");

  emitCalendarEvent("sesi:calendar-event-added", {
    event: {
      ...event,
    },
  });

  return {
    ...event,
  };
}

/* =========================
   ATUALIZAR EVENTO
   ========================= */

function updateEvent(eventId, updates = {}) {
  const index = calendarState.events.findIndex((event) => event.id === eventId);

  if (index === -1) {
    return {
      success: false,
      error: "Evento não encontrado.",
    };
  }

  calendarState.events[index] = normalizeEvent({
    ...calendarState.events[index],
    ...updates,
    id: eventId,
  });

  calendarState.events.sort(sortEvents);

  saveCalendarEvents();
  renderCalendar();

  emitCalendarEvent("sesi:calendar-event-updated", {
    event: {
      ...calendarState.events[index],
    },
  });

  return {
    success: true,
    event: {
      ...calendarState.events[index],
    },
  };
}

/* =========================
   REMOVER EVENTO
   ========================= */

function removeEvent(eventId, options = {}) {
  const { confirm = true } = options;

  const event = getEventById(eventId);

  if (!event) {
    return false;
  }

  if (confirm && !window.confirm(`Deseja remover o evento “${event.title}”?`)) {
    return false;
  }

  calendarState.events = calendarState.events.filter(
    (item) => item.id !== eventId,
  );

  saveCalendarEvents();
  renderCalendar();

  showMessage("Evento removido.", "success");

  emitCalendarEvent("sesi:calendar-event-removed", {
    eventId,
  });

  return true;
}

/* =========================
   FORMULÁRIO DO EVENTO
   ========================= */

function getEventForm() {
  return (
    document.getElementById("calendar-event-form") ||
    select("[data-calendar-event-form]")
  );
}

function getEventFormValue(form, name) {
  return form.elements.namedItem(name)?.value || "";
}

function populateEventForm(event = null) {
  const form = getEventForm();

  if (!form) {
    return;
  }

  const selectedDate = calendarState.selectedDate;

  const defaultStart = new Date(selectedDate);

  defaultStart.setHours(8, 0, 0, 0);

  const defaultEnd = new Date(selectedDate);

  defaultEnd.setHours(9, 0, 0, 0);

  const values = {
    id: event?.id || "",
    title: event?.title || "",
    description: event?.description || "",
    type: event?.type || "lesson",
    date: event?.date
      ? dateTimeLocalValue(event.date)
      : dateTimeLocalValue(defaultStart),
    endDate: event?.endDate
      ? dateTimeLocalValue(event.endDate)
      : dateTimeLocalValue(defaultEnd),
    subject: event?.subject || "",
    teacher: event?.teacher || "",
    location: event?.location || "",
  };

  Object.entries(values).forEach(([name, value]) => {
    const field = form.elements.namedItem(name);

    if (field) {
      field.value = value;
    }
  });

  form.dataset.eventId = event?.id || "";
}

function readEventForm(form) {
  const startDate = getEventFormValue(form, "date");

  const endDate = getEventFormValue(form, "endDate");

  return {
    title: getEventFormValue(form, "title"),
    description: getEventFormValue(form, "description"),
    type: getEventFormValue(form, "type"),
    date: startDate ? new Date(startDate).toISOString() : null,
    endDate: endDate ? new Date(endDate).toISOString() : null,
    subject: getEventFormValue(form, "subject"),
    teacher: getEventFormValue(form, "teacher"),
    location: getEventFormValue(form, "location"),
  };
}

function validateEventData(eventData) {
  const errors = {};

  if (!eventData.title.trim()) {
    errors.title = "Digite o título do evento.";
  }

  if (!isValidDate(eventData.date)) {
    errors.date = "Informe uma data válida.";
  }

  if (
    eventData.endDate &&
    new Date(eventData.endDate).getTime() < new Date(eventData.date).getTime()
  ) {
    errors.endDate = "O término não pode ser anterior ao início.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

function submitEventForm(form) {
  const eventData = readEventForm(form);

  const validation = validateEventData(eventData);

  clearEventFormErrors(form);

  if (!validation.valid) {
    Object.entries(validation.errors).forEach(([field, message]) => {
      showEventFormError(form.elements.namedItem(field), message);
    });

    showMessage("Verifique os dados do evento.", "error");

    return false;
  }

  const eventId = form.dataset.eventId || getEventFormValue(form, "id");

  if (eventId) {
    updateEvent(eventId, eventData);

    showMessage("Evento atualizado.", "success");
  } else {
    addEvent(eventData);
  }

  closeEventModal();

  return true;
}

function showEventFormError(field, message) {
  if (!field) {
    return;
  }

  field.classList.add("is-invalid");
  field.setAttribute("aria-invalid", "true");

  const container =
    field.closest(".form-group, .form-field") || field.parentElement;

  if (!container) {
    return;
  }

  const error = createElement("span", "form-error", message);

  error.setAttribute("role", "alert");

  container.appendChild(error);
}

function clearEventFormErrors(form) {
  selectAll(".is-invalid", form).forEach((field) => {
    field.classList.remove("is-invalid");

    field.removeAttribute("aria-invalid");
  });

  selectAll(".form-error", form).forEach((error) => error.remove());
}

/* =========================
   MODAL DO EVENTO
   ========================= */

function openEvent(eventId = null) {
  const event = eventId ? getEventById(eventId) : null;

  calendarState.activeEventId = event?.id || null;

  populateEventForm(event);
  populateEventDetails(event);

  const modalId = event ? "calendar-event-modal" : "calendar-event-form-modal";

  const modal =
    document.getElementById(modalId) ||
    document.getElementById("calendar-event-modal");

  if (
    window.SESIConnect &&
    typeof window.SESIConnect.openModal === "function"
  ) {
    window.SESIConnect.openModal(modal?.id || "calendar-event-modal");

    return;
  }

  modal?.classList.add("active", "is-open");
}

function openNewEvent() {
  calendarState.activeEventId = null;

  populateEventForm(null);

  const modal =
    document.getElementById("calendar-event-form-modal") ||
    document.getElementById("calendar-event-modal");

  if (
    window.SESIConnect &&
    typeof window.SESIConnect.openModal === "function"
  ) {
    window.SESIConnect.openModal(modal?.id || "calendar-event-modal");

    return;
  }

  modal?.classList.add("active", "is-open");
}

function closeEventModal() {
  const modal =
    document.getElementById("calendar-event-form-modal") ||
    document.getElementById("calendar-event-modal");

  if (
    window.SESIConnect &&
    typeof window.SESIConnect.closeModal === "function"
  ) {
    window.SESIConnect.closeModal(modal);

    return;
  }

  modal?.classList.remove("active", "is-open");
}

function populateEventDetails(event) {
  if (!event) {
    return;
  }

  const values = {
    title: event.title,
    description: event.description || "Sem descrição.",
    type: getEventTypeLabel(event.type),
    date: formatShortDate(event.date),
    time: formatEventPeriod(event),
    subject: event.subject || "Não informado",
    teacher: event.teacher || "Não informado",
    location: event.location || "Não informado",
  };

  Object.entries(values).forEach(([field, value]) => {
    selectAll(`[data-calendar-event-detail="${field}"]`).forEach((element) => {
      element.textContent = value;
    });
  });
}

/* =========================
   EVENTOS DA INTERFACE
   ========================= */

function initNavigationButtons() {
  selectAll(["[data-calendar-previous]", ".calendar-prev"].join(",")).forEach(
    (button) => {
      if (button.dataset.calendarInitialized === "true") {
        return;
      }

      button.dataset.calendarInitialized = "true";

      button.addEventListener("click", previousMonth);
    },
  );

  selectAll(["[data-calendar-next]", ".calendar-next"].join(",")).forEach(
    (button) => {
      if (button.dataset.calendarInitialized === "true") {
        return;
      }

      button.dataset.calendarInitialized = "true";

      button.addEventListener("click", nextMonth);
    },
  );

  selectAll(["[data-calendar-today]", ".calendar-today"].join(",")).forEach(
    (button) => {
      if (button.dataset.calendarInitialized === "true") {
        return;
      }

      button.dataset.calendarInitialized = "true";

      button.addEventListener("click", goToToday);
    },
  );
}

function initEventButtons() {
  selectAll("[data-calendar-add-event]").forEach((button) => {
    if (button.dataset.calendarInitialized === "true") {
      return;
    }

    button.dataset.calendarInitialized = "true";

    button.addEventListener("click", openNewEvent);
  });

  selectAll("[data-calendar-edit-event]").forEach((button) => {
    if (button.dataset.calendarInitialized === "true") {
      return;
    }

    button.dataset.calendarInitialized = "true";

    button.addEventListener("click", () => {
      if (calendarState.activeEventId) {
        openEvent(calendarState.activeEventId);
      }
    });
  });

  selectAll("[data-calendar-remove-event]").forEach((button) => {
    if (button.dataset.calendarInitialized === "true") {
      return;
    }

    button.dataset.calendarInitialized = "true";

    button.addEventListener("click", () => {
      if (
        calendarState.activeEventId &&
        removeEvent(calendarState.activeEventId)
      ) {
        closeEventModal();
      }
    });
  });
}

function initEventForm() {
  const form = getEventForm();

  if (!form || form.dataset.calendarInitialized === "true") {
    return;
  }

  form.dataset.calendarInitialized = "true";

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    submitEventForm(form);
  });

  selectAll("input, select, textarea", form).forEach((field) => {
    field.addEventListener("input", () => {
      field.classList.remove("is-invalid");

      field.removeAttribute("aria-invalid");

      field
        .closest(".form-group, .form-field")
        ?.querySelector(".form-error")
        ?.remove();
    });
  });
}

/* =========================
   TECLADO
   ========================= */

function initKeyboardControls() {
  document.addEventListener("keydown", (event) => {
    const activeElement = document.activeElement;

    const isTyping = activeElement?.matches("input, textarea, select");

    if (isTyping) {
      return;
    }

    if (event.key === "ArrowLeft" && event.altKey) {
      event.preventDefault();
      previousMonth();
    }

    if (event.key === "ArrowRight" && event.altKey) {
      event.preventDefault();
      nextMonth();
    }

    if (event.key.toLowerCase() === "t" && !event.ctrlKey && !event.metaKey) {
      goToToday();
    }
  });
}

/* =========================
   SINCRONIZAÇÃO ENTRE ABAS
   ========================= */

function initStorageSynchronization() {
  window.addEventListener("storage", (event) => {
    if (
      ![CALENDAR_CONFIG.storageKey, CALENDAR_CONFIG.selectedDateKey].includes(
        event.key,
      )
    ) {
      return;
    }

    loadCalendarEvents();
    renderCalendar();
  });
}

/* =========================
   OBSERVADOR DO DOM
   ========================= */

function initCalendarObserver() {
  const observer = new MutationObserver((mutations) => {
    const hasAddedNodes = mutations.some(
      (mutation) => mutation.addedNodes.length > 0,
    );

    if (!hasAddedNodes) {
      return;
    }

    initNavigationButtons();
    initEventButtons();
    initEventForm();
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
      id: createEventId(),
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

function resetCalendar() {
  calendarState.events = DEFAULT_CALENDAR_EVENTS.map(normalizeEvent);

  calendarState.currentDate = startOfMonth(new Date());

  calendarState.selectedDate = startOfDay(new Date());

  saveCalendarEvents();
  saveSelectedDate();
  renderCalendar();

  showMessage("Calendário restaurado.", "success");
}

/* =========================
   ATUALIZAÇÃO
   ========================= */

function refreshCalendar() {
  loadCalendarEvents();

  initNavigationButtons();
  initEventButtons();
  initEventForm();

  renderCalendar();
}

/* =========================
   INICIALIZAÇÃO
   ========================= */

function initCalendar() {
  if (calendarState.initialized) {
    refreshCalendar();
    return;
  }

  const hasCalendar = Boolean(
    select(
      [
        "[data-calendar]",
        ".calendar",
        ".dashboard-calendar",
        "[data-calendar-grid]",
      ].join(","),
    ),
  );

  if (!hasCalendar) {
    return;
  }

  calendarState.initialized = true;

  loadCalendarEvents();

  initNavigationButtons();
  initEventButtons();
  initEventForm();
  initKeyboardControls();
  initStorageSynchronization();
  initCalendarObserver();

  renderCalendar();

  emitCalendarEvent("sesi:calendar-ready", {
    events: getCalendarEvents(),
    selectedDate: calendarState.selectedDate.toISOString(),
  });
}

/* =========================
   API GLOBAL
   ========================= */

const SESICalendar = Object.freeze({
  config: CALENDAR_CONFIG,

  init: initCalendar,
  refresh: refreshCalendar,
  reset: resetCalendar,
  render: renderCalendar,

  getAll: getCalendarEvents,
  getById: getEventById,
  getByDate: getEventsByDate,
  getByMonth: getEventsByMonth,
  getUpcoming: getUpcomingEvents,

  add: addEvent,
  update: updateEvent,
  remove: removeEvent,

  selectDate: selectCalendarDate,
  goToDate,
  goToToday,
  previousMonth,
  nextMonth,

  openEvent,
  openNewEvent,
  closeEventModal,

  getSelectedDate: () => new Date(calendarState.selectedDate),

  getCurrentMonth: () => new Date(calendarState.currentDate),
});

window.SESICalendar = SESICalendar;

/* =========================
   COMPATIBILIDADE
   ========================= */

window.previousCalendarMonth = previousMonth;

window.nextCalendarMonth = nextMonth;

window.goToCalendarToday = goToToday;

/* =========================
   EXECUÇÃO AUTOMÁTICA
   ========================= */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCalendar, {
    once: true,
  });
} else {
  initCalendar();
}

/* =========================
   EXPORTAÇÕES
   ========================= */

export {
  CALENDAR_CONFIG,
  SESICalendar,
  initCalendar,
  refreshCalendar,
  resetCalendar,
  renderCalendar,
  getCalendarEvents,
  getEventById,
  getEventsByDate,
  getEventsByMonth,
  getUpcomingEvents,
  addEvent,
  updateEvent,
  removeEvent,
  selectCalendarDate,
  goToDate,
  goToToday,
  previousMonth,
  nextMonth,
  openEvent,
  openNewEvent,
  closeEventModal,
};
