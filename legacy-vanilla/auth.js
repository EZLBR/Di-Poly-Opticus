const LS_USERS = "opticus_users";
const LS_SESSION = "opticus_session";
const LS_ORDERS = "opticus_orders";
const AUTH_PAGE = "login_unified_professional.html";

(function seedAuthData() {
  if (!localStorage.getItem(LS_USERS)) {
    const demoUsers = [
      {
        id: "client-1",
        name: "Client Demo",
        email: "client@opticus.com",
        password: "123456",
        role: "client"
      },
      {
        id: "factory-rayban",
        name: "Ray-Ban Factory",
        email: "rayban@opticus.com",
        password: "123456",
        role: "factory",
        factoryName: "Ray-Ban"
      },
      {
        id: "factory-oakley",
        name: "Oakley Factory",
        email: "oakley@opticus.com",
        password: "123456",
        role: "factory",
        factoryName: "Oakley"
      },
      {
        id: "staff-1",
        name: "Opticus Staff",
        email: "staff@opticus.com",
        password: "123456",
        role: "staff"
      }
    ];

    localStorage.setItem(LS_USERS, JSON.stringify(demoUsers));
  }

  if (!localStorage.getItem(LS_ORDERS)) {
    const demoOrders = [
      {
        id: "ORD-1001",
        customerName: "Enzo Brasil",
        productName: "Aero Round",
        factoryId: "factory-rayban",
        factoryName: "Ray-Ban",
        status: "In production",
        createdAt: "2026-03-09",
        total: 180
      },
      {
        id: "ORD-1002",
        customerName: "Maria Souza",
        productName: "Titan Edge",
        factoryId: "factory-oakley",
        factoryName: "Oakley",
        status: "Queued",
        createdAt: "2026-03-08",
        total: 200
      },
      {
        id: "ORD-1003",
        customerName: "Lucas Lima",
        productName: "Nova Square",
        factoryId: "factory-rayban",
        factoryName: "Ray-Ban",
        status: "Delivered",
        createdAt: "2026-03-06",
        total: 190
      }
    ];

    localStorage.setItem(LS_ORDERS, JSON.stringify(demoOrders));
  }

  const users = getUsers();
  if (!users.some((user) => user.email === "factory@opticus.com")) {
    users.push({
      id: "factory-demo",
      name: "Factory Demo",
      email: "factory@opticus.com",
      password: "123456",
      role: "factory",
      factoryName: "Demo Factory"
    });
    setUsers(users);
  }
})();

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(LS_USERS)) || [];
  } catch {
    return [];
  }
}

function setUsers(users) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem(LS_ORDERS)) || [];
  } catch {
    return [];
  }
}

function setOrders(orders) {
  localStorage.setItem(LS_ORDERS, JSON.stringify(orders));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(LS_SESSION)) || null;
  } catch {
    return null;
  }
}

function setSession(session) {
  localStorage.setItem(LS_SESSION, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(LS_SESSION);
}

function getPortalMeta(role) {
  if (role === "client") {
    return {
      title: "Client",
      subtitle: "Marketplace, custom creator and imported 3D models",
      redirect: "index.html"
    };
  }

  if (role === "factory") {
    return {
      title: "Partner Factory",
      subtitle: "Orders assigned to your production line",
      redirect: "factory-dashboard.html"
    };
  }

  return {
    title: "Staff",
    subtitle: "Operations overview across the Opticus platform",
    redirect: "staff-dashboard.html"
  };
}

function loginUser(email, password, expectedRole) {
  const users = getUsers();

  const user = users.find(
    (u) =>
      u.email.toLowerCase() === String(email).trim().toLowerCase() &&
      u.password === password &&
      (!expectedRole || u.role === expectedRole)
  );

  if (!user) return false;

  setSession({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    factoryName: user.factoryName || null
  });

  return true;
}

function createUser({ name, email, password, role, factoryName }) {
  const users = getUsers();
  const normalizedEmail = String(email).trim().toLowerCase();

  if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
    return { ok: false, message: "An account with this email already exists." };
  }

  const user = {
    id: `${role}-${Date.now()}`,
    name: String(name).trim(),
    email: normalizedEmail,
    password,
    role
  };

  if (role === "factory") {
    user.factoryName = String(factoryName || name).trim();
  }

  users.push(user);
  setUsers(users);
  return { ok: true, user };
}

function logoutUser() {
  clearSession();
  window.location.href = AUTH_PAGE;
}

function requireRole(allowedRoles) {
  const session = getSession();

  if (!session || !allowedRoles.includes(session.role)) {
    window.location.href = AUTH_PAGE;
    return false;
  }

  return true;
}

function goAfterLogin(role) {
  if (role === "client") {
    window.location.href = "index.html";
    return;
  }

  if (role === "factory") {
    window.location.href = "factory-dashboard.html";
    return;
  }

  if (role === "staff") {
    window.location.href = "staff-dashboard.html";
  }
}

function initLoginForm(expectedRole) {
  const form = document.getElementById("loginForm");
  const error = document.getElementById("loginError");
  const button = form?.querySelector("button[type='submit']");
  const roleBadge = document.getElementById("roleBadge");
  const roleHint = document.getElementById("roleHint");

  if (!form) return;

  const meta = getPortalMeta(expectedRole);
  if (roleBadge) roleBadge.textContent = meta.title.toUpperCase();
  if (roleHint) roleHint.textContent = meta.subtitle;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("email")?.value || "";
    const password = document.getElementById("password")?.value || "";

    if (button) {
      button.disabled = true;
      button.dataset.defaultText = button.dataset.defaultText || button.textContent;
      button.textContent = "ENTERING...";
    }

    if (error) error.textContent = "";

    window.setTimeout(() => {
      const ok = loginUser(email, password, expectedRole);

      if (!ok) {
        if (error) {
          error.textContent = "Invalid credentials for this portal.";
        }
        if (button) {
          button.disabled = false;
          button.textContent = button.dataset.defaultText || "LOGIN";
        }
        return;
      }

      goAfterLogin(expectedRole);
    }, 220);
  });
}

function initUnifiedAuthPage() {
  const tabs = Array.from(document.querySelectorAll("[data-auth-tab]"));
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const authEyebrow = document.getElementById("authEyebrow");
  const authTitle = document.getElementById("authTitle");
  const authSubtitle = document.getElementById("authSubtitle");
  const signupRole = document.getElementById("signupRole");
  const factoryNameField = document.getElementById("factoryNameField");

  const copy = {
    login: {
      eyebrow: "Welcome back",
      title: "Access your Opticus account",
      subtitle: "Use your email and password once - we'll open the right workspace for your account automatically."
    },
    signup: {
      eyebrow: "Create account",
      title: "Join Opticus",
      subtitle: "Create a client or factory account and continue into the right workspace."
    }
  };

  function setActiveTab(activeTab) {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.authTab === activeTab;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    loginForm?.classList.toggle("auth-form-active", activeTab === "login");
    signupForm?.classList.toggle("auth-form-active", activeTab === "signup");
    if (loginForm) loginForm.hidden = activeTab !== "login";
    if (signupForm) signupForm.hidden = activeTab !== "signup";

    const activeCopy = copy[activeTab];
    if (authEyebrow) authEyebrow.textContent = activeCopy.eyebrow;
    if (authTitle) authTitle.textContent = activeCopy.title;
    if (authSubtitle) authSubtitle.textContent = activeCopy.subtitle;
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setActiveTab(tab.dataset.authTab));
  });

  signupRole?.addEventListener("change", () => {
    if (factoryNameField) factoryNameField.hidden = signupRole.value !== "factory";
  });

  loginForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail")?.value || "";
    const password = document.getElementById("loginPassword")?.value || "";
    const error = document.getElementById("loginError");
    const button = document.getElementById("loginSubmit");

    if (error) error.textContent = "";
    if (button) {
      button.disabled = true;
      button.dataset.defaultText = button.dataset.defaultText || button.textContent;
      button.textContent = "ENTERING...";
    }

    window.setTimeout(() => {
      const ok = loginUser(email, password);
      const session = getSession();

      if (!ok || !session) {
        if (error) error.textContent = "Invalid email or password.";
        if (button) {
          button.disabled = false;
          button.textContent = button.dataset.defaultText || "ENTER OPTICUS";
        }
        return;
      }

      goAfterLogin(session.role);
    }, 220);
  });

  signupForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("signupName")?.value || "";
    const role = document.getElementById("signupRole")?.value || "client";
    const email = document.getElementById("signupEmail")?.value || "";
    const factoryName = document.getElementById("signupFactoryName")?.value || "";
    const password = document.getElementById("signupPassword")?.value || "";
    const confirm = document.getElementById("signupPasswordConfirm")?.value || "";
    const error = document.getElementById("signupError");
    const success = document.getElementById("signupSuccess");

    if (error) error.textContent = "";
    if (success) success.textContent = "";

    if (!String(name).trim() || !String(email).trim() || password.length < 6) {
      if (error) error.textContent = "Fill all required fields. Password must have at least 6 characters.";
      return;
    }

    if (password !== confirm) {
      if (error) error.textContent = "Passwords do not match.";
      return;
    }

    if (role === "factory" && !String(factoryName).trim()) {
      if (error) error.textContent = "Factory name is required for factory accounts.";
      return;
    }

    const result = createUser({ name, email, password, role, factoryName });

    if (!result.ok) {
      if (error) error.textContent = result.message;
      return;
    }

    if (success) success.textContent = "Account created. Opening your workspace...";
    loginUser(email, password, role);
    window.setTimeout(() => goAfterLogin(role), 500);
  });

  setActiveTab("login");
}

function renderSessionBadge(containerId = "sessionArea") {
  const target = document.getElementById(containerId);
  if (!target) return;

  const session = getSession();

  if (!session) {
    target.innerHTML = `<a href="${AUTH_PAGE}" class="btn">LOGIN</a>`;
    return;
  }

  target.innerHTML = `
    <div class="session-box">
      <span>${session.name} &middot; ${String(session.role).toUpperCase()}</span>
      <button class="btn" id="logoutBtn" type="button">LOGOUT</button>
    </div>
  `;

  document.getElementById("logoutBtn")?.addEventListener("click", logoutUser);
}

function renderFactoryOrders() {
  const tbody = document.getElementById("factoryOrdersBody");
  const title = document.getElementById("factoryTitle");
  if (!tbody) return;

  const session = getSession();
  if (!session || session.role !== "factory") return;

  if (title) {
    title.textContent = `${session.factoryName || "Factory"} Orders`;
  }

  const orders = getOrders().filter((o) => o.factoryId === session.id);

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">No orders for this factory yet.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders
    .map(
      (order) => `
        <tr>
          <td>${order.id}</td>
          <td>${order.customerName}</td>
          <td>${order.productName}</td>
          <td>${order.createdAt}</td>
          <td>${order.status}</td>
          <td>$${Number(order.total).toFixed(2)}</td>
        </tr>
      `
    )
    .join("");
}

function renderStaffDashboard() {
  const ordersTarget = document.getElementById("staffOrdersBody");
  const usersTarget = document.getElementById("staffUsersBody");
  const summaryTarget = document.getElementById("staffSummary");

  if (!ordersTarget || !usersTarget) return;

  const orders = getOrders();
  const users = getUsers();

  if (summaryTarget) {
    const clients = users.filter((u) => u.role === "client").length;
    const factories = users.filter((u) => u.role === "factory").length;
    const staff = users.filter((u) => u.role === "staff").length;

    summaryTarget.innerHTML = `
      <div class="summary-card"><strong>${orders.length}</strong><span>Total Orders</span></div>
      <div class="summary-card"><strong>${clients}</strong><span>Clients</span></div>
      <div class="summary-card"><strong>${factories}</strong><span>Factories</span></div>
      <div class="summary-card"><strong>${staff}</strong><span>Staff</span></div>
    `;
  }

  ordersTarget.innerHTML = orders
    .map(
      (order) => `
        <tr>
          <td>${order.id}</td>
          <td>${order.customerName}</td>
          <td>${order.productName}</td>
          <td>${order.factoryName}</td>
          <td>${order.status}</td>
          <td>$${Number(order.total).toFixed(2)}</td>
        </tr>
      `
    )
    .join("");

  usersTarget.innerHTML = users
    .map(
      (user) => `
        <tr>
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td>${String(user.role).toUpperCase()}</td>
          <td>${user.factoryName || "-"}</td>
        </tr>
      `
    )
    .join("");

    
}

