/* =========================================================
   SESI CONNECT
   Autenticação, sessão e controle de acesso
   ========================================================= */

"use strict";

/* =========================
   CONFIGURAÇÕES
   ========================= */

const AUTH_CONFIG = Object.freeze({
  sessionKey: "sesi-connect-session",
  recoveryKey: "sesi-connect-recovery",
  sessionDuration: 8 * 60 * 60 * 1000,
  minimumPasswordLength: 6,

  routes: {
    login: "index.html",
    dashboard: "pages/dashboard.html",
    unauthorized: "pages/dashboard.html",
  },
});

/* =========================
   PERFIS DE USUÁRIO
   ========================= */

const USER_ROLES = Object.freeze({
  ADMIN: "admin",
  COORDINATOR: "coordinator",
  TEACHER: "teacher",
  STUDENT: "student",
  USER: "user",
});

const ROLE_LABELS = Object.freeze({
  admin: "Administrador",
  coordinator: "Coordenador",
  teacher: "Professor",
  student: "Aluno",
  user: "Usuário",
});

/* =========================
   PERMISSÕES
   ========================= */

const ROLE_PERMISSIONS = Object.freeze({
  admin: [
    "dashboard:view",
    "students:view",
    "students:create",
    "students:edit",
    "students:delete",
    "teachers:view",
    "teachers:create",
    "teachers:edit",
    "teachers:delete",
    "lessons:view",
    "lessons:create",
    "lessons:edit",
    "lessons:delete",
    "schedule:view",
    "schedule:edit",
    "activities:view",
    "activities:create",
    "activities:edit",
    "activities:grade",
    "materials:view",
    "materials:upload",
    "materials:delete",
    "ai:use",
    "profile:view",
    "profile:edit",
    "settings:view",
    "settings:edit",
  ],

  coordinator: [
    "dashboard:view",
    "students:view",
    "students:create",
    "students:edit",
    "teachers:view",
    "teachers:create",
    "teachers:edit",
    "lessons:view",
    "lessons:create",
    "lessons:edit",
    "schedule:view",
    "schedule:edit",
    "activities:view",
    "activities:create",
    "activities:edit",
    "activities:grade",
    "materials:view",
    "materials:upload",
    "ai:use",
    "profile:view",
    "profile:edit",
    "settings:view",
  ],

  teacher: [
    "dashboard:view",
    "students:view",
    "lessons:view",
    "lessons:create",
    "lessons:edit",
    "schedule:view",
    "activities:view",
    "activities:create",
    "activities:edit",
    "activities:grade",
    "materials:view",
    "materials:upload",
    "ai:use",
    "profile:view",
    "profile:edit",
    "settings:view",
  ],

  student: [
    "dashboard:view",
    "lessons:view",
    "schedule:view",
    "activities:view",
    "activities:submit",
    "essay:view",
    "essay:edit",
    "essay:submit",
    "materials:view",
    "ai:use",
    "profile:view",
    "profile:edit",
    "settings:view",
  ],

  user: [
    "dashboard:view",
    "lessons:view",
    "schedule:view",
    "activities:view",
    "materials:view",
    "ai:use",
    "profile:view",
    "profile:edit",
    "settings:view",
  ],
});

/* =========================
   ESTADO DO MÓDULO
   ========================= */

const authState = {
  initialized: false,
  processingLogin: false,
  currentUser: null,
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

function emitAuthEvent(name, detail = {}) {
  document.dispatchEvent(
    new CustomEvent(name, {
      bubbles: true,
      detail,
    }),
  );
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function normalizeRole(role) {
  const normalizedRole = String(role || "")
    .trim()
    .toLowerCase();

  return Object.values(USER_ROLES).includes(normalizedRole)
    ? normalizedRole
    : USER_ROLES.USER;
}

function capitalizeName(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

function escapeHTML(value) {
  const element = document.createElement("div");

  element.textContent = String(value || "");

  return element.innerHTML;
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

function removeStorage(storage, key) {
  try {
    storage.removeItem(key);
  } catch (error) {
    console.warn(`[SESI Connect] Não foi possível remover "${key}".`, error);
  }
}

/* =========================
   CAMINHOS
   ========================= */

function getProjectRootURL() {
  const insidePagesFolder = window.location.pathname.includes("/pages/");

  return insidePagesFolder
    ? new URL("../", window.location.href)
    : new URL("./", window.location.href);
}

function getAuthRouteURL(routeName) {
  const route = AUTH_CONFIG.routes[routeName];

  if (!route) {
    return null;
  }

  return new URL(route, getProjectRootURL()).href;
}

function redirectToAuthRoute(routeName, replace = true) {
  const routeURL = getAuthRouteURL(routeName);

  if (!routeURL) {
    return;
  }

  if (replace) {
    window.location.replace(routeURL);
    return;
  }

  window.location.href = routeURL;
}

/* =========================
   VALIDAÇÕES
   ========================= */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function validatePassword(password) {
  const value = String(password || "");

  const errors = [];

  if (!value) {
    errors.push("Digite sua senha.");
  } else if (value.length < AUTH_CONFIG.minimumPasswordLength) {
    errors.push(
      `A senha precisa ter pelo menos ${AUTH_CONFIG.minimumPasswordLength} caracteres.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateLoginCredentials(email, password) {
  const errors = {};

  if (!email) {
    errors.email = "Digite seu e-mail.";
  } else if (!isValidEmail(email)) {
    errors.email = "Digite um endereço de e-mail válido.";
  }

  const passwordValidation = validatePassword(password);

  if (!passwordValidation.valid) {
    errors.password = passwordValidation.errors[0];
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/* =========================
   IDENTIFICAÇÃO DO PERFIL
   ========================= */

function identifyRoleFromEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  if (
    normalizedEmail.includes("admin") ||
    normalizedEmail.includes("direcao")
  ) {
    return USER_ROLES.ADMIN;
  }

  if (
    normalizedEmail.includes("coordenador") ||
    normalizedEmail.includes("coordenacao")
  ) {
    return USER_ROLES.COORDINATOR;
  }

  if (
    normalizedEmail.includes("professor") ||
    normalizedEmail.includes("docente")
  ) {
    return USER_ROLES.TEACHER;
  }

  if (
    normalizedEmail.includes("aluno") ||
    normalizedEmail.includes("estudante")
  ) {
    return USER_ROLES.STUDENT;
  }

  return USER_ROLES.USER;
}

function createNameFromEmail(email) {
  const localPart = normalizeEmail(email).split("@")[0] || "usuário";

  const cleanedName = localPart
    .replace(/[._-]+/g, " ")
    .replace(/\d+/g, "")
    .trim();

  if (!cleanedName) {
    return "Usuário SESI";
  }

  return capitalizeName(cleanedName);
}

function createUserFromCredentials(email) {
  const normalizedEmail = normalizeEmail(email);

  const role = identifyRoleFromEmail(normalizedEmail);

  return {
    id: createUserId(normalizedEmail),
    name: createNameFromEmail(normalizedEmail),
    email: normalizedEmail,
    role,
    roleLabel: ROLE_LABELS[role],
    avatar: null,
    active: true,
  };
}

function createUserId(email) {
  let hash = 0;

  for (let index = 0; index < email.length; index += 1) {
    hash = (hash << 5) - hash + email.charCodeAt(index);

    hash |= 0;
  }

  return `user-${Math.abs(hash)}`;
}

/* =========================
   SESSÃO
   ========================= */

function createSession(user, remember = false) {
  const now = Date.now();

  return {
    authenticated: true,
    remember,
    user,
    loginAt: new Date(now).toISOString(),
    expiresAt: new Date(now + AUTH_CONFIG.sessionDuration).toISOString(),
  };
}

function saveSession(session, remember = false) {
  clearSession();

  const storage = remember ? localStorage : sessionStorage;

  const saved = writeStorage(storage, AUTH_CONFIG.sessionKey, session);

  if (saved) {
    authState.currentUser = session.user || null;
  }

  return saved;
}

function getStoredSession() {
  return (
    readStorage(sessionStorage, AUTH_CONFIG.sessionKey) ||
    readStorage(localStorage, AUTH_CONFIG.sessionKey)
  );
}

function getSession() {
  const session = getStoredSession();

  if (!session) {
    return null;
  }

  if (!isSessionValid(session)) {
    clearSession();
    return null;
  }

  return session;
}

function isSessionValid(session) {
  if (!session || session.authenticated !== true || !session.user) {
    return false;
  }

  if (!session.expiresAt) {
    return true;
  }

  const expirationTime = new Date(session.expiresAt).getTime();

  if (Number.isNaN(expirationTime)) {
    return false;
  }

  return expirationTime > Date.now();
}

function clearSession() {
  removeStorage(sessionStorage, AUTH_CONFIG.sessionKey);

  removeStorage(localStorage, AUTH_CONFIG.sessionKey);

  authState.currentUser = null;
}

function isAuthenticated() {
  return isSessionValid(getSession());
}

function getCurrentUser() {
  const session = getSession();

  return session?.user || null;
}

/* =========================
   LOGIN
   ========================= */

async function signIn({ email, password, remember = false }) {
  if (authState.processingLogin) {
    return {
      success: false,
      error: "Uma tentativa de login já está em andamento.",
    };
  }

  authState.processingLogin = true;

  try {
    const validation = validateLoginCredentials(email, password);

    if (!validation.valid) {
      return {
        success: false,
        validationErrors: validation.errors,
      };
    }

    /*
     * Login demonstrativo:
     * enquanto não existe backend, qualquer e-mail válido
     * e senha com pelo menos 6 caracteres serão aceitos.
     */

    await simulateRequest(350);

    const user = createUserFromCredentials(email);

    const session = createSession(user, remember);

    const saved = saveSession(session, remember);

    if (!saved) {
      return {
        success: false,
        error: "Não foi possível salvar sua sessão.",
      };
    }

    authState.currentUser = user;

    emitAuthEvent("sesi:login", {
      user,
      session,
    });

    return {
      success: true,
      user,
      session,
    };
  } catch (error) {
    console.error("[SESI Connect] Erro durante o login.", error);

    return {
      success: false,
      error: "Não foi possível entrar. Tente novamente.",
    };
  } finally {
    authState.processingLogin = false;
  }
}

function simulateRequest(duration = 300) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

/* =========================
   LOGOUT
   ========================= */

function signOut({ redirect = true, replace = true } = {}) {
  clearSession();

  emitAuthEvent("sesi:logout");

  if (redirect) {
    redirectToAuthRoute("login", replace);
  }
}

/* =========================
   CONTROLE DE ACESSO
   ========================= */

function requireAuthentication() {
  const body = document.body;

  if (!body) {
    return true;
  }

  const requiresAuthentication = body.dataset.authRequired === "true";

  if (!requiresAuthentication) {
    return true;
  }

  if (isAuthenticated()) {
    return true;
  }

  redirectToAuthRoute("login", true);

  return false;
}

function redirectAuthenticatedUser() {
  const guestOnly = document.body?.dataset.guestOnly === "true";

  if (guestOnly && isAuthenticated()) {
    redirectToAuthRoute("dashboard", true);

    return true;
  }

  return false;
}

function hasRole(...allowedRoles) {
  const user = getCurrentUser();

  if (!user) {
    return false;
  }

  const normalizedRoles = allowedRoles.flat().map(normalizeRole);

  return normalizedRoles.includes(normalizeRole(user.role));
}

function hasPermission(permission) {
  const user = getCurrentUser();

  if (!user || !permission) {
    return false;
  }

  const userRole = normalizeRole(user.role);

  const permissions = ROLE_PERMISSIONS[userRole] || [];

  return permissions.includes(permission);
}

function enforcePageRoles() {
  const rolesAttribute =
    document.body?.dataset.allowedRoles || document.body?.dataset.requiredRoles;

  if (!rolesAttribute) {
    return true;
  }

  const allowedRoles = rolesAttribute
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);

  if (hasRole(allowedRoles)) {
    return true;
  }

  emitAuthEvent("sesi:access-denied", {
    user: getCurrentUser(),
    allowedRoles,
  });

  showAuthMessage(
    "Você não possui permissão para acessar esta página.",
    "error",
  );

  window.setTimeout(() => {
    redirectToAuthRoute("unauthorized", true);
  }, 400);

  return false;
}

/* =========================
   ELEMENTOS POR PERMISSÃO
   ========================= */

function applyPermissionVisibility() {
  selectAll("[data-permission]").forEach((element) => {
    const permission = element.dataset.permission;

    const allowed = hasPermission(permission);

    element.hidden = !allowed;
    element.classList.toggle("is-hidden", !allowed);

    element.setAttribute("aria-hidden", String(!allowed));
  });

  selectAll("[data-roles]").forEach((element) => {
    const allowedRoles = element.dataset.roles
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean);

    const allowed = hasRole(allowedRoles);

    element.hidden = !allowed;
    element.classList.toggle("is-hidden", !allowed);
  });

  selectAll("[data-disable-without-permission]").forEach((element) => {
    const permission = element.dataset.disableWithoutPermission;

    element.disabled = !hasPermission(permission);
  });
}

/* =========================
   DADOS DO USUÁRIO NA TELA
   ========================= */

function getUserInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "US";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function syncUserInterface() {
  const user = getCurrentUser();

  if (!user) {
    return;
  }

  authState.currentUser = user;

  selectAll("[data-user-name]").forEach((element) => {
    element.textContent = user.name || "Usuário SESI";
  });

  selectAll("[data-user-first-name]").forEach((element) => {
    element.textContent = String(user.name || "Usuário")
      .trim()
      .split(/\s+/)[0];
  });

  selectAll("[data-user-email]").forEach((element) => {
    element.textContent = user.email || "";
  });

  selectAll("[data-user-role]").forEach((element) => {
    element.textContent =
      user.roleLabel || ROLE_LABELS[normalizeRole(user.role)];
  });

  selectAll("[data-user-initials]").forEach((element) => {
    element.textContent = getUserInitials(user.name);
  });

  selectAll("[data-user-id]").forEach((element) => {
    element.textContent = user.id || "";
  });

  selectAll("[data-user-avatar]").forEach((element) => {
    if (user.avatar && element instanceof HTMLImageElement) {
      element.src = user.avatar;
      element.alt = `Foto de ${user.name}`;
    }
  });

  document.body.dataset.userRole = normalizeRole(user.role);

  applyPermissionVisibility();
}

/* =========================
   ATUALIZAÇÃO DO USUÁRIO
   ========================= */

function updateCurrentUser(updates = {}) {
  const session = getSession();

  if (!session?.user) {
    return {
      success: false,
      error: "Nenhum usuário autenticado.",
    };
  }

  const updatedUser = {
    ...session.user,
    ...updates,
    id: session.user.id,
    email: updates.email ? normalizeEmail(updates.email) : session.user.email,
    role: normalizeRole(updates.role || session.user.role),
  };

  updatedUser.roleLabel = ROLE_LABELS[updatedUser.role];

  const updatedSession = {
    ...session,
    user: updatedUser,
  };

  const saved = saveSession(updatedSession, Boolean(session.remember));

  if (!saved) {
    return {
      success: false,
      error: "Não foi possível atualizar o usuário.",
    };
  }

  authState.currentUser = updatedUser;

  syncUserInterface();

  emitAuthEvent("sesi:user-updated", {
    user: updatedUser,
  });

  return {
    success: true,
    user: updatedUser,
  };
}

/* =========================
   ERROS DE FORMULÁRIO
   ========================= */

function getFieldContainer(field) {
  return (
    field?.closest(
      [".form-group", ".form-field", ".input-group", ".login-field"].join(","),
    ) ||
    field?.parentElement ||
    null
  );
}

function showFieldError(field, message) {
  if (!field) {
    return;
  }

  field.classList.add("is-invalid");
  field.setAttribute("aria-invalid", "true");

  const container = getFieldContainer(field);

  if (!container) {
    return;
  }

  let errorElement = select(".form-error", container);

  if (!errorElement) {
    errorElement = document.createElement("span");

    errorElement.className = "form-error";

    errorElement.setAttribute("role", "alert");

    container.appendChild(errorElement);
  }

  errorElement.textContent = message;
}

function clearFieldError(field) {
  if (!field) {
    return;
  }

  field.classList.remove("is-invalid");
  field.removeAttribute("aria-invalid");

  getFieldContainer(field)?.querySelector(".form-error")?.remove();
}

function clearFormErrors(form) {
  selectAll(".is-invalid", form).forEach(clearFieldError);

  selectAll(".form-error", form).forEach((error) => error.remove());

  const alert = select(".login-alert", form);

  if (alert) {
    alert.remove();
  }
}

function showFormAlert(form, message, type = "error") {
  if (!form) {
    return;
  }

  select(".login-alert", form)?.remove();

  const alert = document.createElement("div");

  alert.className = `login-alert login-alert--${type}`;

  alert.setAttribute("role", type === "error" ? "alert" : "status");

  const safeMessage = escapeHTML(message);

  const icon = type === "success" ? "fa-circle-check" : "fa-circle-exclamation";

  alert.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${safeMessage}</span>
    `;

  form.prepend(alert);
}

/* =========================
   ESTADO DO BOTÃO
   ========================= */

function setSubmitLoading(button, loading, text = "Entrando...") {
  if (!button) {
    return;
  }

  if (loading) {
    if (!button.dataset.originalContent) {
      button.dataset.originalContent = button.innerHTML;
    }

    button.disabled = true;
    button.classList.add("is-loading");

    button.innerHTML = `
            <span class="loading-spinner loading-spinner--small"></span>
            <span>${escapeHTML(text)}</span>
        `;

    return;
  }

  button.disabled = false;
  button.classList.remove("is-loading");

  if (button.dataset.originalContent) {
    button.innerHTML = button.dataset.originalContent;

    delete button.dataset.originalContent;
  }
}

/* =========================
   FORMULÁRIO DE LOGIN
   ========================= */

function initLoginForm() {
  const form =
    document.getElementById("login-form") ||
    select("[data-login-form]") ||
    select(".login-form");

  if (!form || form.dataset.authInitialized === "true") {
    return;
  }

  form.dataset.authInitialized = "true";

  const emailInput = select(
    ["#login-email", "[name='email']", "input[type='email']"].join(","),
    form,
  );

  const passwordInput = select(
    ["#login-password", "[name='password']", "input[type='password']"].join(
      ",",
    ),
    form,
  );

  const rememberInput = select(
    ["#remember-me", "[name='remember']", "[name='rememberMe']"].join(","),
    form,
  );

  const submitButton = select("button[type='submit']", form);

  emailInput?.addEventListener("input", () => clearFieldError(emailInput));

  passwordInput?.addEventListener("input", () =>
    clearFieldError(passwordInput),
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearFormErrors(form);

    const email = emailInput?.value || "";

    const password = passwordInput?.value || "";

    const remember = Boolean(rememberInput?.checked);

    const validation = validateLoginCredentials(email, password);

    if (!validation.valid) {
      if (validation.errors.email) {
        showFieldError(emailInput, validation.errors.email);
      }

      if (validation.errors.password) {
        showFieldError(passwordInput, validation.errors.password);
      }

      showFormAlert(form, "Verifique os dados informados.");

      emailInput?.focus();

      return;
    }

    setSubmitLoading(submitButton, true);

    const result = await signIn({
      email,
      password,
      remember,
    });

    if (!result.success) {
      setSubmitLoading(submitButton, false);

      if (result.validationErrors?.email) {
        showFieldError(emailInput, result.validationErrors.email);
      }

      if (result.validationErrors?.password) {
        showFieldError(passwordInput, result.validationErrors.password);
      }

      showFormAlert(form, result.error || "Não foi possível entrar.");

      return;
    }

    showFormAlert(form, `Bem-vindo, ${result.user.name}!`, "success");

    window.setTimeout(() => {
      redirectToAuthRoute("dashboard", true);
    }, 300);
  });
}

/* =========================
   EXIBIÇÃO DA SENHA
   ========================= */

function initPasswordToggles() {
  selectAll("[data-password-toggle]").forEach((button) => {
    if (button.dataset.passwordInitialized === "true") {
      return;
    }

    button.dataset.passwordInitialized = "true";

    button.addEventListener("click", () => {
      const targetId = button.dataset.passwordToggle;

      const input =
        document.getElementById(targetId) ||
        button
          .closest([".password-field", ".input-group", ".form-group"].join(","))
          ?.querySelector("input");

      if (!input) {
        return;
      }

      const willShow = input.type === "password";

      input.type = willShow ? "text" : "password";

      button.setAttribute(
        "aria-label",
        willShow ? "Ocultar senha" : "Mostrar senha",
      );

      const icon = select("i", button);

      if (icon) {
        icon.classList.toggle("fa-eye", !willShow);

        icon.classList.toggle("fa-eye-slash", willShow);
      }
    });
  });
}

/* =========================
   RECUPERAÇÃO DE SENHA
   ========================= */

async function requestPasswordRecovery(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return {
      success: false,
      error: "Digite um endereço de e-mail válido.",
    };
  }

  await simulateRequest(400);

  const recoveryRequest = {
    email: normalizedEmail,
    requestedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };

  writeStorage(sessionStorage, AUTH_CONFIG.recoveryKey, recoveryRequest);

  emitAuthEvent("sesi:password-recovery", recoveryRequest);

  return {
    success: true,
    message: "As instruções de recuperação foram simuladas com sucesso.",
  };
}

function initRecoveryForms() {
  selectAll(
    ["[data-recovery-form]", "#recovery-form", ".recovery-form"].join(","),
  ).forEach((form) => {
    if (form.dataset.authInitialized === "true") {
      return;
    }

    form.dataset.authInitialized = "true";

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const emailInput = select(
        ["[name='email']", "input[type='email']"].join(","),
        form,
      );

      const submitButton = select("button[type='submit']", form);

      clearFormErrors(form);

      setSubmitLoading(submitButton, true, "Enviando...");

      const result = await requestPasswordRecovery(emailInput?.value);

      setSubmitLoading(submitButton, false);

      if (!result.success) {
        showFieldError(emailInput, result.error);

        showFormAlert(form, result.error);

        return;
      }

      showFormAlert(form, result.message, "success");

      form.reset();
    });
  });
}

/* =========================
   BOTÕES DE LOGOUT
   ========================= */

function initLogoutButtons() {
  selectAll(
    ["[data-logout]", "[data-action='logout']", ".logout-button"].join(","),
  ).forEach((button) => {
    if (button.dataset.authInitialized === "true") {
      return;
    }

    button.dataset.authInitialized = "true";

    button.addEventListener("click", (event) => {
      event.preventDefault();

      const skipConfirmation = button.dataset.skipConfirm === "true";

      const message =
        button.dataset.confirmMessage || "Deseja realmente sair da sua conta?";

      if (skipConfirmation || window.confirm(message)) {
        signOut();
      }
    });
  });
}

/* =========================
   MENSAGENS
   ========================= */

function showAuthMessage(message, type = "info") {
  if (
    window.SESIConnect &&
    typeof window.SESIConnect.showToast === "function"
  ) {
    window.SESIConnect.showToast(message, type);

    return;
  }

  console[type === "error" ? "error" : "info"](`[SESI Connect] ${message}`);
}

/* =========================
   ATUALIZAÇÃO DA SESSÃO
   ========================= */

function refreshSessionExpiration() {
  const session = getSession();

  if (!session || !session.expiresAt) {
    return false;
  }

  const updatedSession = {
    ...session,
    expiresAt: new Date(Date.now() + AUTH_CONFIG.sessionDuration).toISOString(),
  };

  return saveSession(updatedSession, Boolean(session.remember));
}

function initSessionActivity() {
  const activityEvents = ["click", "keydown", "touchstart"];

  let lastRefresh = 0;

  const handleActivity = () => {
    const now = Date.now();

    if (now - lastRefresh < 5 * 60 * 1000) {
      return;
    }

    lastRefresh = now;

    if (isAuthenticated()) {
      refreshSessionExpiration();
    }
  };

  activityEvents.forEach((eventName) => {
    document.addEventListener(eventName, handleActivity, {
      passive: true,
    });
  });
}

/* =========================
   MONITORAMENTO ENTRE ABAS
   ========================= */

function initStorageSynchronization() {
  window.addEventListener("storage", (event) => {
    if (event.key !== AUTH_CONFIG.sessionKey) {
      return;
    }

    if (!event.newValue) {
      emitAuthEvent("sesi:session-ended");

      if (document.body?.dataset.authRequired === "true") {
        redirectToAuthRoute("login", true);
      }

      return;
    }

    syncUserInterface();
  });
}

/* =========================
   INICIALIZAÇÃO
   ========================= */

function initAuth() {
  if (authState.initialized) {
    return;
  }

  authState.initialized = true;

  if (redirectAuthenticatedUser()) {
    return;
  }

  if (!requireAuthentication()) {
    return;
  }

  if (!enforcePageRoles()) {
    return;
  }

  initLoginForm();
  initPasswordToggles();
  initRecoveryForms();
  initLogoutButtons();
  initSessionActivity();
  initStorageSynchronization();

  syncUserInterface();

  emitAuthEvent("sesi:auth-ready", {
    authenticated: isAuthenticated(),
    user: getCurrentUser(),
  });
}

/* =========================
   API GLOBAL
   ========================= */

const SESIAuth = Object.freeze({
  config: AUTH_CONFIG,
  roles: USER_ROLES,
  roleLabels: ROLE_LABELS,
  permissions: ROLE_PERMISSIONS,

  init: initAuth,

  signIn,
  signOut,

  getSession,
  saveSession,
  clearSession,
  isAuthenticated,
  getCurrentUser,
  updateCurrentUser,

  hasRole,
  hasPermission,

  requireAuthentication,
  enforcePageRoles,
  applyPermissionVisibility,

  validateLoginCredentials,
  validatePassword,
  isValidEmail,

  requestPasswordRecovery,
  syncUserInterface,
});

window.SESIAuth = SESIAuth;

/* =========================
   EXECUÇÃO AUTOMÁTICA
   ========================= */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuth, {
    once: true,
  });
} else {
  initAuth();
}

/* =========================
   EXPORTAÇÕES
   ========================= */

export {
  AUTH_CONFIG,
  USER_ROLES,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  SESIAuth,
  initAuth,
  signIn,
  signOut,
  getSession,
  saveSession,
  clearSession,
  isAuthenticated,
  getCurrentUser,
  updateCurrentUser,
  hasRole,
  hasPermission,
  requireAuthentication,
  enforcePageRoles,
  validateLoginCredentials,
  validatePassword,
  isValidEmail,
  requestPasswordRecovery,
};
