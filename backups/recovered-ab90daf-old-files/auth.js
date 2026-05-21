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
        id: "factory-1",
        name: "Factory Demo",
        email: "factory@opticus.com",
        password: "123456",
        role: "factory",
        factoryName: "Opticus Factory"
      },
      {
        id: "staff-1",
        name: "Staff Demo",
        email: "staff@opticus.com",
        password: "123456",
        role: "staff"
      }
    ];

    localStorage.setItem(LS_USERS, JSON.stringify(demoUsers));
  }

  if (!localStorage.getItem(LS_ORDERS)) {
    localStorage.setItem(LS_ORDERS, JSON.stringify([]));
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

function loginUser(email, password) {
  const users = getUsers();

  const user = users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return { error: "Invalid email or password" };
  }

  setSession(user);
  return { user };
}

function registerUser({ name, email, password, role, factoryName }) {
  const users = getUsers();

  const exists = users.find((u) => u.email === email);
  if (exists) {
    return { error: "Email already registered" };
  }

  const newUser = {
    id: `${role}-${Date.now()}`,
    name,
    email,
    password,
    role,
    factoryName: role === "factory" ? factoryName || "Unnamed Factory" : null
  };

  users.push(newUser);
  setUsers(users);

  setSession(newUser);

  return { user: newUser };
}

function redirectByRole(user) {
  if (!user) return;

  if (user.role === "client") {
    window.location.href = "index.html";
  }

  if (user.role === "factory") {
    window.location.href = "factory-dashboard.html";
  }

  if (user.role === "staff") {
    window.location.href = "staff-dashboard.html";
  }
}

function requireRole(roles = []) {
  const session = getSession();

  if (!session || !roles.includes(session.role)) {
    window.location.href = "login_unified_professional.html";
  }
}

function logout() {
  clearSession();
  window.location.href = "login_unified_professional.html";
}

function initUnifiedAuthPage() {
  const tabs = document.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const loginError = document.getElementById('loginError');
  const signupError = document.getElementById('signupError');
  const signupSuccess = document.getElementById('signupSuccess');
  const factoryNameField = document.getElementById('factoryNameField');
  const signupRole = document.getElementById('signupRole');

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');

      const target = tab.dataset.authTab;
      if (target === 'login') {
        loginForm.classList.add('auth-form-active');
        signupForm.classList.remove('auth-form-active');
        loginForm.hidden = false;
        signupForm.hidden = true;
      } else {
        signupForm.classList.add('auth-form-active');
        loginForm.classList.remove('auth-form-active');
        signupForm.hidden = false;
        loginForm.hidden = true;
      }
    });
  });

  // Role change for signup
  signupRole.addEventListener('change', () => {
    if (signupRole.value === 'factory') {
      factoryNameField.hidden = false;
    } else {
      factoryNameField.hidden = true;
    }
  });

  // Login form submit
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const result = loginUser(email, password);
    if (result.error) {
      loginError.textContent = result.error;
      loginError.style.display = 'block';
    } else {
      loginError.style.display = 'none';
      redirectByRole(result.user);
    }
  });

  // Signup form submit
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
    const role = document.getElementById('signupRole').value;
    const factoryName = document.getElementById('signupFactoryName').value;

    if (password !== passwordConfirm) {
      signupError.textContent = 'Passwords do not match';
      signupError.style.display = 'block';
      return;
    }

    const result = registerUser({ name, email, password, role, factoryName });
    if (result.error) {
      signupError.textContent = result.error;
      signupError.style.display = 'block';
      signupSuccess.style.display = 'none';
    } else {
      signupError.style.display = 'none';
      signupSuccess.textContent = 'Account created successfully!';
      signupSuccess.style.display = 'block';
      setTimeout(() => redirectByRole(result.user), 1000);
    }
  });
}

function renderSessionBadge() {
  const session = getSession();
  const element = document.getElementById('sessionArea');
  if (!element || !session) return;

  element.innerHTML = `
    <div class="session-badge">
      <span>${session.name} (${session.role})</span>
      <button onclick="logout()" class="btn-logout">Logout</button>
    </div>
  `;
}

function renderFactoryOrders() {
  const session = getSession();
  if (!session || session.role !== 'factory') return;

  const orders = JSON.parse(localStorage.getItem(LS_ORDERS) || '[]');
  const factoryOrders = orders.filter(o => o.factoryId === session.id);

  const tbody = document.getElementById('factoryOrdersBody');
  if (!tbody) return;

  if (factoryOrders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">No orders assigned to this factory.</td></tr>';
    return;
  }

  const html = factoryOrders.map(order => `
    <tr>
      <td>${order.id}</td>
      <td>${order.clientName}</td>
      <td>${order.productName}</td>
      <td>${new Date(order.createdAt).toLocaleDateString()}</td>
      <td>${order.status}</td>
      <td>$${order.total}</td>
    </tr>
  `).join('');
  tbody.innerHTML = html;
}

function renderStaffDashboard() {
  const session = getSession();
  if (!session || session.role !== 'staff') return;

  const users = getUsers();
  const orders = JSON.parse(localStorage.getItem(LS_ORDERS) || '[]');

  // Summary
  const summary = document.getElementById('staffSummary');
  if (summary) {
    const totalUsers = users.length;
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;

    summary.innerHTML = `
      <div class="summary-card">
        <strong>${totalUsers}</strong>
        <span>Total Users</span>
      </div>
      <div class="summary-card">
        <strong>${totalOrders}</strong>
        <span>Total Orders</span>
      </div>
      <div class="summary-card">
        <strong>${pendingOrders}</strong>
        <span>Pending Orders</span>
      </div>
      <div class="summary-card">
        <strong>${completedOrders}</strong>
        <span>Completed Orders</span>
      </div>
    `;
  }

  // Orders table
  const ordersBody = document.getElementById('staffOrdersBody');
  if (ordersBody) {
    if (orders.length === 0) {
      ordersBody.innerHTML = '<tr><td colspan="6">No orders yet.</td></tr>';
    } else {
      const html = orders.map(order => `
        <tr>
          <td>${order.id}</td>
          <td>${order.clientName}</td>
          <td>${order.productName}</td>
          <td>${order.factoryName || 'N/A'}</td>
          <td>${order.status}</td>
          <td>$${order.total}</td>
        </tr>
      `).join('');
      ordersBody.innerHTML = html;
    }
  }

  // Users table
  const usersBody = document.getElementById('staffUsersBody');
  if (usersBody) {
    const html = users.map(user => `
      <tr>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.role}</td>
        <td>${user.factoryName || 'N/A'}</td>
      </tr>
    `).join('');
    usersBody.innerHTML = html;
  }
}