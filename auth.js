const LS_USERS = "opticus_users";
const LS_SESSION = "opticus_session";
const LS_ORDERS = "opticus_orders";

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
})();

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(LS_USERS)) || [];
  } catch {
    return [];
  }
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

function loginUser(email, password, expectedRole) {
  const users = getUsers();

  const user = users.find(
    (u) =>
      u.email.toLowerCase() === String(email).trim().toLowerCase() &&
      u.password === password &&
      u.role === expectedRole
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

function logoutUser() {
  clearSession();
  window.location.href = "login.html";
}

function requireRole(allowedRoles) {
  const session = getSession();

  if (!session || !allowedRoles.includes(session.role)) {
    window.location.href = "login.html";
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

  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("email")?.value || "";
    const password = document.getElementById("password")?.value || "";

    const ok = loginUser(email, password, expectedRole);

    if (!ok) {
      if (error) {
        error.textContent = "Invalid credentials for this portal.";
      }
      return;
    }

    goAfterLogin(expectedRole);
  });
}

function renderSessionBadge(containerId = "sessionArea") {
  const target = document.getElementById(containerId);
  if (!target) return;

  const session = getSession();

  if (!session) {
    target.innerHTML = `<a href="login.html" class="btn">LOGIN</a>`;
    return;
  }

  target.innerHTML = `
    <div class="session-box">
      <span>${session.name} · ${String(session.role).toUpperCase()}</span>
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

