/* =========================================================
   SESI CONNECT
   Núcleo compartilhado da interface — versão revisada

   Objetivo:
   - um único inicializador compartilhado;
   - sem autenticação duplicada (auth.js cuida disso);
   - sem importar navigation.js/darkmode.js/notifications.js;
   - os módulos de cada página continuam independentes.
   ========================================================= */

"use strict";

const APP_CONFIG = Object.freeze({
  name: "SESI Connect",
  version: "1.1.0",
});

const ROUTES = Object.freeze({
  login: "index.html",
  dashboard: "dashboard.html",
  students: "students.html",
  teachers: "teachers.html",
  lessons: "lessons.html",
  lesson: "lesson.html",
  schedule: "schedule.html",
  activities: "activities.html",
  essay: "essay.html",
  materials: "materials.html",
  ai: "ai.html",
  profile: "profile.html",
  settings: "settings.html",
});

let initialized = false;
let lastFocusedElement = null;

/* =========================
   UTILITÁRIOS
   ========================= */

function qs(selector, context = document) {
  return context.querySelector(selector);
}

function qsa(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

function isInsidePagesDirectory() {
  return /\/pages\//i.test(window.location.pathname);
}

function getRouteURL(routeName) {
  const file = ROUTES[routeName];

  if (!file) {
    return null;
  }

  if (routeName === "login") {
    return isInsidePagesDirectory() ? "../index.html" : "./index.html";
  }

  return isInsidePagesDirectory() ? `./${file}` : `./pages/${file}`;
}

function navigateTo(routeName, options = {}) {
  const url = getRouteURL(routeName);

  if (!url) {
    console.warn(`[SESI Connect] Rota desconhecida: ${routeName}`);
    return false;
  }

  if (options.replace) {
    window.location.replace(url);
  } else {
    window.location.href = url;
  }

  return true;
}

/* =========================
   LOADER
   ========================= */

function hidePageLoader() {
  const loader = qs(".page-loader");

  if (!loader) {
    return;
  }

  loader.classList.add("is-hidden");
  loader.style.pointerEvents = "none";
  loader.setAttribute("aria-hidden", "true");

  window.setTimeout(() => {
    loader.remove();
  }, 350);
}

function initPageLoader() {
  // O loader nunca pode bloquear a aplicação indefinidamente.
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(hidePageLoader);
  });

  window.addEventListener("load", hidePageLoader, { once: true });
  window.setTimeout(hidePageLoader, 1800);
}

/* =========================
   TEMA
   ========================= */

const THEME_KEY = "sesi-connect-theme";

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || "system";
  } catch {
    return "system";
  }
}

function resolveTheme(theme) {
  if (theme === "dark" || theme === "light") {
    return theme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function updateThemeControls(resolvedTheme) {
  qsa("[data-theme-toggle]").forEach((button) => {
    const dark = resolvedTheme === "dark";
    button.setAttribute("aria-pressed", String(dark));
    button.setAttribute(
      "aria-label",
      dark ? "Ativar tema claro" : "Ativar tema escuro",
    );
  });

  qsa("[data-theme-icon]").forEach((icon) => {
    icon.className =
      resolvedTheme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
  });
}

function applyTheme(theme = getStoredTheme(), persist = false) {
  const normalized = ["light", "dark", "system"].includes(theme)
    ? theme
    : "system";

  const resolved = resolveTheme(normalized);

  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.dataset.themePreference = normalized;

  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, normalized);
    } catch {
      // armazenamento indisponível: manter apenas na sessão atual
    }
  }

  updateThemeControls(resolved);
  return resolved;
}

function toggleTheme() {
  const current =
    document.documentElement.getAttribute("data-theme") || "light";
  return applyTheme(current === "dark" ? "light" : "dark", true);
}

function initTheme() {
  applyTheme(getStoredTheme());

  qsa("[data-theme-toggle]").forEach((button) => {
    if (button.dataset.sesiBoundTheme === "true") return;
    button.dataset.sesiBoundTheme = "true";
    button.addEventListener("click", toggleTheme);
  });

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener?.("change", () => {
    if (
      (document.documentElement.dataset.themePreference || "system") ===
      "system"
    ) {
      applyTheme("system");
    }
  });
}

/* =========================
   NAVEGAÇÃO / TÍTULOS
   ========================= */

function updateActiveNavigation() {
  const page = document.body?.dataset.page;
  if (!page) return;

  qsa("[data-route]").forEach((element) => {
    const active = element.dataset.route === page;
    element.classList.toggle("active", active);

    if (active) {
      element.setAttribute("aria-current", "page");
    } else if (element.getAttribute("aria-current") === "page") {
      element.removeAttribute("aria-current");
    }
  });
}

function updatePageTitle() {
  const pageTitle = document.body?.dataset.pageTitle;
  if (!pageTitle) return;

  // Nunca selecionar [data-page-title], pois o próprio <body> possui esse atributo.
  qsa(".top-header-page, [data-page-title-target]").forEach((element) => {
    element.textContent = pageTitle;
  });

  const appName = document.body?.dataset.appName || APP_CONFIG.name;
  document.title = `${pageTitle} | ${appName}`;
}

function initRouteLinks() {
  qsa("[data-route]").forEach((element) => {
    const route = element.dataset.route;
    const url = getRouteURL(route);
    if (!url) return;

    if (element.tagName === "A") {
      element.setAttribute("href", url);
    }
  });
}

/* =========================
   SIDEBAR
   ========================= */

function getSidebar() {
  return qs(".sidebar");
}

function getSidebarOverlay() {
  return qs(".sidebar-overlay");
}

function updateSidebarButtons(open) {
  qsa("[data-sidebar-toggle]").forEach((button) => {
    button.setAttribute("aria-expanded", String(open));
  });
}

function openSidebar() {
  const sidebar = getSidebar();
  const overlay = getSidebarOverlay();

  if (!sidebar) return;

  sidebar.classList.add("is-open");
  overlay?.classList.add("is-visible");
  document.body.classList.add("sidebar-open");
  updateSidebarButtons(true);
}

function closeSidebar() {
  const sidebar = getSidebar();
  const overlay = getSidebarOverlay();

  sidebar?.classList.remove("is-open");
  overlay?.classList.remove("is-visible");
  document.body.classList.remove("sidebar-open");
  updateSidebarButtons(false);
}

function toggleSidebar() {
  const sidebar = getSidebar();
  if (!sidebar) return;

  if (sidebar.classList.contains("is-open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

function initSidebar() {
  qsa("[data-sidebar-toggle]").forEach((button) => {
    if (button.dataset.sesiBoundSidebar === "true") return;
    button.dataset.sesiBoundSidebar = "true";
    button.addEventListener("click", toggleSidebar);
  });

  const overlay = getSidebarOverlay();
  if (overlay && overlay.dataset.sesiBoundSidebar !== "true") {
    overlay.dataset.sesiBoundSidebar = "true";
    overlay.addEventListener("click", closeSidebar);
  }

  qsa(".sidebar [data-route]").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 1024) {
        closeSidebar();
      }
    });
  });
}

/* =========================
   MODAIS
   ========================= */

function resolveModal(target) {
  if (!target) return null;

  if (target instanceof Element) {
    return target.classList.contains("modal")
      ? target
      : target.closest(".modal");
  }

  const id = String(target).replace(/^#/, "");
  return document.getElementById(id);
}

function openModal(target) {
  const modal = resolveModal(target);
  if (!modal) return false;

  lastFocusedElement = document.activeElement;

  modal.hidden = false;
  modal.classList.add("is-open", "active");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  const focusTarget = qs(
    "[autofocus], input:not([type='hidden']), select, textarea, button:not([data-modal-close])",
    modal,
  );

  window.setTimeout(() => focusTarget?.focus(), 30);
  return true;
}

function closeModal(target) {
  const modal = resolveModal(target);
  if (!modal) return false;

  modal.classList.remove("is-open", "active");
  modal.setAttribute("aria-hidden", "true");

  window.setTimeout(() => {
    if (!modal.classList.contains("is-open")) {
      modal.hidden = true;
    }
  }, 220);

  if (!qs(".modal.is-open")) {
    document.body.classList.remove("modal-open");
  }

  if (lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus({ preventScroll: true });
  }

  return true;
}

function closeAllModals() {
  qsa(".modal.is-open").forEach(closeModal);
}

function initModals() {
  qsa(".modal").forEach((modal) => {
    // Modais começam fechados independentemente do HTML legado.
    if (
      !modal.classList.contains("is-open") &&
      !modal.classList.contains("active")
    ) {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
    }
  });

  qsa("[data-modal-open]").forEach((button) => {
    if (button.dataset.sesiBoundModalOpen === "true") return;
    button.dataset.sesiBoundModalOpen = "true";

    button.addEventListener("click", (event) => {
      event.preventDefault();
      openModal(button.dataset.modalOpen);
    });
  });

  document.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-modal-close]");
    if (closeButton) {
      event.preventDefault();
      closeModal(closeButton.closest(".modal"));
    }
  });
}

/* =========================
   NOTIFICAÇÕES
   ========================= */

const NOTIFICATIONS_KEY = "sesi-connect-notifications";

function readNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("[SESI Connect] Não foi possível ler as notificações.", error);
    return [];
  }
}

function writeNotifications(notifications) {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    return true;
  } catch (error) {
    console.warn(
      "[SESI Connect] Não foi possível salvar as notificações.",
      error,
    );
    return false;
  }
}

function getUnreadNotificationCount() {
  return readNotifications().filter((item) => !item.read).length;
}

function updateNotificationBadges() {
  const unread = getUnreadNotificationCount();

  qsa("[data-notification-count]").forEach((badge) => {
    badge.textContent = String(unread);
    badge.hidden = unread === 0;
  });
}

function createNotificationElement(notification) {
  const item = document.createElement("article");
  item.className = `notification-item${notification.read ? "" : " unread"}`;
  item.dataset.notificationId = notification.id;

  const icon = document.createElement("span");
  icon.className = `notification-item-icon notification-item-icon--${notification.type === "error" ? "danger" : notification.type || "info"}`;
  icon.innerHTML = `<i class="fa-solid ${
    notification.type === "success"
      ? "fa-circle-check"
      : notification.type === "warning"
        ? "fa-triangle-exclamation"
        : notification.type === "error" || notification.type === "danger"
          ? "fa-circle-xmark"
          : "fa-circle-info"
  }"></i>`;

  const content = document.createElement("div");
  content.className = "notification-item-content";

  const title = document.createElement("strong");
  title.textContent = notification.title || "Notificação";

  const message = document.createElement("p");
  message.className = "notification-item-message";
  message.textContent = notification.message || "";

  const time = document.createElement("time");
  time.className = "notification-item-time";
  const createdAt = new Date(notification.createdAt || Date.now());
  time.dateTime = createdAt.toISOString();
  time.textContent = createdAt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  content.append(title, message, time);
  item.append(icon, content);

  if (notification.route) {
    item.tabIndex = 0;
    item.setAttribute("role", "button");

    const open = () => {
      markNotificationRead(notification.id);
      navigateTo(notification.route);
    };

    item.addEventListener("click", open);
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  }

  return item;
}

function renderNotifications() {
  const list = qs("[data-notification-list]");
  if (!list) {
    updateNotificationBadges();
    return;
  }

  const notifications = readNotifications().sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  );

  list.replaceChildren();

  if (notifications.length === 0) {
    const empty = document.createElement("div");
    empty.className = "notification-empty-state";
    empty.innerHTML = `
            <i class="fa-regular fa-bell-slash"></i>
            <p>Nenhuma notificação.</p>
        `;
    list.appendChild(empty);
  } else {
    notifications.slice(0, 30).forEach((notification) => {
      list.appendChild(createNotificationElement(notification));
    });
  }

  updateNotificationBadges();
}

function addNotification(notification = {}) {
  const notifications = readNotifications();
  const item = {
    id:
      notification.id ||
      `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: notification.type || "info",
    title: notification.title || "Notificação",
    message: notification.message || notification.text || "",
    route: notification.route || null,
    metadata: notification.metadata || null,
    read: Boolean(notification.read),
    createdAt: notification.createdAt || new Date().toISOString(),
  };

  notifications.unshift(item);
  writeNotifications(notifications.slice(0, 100));
  renderNotifications();
  return item;
}

function markNotificationRead(notificationId) {
  const notifications = readNotifications();
  let changed = false;

  notifications.forEach((notification) => {
    if (notification.id === notificationId && !notification.read) {
      notification.read = true;
      changed = true;
    }
  });

  if (changed) {
    writeNotifications(notifications);
    renderNotifications();
  }
}

function markAllNotificationsRead() {
  const notifications = readNotifications().map((notification) => ({
    ...notification,
    read: true,
  }));
  writeNotifications(notifications);
  renderNotifications();
}

function clearNotifications() {
  writeNotifications([]);
  renderNotifications();
}

function getNotificationPanel() {
  return qs("[data-notification-panel]");
}

function closeNotifications() {
  const panel = getNotificationPanel();
  if (!panel) return;

  panel.classList.remove("is-open", "active");
  panel.setAttribute("aria-hidden", "true");
  panel.hidden = true;

  qsa("[data-notification-toggle]").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

function toggleNotifications() {
  const panel = getNotificationPanel();
  if (!panel) return;

  const open = panel.hidden || panel.getAttribute("aria-hidden") === "true";

  if (!open) {
    closeNotifications();
    return;
  }

  renderNotifications();
  panel.hidden = false;
  panel.classList.add("is-open", "active");
  panel.setAttribute("aria-hidden", "false");

  qsa("[data-notification-toggle]").forEach((button) => {
    button.setAttribute("aria-expanded", "true");
  });
}

function initNotifications() {
  renderNotifications();

  qsa("[data-notification-toggle]").forEach((button) => {
    if (button.dataset.sesiBoundNotifications === "true") return;
    button.dataset.sesiBoundNotifications = "true";
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleNotifications();
    });
  });

  document.addEventListener("click", (event) => {
    const panel = getNotificationPanel();
    if (!panel || panel.hidden) return;

    if (!event.target.closest(".notification-wrapper")) {
      closeNotifications();
    }
  });

  qsa("[data-notifications-read-all]").forEach((button) => {
    button.addEventListener("click", markAllNotificationsRead);
  });

  qsa("[data-notifications-clear]").forEach((button) => {
    button.addEventListener("click", clearNotifications);
  });

  window.addEventListener("storage", (event) => {
    if (event.key === NOTIFICATIONS_KEY) {
      renderNotifications();
    }
  });
}

/* =========================
   TOASTS
   ========================= */

const TOAST_META = {
  success: { icon: "fa-circle-check", title: "Sucesso" },
  error: { icon: "fa-circle-xmark", title: "Erro" },
  warning: { icon: "fa-triangle-exclamation", title: "Atenção" },
  info: { icon: "fa-circle-info", title: "Informação" },
};

function showToast(message, type = "info", options = {}) {
  // Aceita também objeto no formato usado por módulos antigos.
  if (typeof message === "object" && message !== null) {
    options = message;
    type = message.type || "info";
    message = message.message || message.text || "";
  }

  let container = qs(".toast-container");

  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    container.setAttribute("aria-live", "polite");
    document.body.appendChild(container);
  }

  const meta = TOAST_META[type] || TOAST_META.info;
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;

  toast.innerHTML = `
        <span class="toast-icon" aria-hidden="true">
            <i class="fa-solid ${meta.icon}"></i>
        </span>
        <div class="toast-content">
            <strong class="toast-title">${options.title || meta.title}</strong>
            <div class="toast-message"></div>
        </div>
        <button type="button" class="toast-close" aria-label="Fechar">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

  qs(".toast-message", toast).textContent = String(message || "");

  const remove = () => {
    toast.classList.add("is-leaving");
    window.setTimeout(() => toast.remove(), 260);
  };

  qs(".toast-close", toast)?.addEventListener("click", remove);
  container.appendChild(toast);

  window.setTimeout(remove, Number(options.duration) || 4000);
  return toast;
}

/* =========================
   BOTÕES / FORMULÁRIOS
   ========================= */

function setButtonLoading(
  button,
  loading = true,
  loadingText = "Carregando...",
) {
  if (!(button instanceof HTMLElement)) return;

  if (loading) {
    if (!button.dataset.originalHtml) {
      button.dataset.originalHtml = button.innerHTML;
    }

    button.disabled = true;
    button.classList.add("is-loading");
    button.innerHTML = `<span class="loading-spinner loading-spinner--small"></span><span>${loadingText}</span>`;
    return;
  }

  button.disabled = false;
  button.classList.remove("is-loading");

  if (button.dataset.originalHtml) {
    button.innerHTML = button.dataset.originalHtml;
    delete button.dataset.originalHtml;
  }
}

/* =========================
   AUTH WRAPPERS
   ========================= */

function getAuth() {
  return window.SESIAuth || null;
}

function getSession() {
  return getAuth()?.getSession?.() ?? null;
}

function saveSession(session, remember = false) {
  return getAuth()?.saveSession?.(session, remember) ?? false;
}

function clearSession() {
  return getAuth()?.clearSession?.() ?? false;
}

function isAuthenticated() {
  return Boolean(getAuth()?.isAuthenticated?.());
}

function logout() {
  const auth = getAuth();
  if (auth?.signOut) {
    return auth.signOut();
  }

  clearSession();
  navigateTo("login", { replace: true });
  return true;
}

/* =========================
   DADOS GERAIS DA UI
   ========================= */

function updateCurrentYear() {
  qsa("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
}

function initGlobalSearchShortcut() {
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      const search = qs(".top-header-search input, [data-global-search]");
      if (search) {
        event.preventDefault();
        search.focus();
        search.select?.();
      }
    }
  });
}

function initKeyboardControls() {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeAllModals();
    closeSidebar();
    closeNotifications();
  });
}

/* =========================
   INICIALIZAÇÃO
   ========================= */

function initApp() {
  if (initialized) return;
  initialized = true;

  initPageLoader();
  initTheme();
  initRouteLinks();
  updateActiveNavigation();
  updatePageTitle();
  initSidebar();
  initModals();
  initNotifications();
  initGlobalSearchShortcut();
  initKeyboardControls();
  updateCurrentYear();

  document.documentElement.classList.add("app-ready");

  document.dispatchEvent(
    new CustomEvent("sesi:ready", {
      bubbles: true,
      detail: {
        name: APP_CONFIG.name,
        version: APP_CONFIG.version,
        page: document.body?.dataset.page || null,
      },
    }),
  );
}

/* =========================
   APIs GLOBAIS
   ========================= */

const SESIConnect = Object.freeze({
  config: APP_CONFIG,
  init: initApp,

  getRouteURL,
  navigateTo,

  applyTheme,
  toggleTheme,

  openSidebar,
  closeSidebar,
  toggleSidebar,

  openModal,
  closeModal,
  closeAllModals,

  showToast,
  setButtonLoading,

  getSession,
  saveSession,
  clearSession,
  isAuthenticated,
  logout,

  hidePageLoader,
});

window.SESIConnect = SESIConnect;

// Compatibilidade com módulos existentes sem carregar os antigos core/*.js.
window.SESINavigation = Object.freeze({
  navigateTo,
  getRouteURL,
  updateActiveNavigation,
  closeSidebar,
  toggleSidebar,
});

window.SESINotifications = Object.freeze({
  add: addNotification,
  getAll: readNotifications,
  getUnreadCount: getUnreadNotificationCount,
  markRead: markNotificationRead,
  markAllRead: markAllNotificationsRead,
  clear: clearNotifications,
  render: renderNotifications,
  showToast,
  close: closeNotifications,
  toggle: toggleNotifications,
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp, { once: true });
} else {
  initApp();
}

export {
  APP_CONFIG,
  ROUTES,
  SESIConnect,
  initApp,
  getRouteURL,
  navigateTo,
  applyTheme,
  toggleTheme,
  openModal,
  closeModal,
  showToast,
  setButtonLoading,
  hidePageLoader,
};
