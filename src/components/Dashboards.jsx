import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ShoppingBag, Users, Building, ShieldCheck, DollarSign } from "lucide-react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export function FactoryDashboard() {
  const { session, orders, updateOrderStatus } = useAuth();
  
  if (!session || session.role !== "factory") {
    return <p>Access denied.</p>;
  }

  const factoryOrders = orders.filter((o) => o.factoryId === session.id);

  const handleStatusChange = (orderId, newStatus) => {
    updateOrderStatus(orderId, newStatus);
  };

  // 1. Calculate Summary Stats
  const totalRevenue = factoryOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const totalOrders = factoryOrders.length;
  const avgTicket = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

  // 2. Calculate Pie Chart (Status Distribution)
  const statusCount = { Queued: 0, "In production": 0, Delivered: 0, "Pending Payment": 0 };
  factoryOrders.forEach((o) => {
    if (statusCount[o.status] !== undefined) statusCount[o.status]++;
  });
  const pieData = Object.keys(statusCount).map((key) => ({
    name: key,
    value: statusCount[key]
  })).filter(d => d.value > 0);
  const COLORS = ["#eab308", "#3b82f6", "#22c55e", "#ef4444"];

  // 3. Calculate Area Chart (Revenue over time)
  const dateMap = {};
  factoryOrders.forEach(o => {
    const d = o.createdAt || "Recent";
    if (!dateMap[d]) dateMap[d] = 0;
    dateMap[d] += Number(o.total);
  });
  const areaData = Object.keys(dateMap).map(d => ({
    date: d,
    revenue: dateMap[d]
  })).sort((a,b) => a.date.localeCompare(b.date));

  return (
    <div className="factory-dashboard-container" style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto" }}>
      <header className="dashboard-header" style={{ marginBottom: "30px" }}>
        <span className="eyebrow" style={{ color: "var(--primary-accent)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>
          Production Line Portal
        </span>
        <h1 style={{ fontSize: "32px", margin: "8px 0" }} id="factoryTitle">
          {session.factoryName || "Partner Factory"} Dashboard
        </h1>
        <p style={{ color: "var(--color-hint)" }}>Track production metrics and manage your pending orders.</p>
      </header>

      {/* Summary Cards */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        <div className="premium-glass-card" style={{ padding: "24px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "14px", color: "var(--color-hint)" }}>Total em Vendas</span>
            <strong style={{ display: "block", fontSize: "32px", fontWeight: "700" }}>${totalRevenue.toFixed(2)}</strong>
          </div>
          <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
            <DollarSign size={28} />
          </div>
        </div>

        <div className="premium-glass-card" style={{ padding: "24px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "14px", color: "var(--color-hint)" }}>Total de Produções</span>
            <strong style={{ display: "block", fontSize: "32px", fontWeight: "700" }}>{totalOrders}</strong>
          </div>
          <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: "rgba(99, 102, 241, 0.1)", color: "#6366f1" }}>
            <ShoppingBag size={28} />
          </div>
        </div>

        <div className="premium-glass-card" style={{ padding: "24px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "14px", color: "var(--color-hint)" }}>Ticket Médio</span>
            <strong style={{ display: "block", fontSize: "32px", fontWeight: "700" }}>${avgTicket}</strong>
          </div>
          <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: "rgba(234, 179, 8, 0.1)", color: "#eab308" }}>
            <DollarSign size={28} />
          </div>
        </div>
      </section>

      {/* Analytics Charts */}
      <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", marginBottom: "40px" }}>
        <div className="premium-glass-card" style={{ padding: "24px", borderRadius: "8px" }}>
          <h2 style={{ fontSize: "16px", marginBottom: "20px", color: "var(--color-hint)" }}>Desempenho de Vendas</h2>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer>
              <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--color-hint)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-hint)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "rgba(10, 10, 15, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="premium-glass-card" style={{ padding: "24px", borderRadius: "8px" }}>
          <h2 style={{ fontSize: "16px", marginBottom: "20px", color: "var(--color-hint)" }}>Distribuição por Status</h2>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "rgba(10, 10, 15, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }} />
                <Legend wrapperStyle={{ color: "var(--text-color)", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Orders Table */}
      <section className="dashboard-content premium-glass-card" style={{ borderRadius: "8px", padding: "24px", overflowX: "auto" }}>
        <h2 style={{ fontSize: "18px", marginBottom: "20px" }}>Gerenciar Fila de Produção</h2>
        <table className="dashboard-table premium-table" style={{ width: "100%", minWidth: "800px" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>Order ID</th>
              <th>Customer Name</th>
              <th>Product Name</th>
              <th>Created At</th>
              <th>Status</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="factoryOrdersBody">
            {factoryOrders.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: "40px", textAlign: "center", color: "var(--color-hint)" }}>
                  No orders routed to your factory yet.
                </td>
              </tr>
            ) : (
              factoryOrders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: "600" }}>{order.id}</td>
                  <td>{order.customerName}</td>
                  <td>{order.productName}</td>
                  <td>{order.createdAt}</td>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        backgroundColor:
                          order.status === "Delivered"
                            ? "rgba(34, 197, 94, 0.1)"
                            : order.status === "In production"
                            ? "rgba(59, 130, 246, 0.1)"
                            : "rgba(234, 179, 8, 0.1)",
                        color:
                          order.status === "Delivered"
                            ? "#22c55e"
                            : order.status === "In production"
                            ? "#3b82f6"
                            : "#eab308"
                      }}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td>${Number(order.total).toFixed(2)}</td>
                  <td>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="premium-select"
                    >
                      <option value="Queued">Queued</option>
                      <option value="In production">In production</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function StaffDashboard() {
  const { session, orders, users } = useAuth();

  if (!session || session.role !== "staff") {
    return <p>Access denied.</p>;
  }

  const clientsCount = users.filter((u) => u.role === "client").length;
  const factoriesCount = users.filter((u) => u.role === "factory").length;
  const staffCount = users.filter((u) => u.role === "staff").length;

  // Analytics Calculations
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);

  const statusCount = { Queued: 0, "In production": 0, Delivered: 0, "Pending Payment": 0 };
  orders.forEach((o) => {
    if (statusCount[o.status] !== undefined) statusCount[o.status]++;
  });

  const pieData = Object.keys(statusCount).map((key) => ({
    name: key,
    value: statusCount[key]
  })).filter(d => d.value > 0);

  const COLORS = ["#eab308", "#3b82f6", "#22c55e", "#ef4444"];

  const factoryMap = {};
  orders.forEach((o) => {
    const fname = o.factoryName || "Unknown";
    if (!factoryMap[fname]) factoryMap[fname] = 0;
    factoryMap[fname] += Number(o.total);
  });
  const barData = Object.keys(factoryMap).map((key) => ({
    name: key,
    revenue: Number(factoryMap[key].toFixed(2))
  }));

  return (
    <div className="staff-dashboard-container" style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto" }}>
      <header className="dashboard-header" style={{ marginBottom: "35px" }}>
        <span className="eyebrow" style={{ color: "var(--primary-accent)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>
          Platform Management Console
        </span>
        <h1 style={{ fontSize: "32px", margin: "8px 0" }}>Operations Dashboard</h1>
        <p style={{ color: "var(--color-hint)" }}>Core metrics, platform users database, and order dispatch status.</p>
      </header>

      {/* Summary Stats Widgets */}
      <section
        className="summary-stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          marginBottom: "40px"
        }}
        id="staffSummary"
      >
        <div
          className="summary-card premium-glass-card"
          style={{
            padding: "20px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "16px"
          }}
        >
          <div style={{ padding: "10px", borderRadius: "6px", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
            <DollarSign size={24} />
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "28px", fontWeight: "700" }}>${totalRevenue.toFixed(2)}</strong>
            <span style={{ fontSize: "13px", color: "var(--color-hint)" }}>Total Revenue</span>
          </div>
        </div>

        <div
          className="summary-card premium-glass-card"
          style={{
            padding: "20px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "16px"
          }}
        >
          <div style={{ padding: "10px", borderRadius: "6px", backgroundColor: "rgba(99, 102, 241, 0.1)", color: "#6366f1" }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "28px", fontWeight: "700" }}>{orders.length}</strong>
            <span style={{ fontSize: "13px", color: "var(--color-hint)" }}>Total Orders</span>
          </div>
        </div>

        <div
          className="summary-card premium-glass-card"
          style={{
            padding: "20px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "16px"
          }}
        >
          <div style={{ padding: "10px", borderRadius: "6px", backgroundColor: "rgba(34, 197, 94, 0.1)", color: "#22c55e" }}>
            <Users size={24} />
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "28px", fontWeight: "700" }}>{clientsCount}</strong>
            <span style={{ fontSize: "13px", color: "var(--color-hint)" }}>Clients</span>
          </div>
        </div>

        <div
          className="summary-card premium-glass-card"
          style={{
            padding: "20px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "16px"
          }}
        >
          <div style={{ padding: "10px", borderRadius: "6px", backgroundColor: "rgba(234, 179, 8, 0.1)", color: "#eab308" }}>
            <Building size={24} />
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "28px", fontWeight: "700" }}>{factoriesCount}</strong>
            <span style={{ fontSize: "13px", color: "var(--color-hint)" }}>Partner Factories</span>
          </div>
        </div>

        <div
          className="summary-card premium-glass-card"
          style={{
            padding: "20px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "16px"
          }}
        >
          <div style={{ padding: "10px", borderRadius: "6px", backgroundColor: "rgba(236, 72, 153, 0.1)", color: "#ec4899" }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "28px", fontWeight: "700" }}>{staffCount}</strong>
            <span style={{ fontSize: "13px", color: "var(--color-hint)" }}>Staff</span>
          </div>
        </div>
      </section>

      {/* Analytics Charts Section */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        <div className="premium-glass-card" style={{ padding: "20px", borderRadius: "8px" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "20px" }}>Revenue by Factory</h2>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer>
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="var(--text-color)" fontSize={12} />
                <YAxis stroke="var(--text-color)" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "rgba(10, 10, 15, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="premium-glass-card" style={{ padding: "20px", borderRadius: "8px" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "20px" }}>Order Status Distribution</h2>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "rgba(10, 10, 15, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }} />
                <Legend wrapperStyle={{ color: "var(--text-color)", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Grid of Tables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "40px" }}>
        
        {/* Table 1: Orders */}
        <section className="premium-glass-card" style={{ borderRadius: "8px", padding: "20px" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Platform Orders Log</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="dashboard-table premium-table" style={{ width: "100%", minWidth: "700px" }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th>Order ID</th>
                  <th>Client</th>
                  <th>Product</th>
                  <th>Factory Partner</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody id="staffOrdersBody">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: "600" }}>{order.id}</td>
                    <td>{order.customerName}</td>
                    <td>{order.productName}</td>
                    <td>{order.factoryName}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 6px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "600",
                          backgroundColor:
                            order.status === "Delivered"
                              ? "rgba(34, 197, 94, 0.1)"
                              : order.status === "In production"
                              ? "rgba(59, 130, 246, 0.1)"
                              : "rgba(234, 179, 8, 0.1)",
                          color:
                            order.status === "Delivered"
                              ? "#22c55e"
                              : order.status === "In production"
                              ? "#3b82f6"
                              : "#eab308"
                        }}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td>${Number(order.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Table 2: Users */}
        <section className="premium-glass-card" style={{ borderRadius: "8px", padding: "20px" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Platform Registered Users</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="dashboard-table premium-table" style={{ width: "100%", minWidth: "700px" }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Factory Affiliation</th>
                </tr>
              </thead>
              <tbody id="staffUsersBody">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: "600" }}>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          color:
                            user.role === "staff"
                              ? "#ec4899"
                              : user.role === "factory"
                              ? "#eab308"
                              : "#22c55e"
                        }}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td>{user.factoryName || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
