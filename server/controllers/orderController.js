// ============================================================
//   ORDER CONTROLLER — Pedidos de óculos customizados
//   Migrado de PostgreSQL ($1,$2) para MySQL (?, pool.execute)
// ============================================================

import pool from "../config/db.js";
import { sendOrderStatusEmail } from "../utils/emailService.js";

// ─────────────────────────────────────────────────────────
//   CRIAR PEDIDO
//   POST /api/orders
// ─────────────────────────────────────────────────────────
export async function createOrder(req, res) {
  const { productName, factoryId, factoryName, total, customSpecs, status } = req.body;

  if (!productName || !factoryId || !factoryName || !total || !customSpecs) {
    return res.status(400).json({
      success: false,
      error: "Forneça todos os parâmetros obrigatórios do pedido."
    });
  }

  const customerName  = req.user.name;
  const customerEmail = req.user.email;
  const usuarioId     = req.user.id; // INT no MySQL

  try {
    const [result] = await pool.execute(
      `INSERT INTO pedidos
       (usuario_id, customer_name, customer_email, product_name,
        factory_id, factory_name, total, custom_specs, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        customerName,
        customerEmail,
        productName,
        Number(factoryId) || null,
        factoryName,
        Number(total),
        JSON.stringify(customSpecs),
        status || "Queued"
      ]
    );

    const pedidoId = result.insertId;

    // Retorna o pedido recém-criado
    const [rows] = await pool.execute(
      `SELECT
        id,
        customer_name   AS customerName,
        customer_email  AS customerEmail,
        product_name    AS productName,
        factory_id      AS factoryId,
        factory_name    AS factoryName,
        status,
        total,
        custom_specs    AS customSpecs,
        abacate_billing_id AS abacateBillingId,
        DATE(criado_em) AS createdAt
       FROM pedidos WHERE id = ?`,
      [pedidoId]
    );

    const pedido = rows[0];
    pedido.customSpecs = JSON.parse(pedido.customSpecs || "{}");

    return res.status(201).json({ success: true, order: pedido });

  } catch (err) {
    console.error("Erro ao criar pedido:", err);
    return res.status(500).json({ success: false, error: "Falha ao registrar pedido." });
  }
}

// ─────────────────────────────────────────────────────────
//   LISTAR PEDIDOS (baseado no role do usuário)
//   GET /api/orders
// ─────────────────────────────────────────────────────────
export async function getOrders(req, res) {
  const { role, email, id } = req.user;

  const selectFields = `
    id,
    customer_name   AS customerName,
    customer_email  AS customerEmail,
    product_name    AS productName,
    factory_id      AS factoryId,
    factory_name    AS factoryName,
    status,
    total,
    custom_specs    AS customSpecs,
    abacate_billing_id AS abacateBillingId,
    DATE(criado_em)    AS createdAt,
    DATE(atualizado_em) AS updatedAt
  `;

  try {
    let rows;

    if (role === "client") {
      // Cliente vê apenas seus próprios pedidos
      [rows] = await pool.execute(
        `SELECT ${selectFields} FROM pedidos WHERE customer_email = ? ORDER BY criado_em DESC`,
        [email]
      );
    } else if (role === "factory") {
      // Fábrica vê apenas os pedidos destinados a ela
      [rows] = await pool.execute(
        `SELECT ${selectFields} FROM pedidos WHERE factory_id = ? ORDER BY criado_em DESC`,
        [id]
      );
    } else if (role === "staff") {
      // Staff vê todos os pedidos
      [rows] = await pool.execute(
        `SELECT ${selectFields} FROM pedidos ORDER BY criado_em DESC`
      );
    } else {
      return res.status(403).json({ success: false, error: "Acesso não autorizado." });
    }

    // Converte custom_specs de string JSON para objeto
    const parsedRows = rows.map(r => ({
      ...r,
      customSpecs: r.customSpecs ? JSON.parse(r.customSpecs) : {}
    }));

    return res.json({ success: true, orders: parsedRows });

  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
    return res.status(500).json({ success: false, error: "Falha ao carregar pedidos." });
  }
}

// ─────────────────────────────────────────────────────────
//   ATUALIZAR STATUS DO PEDIDO
//   PUT /api/orders/:id/status
// ─────────────────────────────────────────────────────────
export async function updateOrderStatus(req, res) {
  const { id }     = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, error: "Informe o novo status." });
  }

  const validStatuses = ["Queued", "In production", "Delivered", "Pending Payment", "Cancelled"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: "Status inválido." });
  }

  try {
    // Apenas fábricas e staff podem atualizar
    if (req.user.role !== "factory" && req.user.role !== "staff") {
      return res.status(403).json({
        success: false,
        error: "Apenas fábricas e staff podem atualizar o status."
      });
    }

    // Fábrica só pode atualizar pedidos que foram destinados a ela
    if (req.user.role === "factory") {
      const [rows] = await pool.execute(
        "SELECT factory_id FROM pedidos WHERE id = ?",
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: "Pedido não encontrado." });
      }

      if (rows[0].factory_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Pedido pertence a outra fábrica."
        });
      }
    }

    // Atualiza o status (atualizado_em é atualizado automaticamente pelo MySQL)
    const [result] = await pool.execute(
      "UPDATE pedidos SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Pedido não encontrado." });
    }

    // Busca o pedido atualizado para enviar email
    const [updated] = await pool.execute("SELECT * FROM pedidos WHERE id = ?", [id]);
    if (updated.length > 0) {
      sendOrderStatusEmail(updated[0], status);
    }

    return res.json({
      success: true,
      message: `Status do pedido atualizado para "${status}" com sucesso.`
    });

  } catch (err) {
    console.error("Erro ao atualizar status:", err);
    return res.status(500).json({ success: false, error: "Falha ao atualizar status." });
  }
}

// ─────────────────────────────────────────────────────────
//   CHECKOUT DO CARRINHO
//   POST /api/orders/checkout-cart
// ─────────────────────────────────────────────────────────
export async function checkoutCart(req, res) {
  const { cartItems } = req.body;

  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Forneça um array cartItems não vazio."
    });
  }

  const customerName  = req.user.name;
  const customerEmail = req.user.email;
  const usuarioId     = req.user.id;
  const consolidatedBillingId = `bill-sim-${Math.floor(100000 + Math.random() * 900000)}`;

  try {
    const createdOrders = [];

    for (const item of cartItems) {
      const { productName, factoryId, factoryName, total, customSpecs, quantity } = item;

      if (!productName || !factoryId || !factoryName || !total || !customSpecs) {
        return res.status(400).json({
          success: false,
          error: "Parâmetros faltando em um dos itens do carrinho."
        });
      }

      const specsWithQty    = { ...customSpecs, quantity: quantity || 1 };
      const orderTotal      = Number(total) * (quantity || 1);

      const [result] = await pool.execute(
        `INSERT INTO pedidos
         (usuario_id, customer_name, customer_email, product_name,
          factory_id, factory_name, total, custom_specs, status, abacate_billing_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending Payment', ?)`,
        [
          usuarioId,
          customerName,
          customerEmail,
          productName,
          Number(factoryId) || null,
          factoryName,
          orderTotal,
          JSON.stringify(specsWithQty),
          consolidatedBillingId
        ]
      );

      createdOrders.push({
        id: result.insertId,
        productName,
        total: orderTotal,
        factoryId,
        factoryName
      });
    }

    // Tenta criar billing real no AbacatePay
    const ABACATE_TOKEN = process.env.ABACATE_TOKEN;
    const PORT          = process.env.PORT || 5000;
    const isMockToken   = !ABACATE_TOKEN || ABACATE_TOKEN.includes("your_abacatepay_token_here");

    if (!isMockToken) {
      try {
        const totalAmountInCents = createdOrders.reduce(
          (sum, ord) => sum + Math.round(ord.total * 100), 0
        );

        const abacateProducts = cartItems.map((item, idx) => ({
          externalId: String(createdOrders[idx].id),
          name:       item.productName,
          quantity:   item.quantity || 1,
          price:      Math.round(Number(item.total) * 100)
        }));

        const abacateResponse = await fetch("https://api.abacatepay.com/v2/billing", {
          method:  "POST",
          headers: {
            Authorization:  `Bearer ${ABACATE_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            frequency:     "ONE_TIME",
            methods:       ["PIX"],
            products:      abacateProducts,
            returnUrl:     `http://localhost:${PORT === "5000" ? 5174 : 5173}`,
            completionUrl: `http://localhost:${PORT === "5000" ? 5174 : 5173}`,
            customer:      { name: customerName, email: customerEmail, taxId: "00000000000" }
          })
        });

        const abacateData = await abacateResponse.json();

        if (abacateResponse.ok && abacateData.success) {
          const realBillingId  = abacateData.data.id;
          const realCheckoutUrl = abacateData.data.url;

          await pool.execute(
            "UPDATE pedidos SET abacate_billing_id = ? WHERE abacate_billing_id = ?",
            [realBillingId, consolidatedBillingId]
          );

          return res.json({
            success:     true,
            checkoutUrl: realCheckoutUrl,
            isSimulated: false,
            billingId:   realBillingId
          });
        }
      } catch (err) {
        console.error("[AbacatePay] Erro, usando simulador:", err.message);
      }
    }

    // Fallback: simulador local
    const simulatedCheckoutUrl = `http://localhost:${PORT}/api/payments/simulated-checkout?billingId=${consolidatedBillingId}`;

    return res.json({
      success:     true,
      checkoutUrl: simulatedCheckoutUrl,
      isSimulated: true,
      billingId:   consolidatedBillingId
    });

  } catch (err) {
    console.error("Erro no checkout:", err);
    return res.status(500).json({ success: false, error: "Falha no checkout." });
  }
}
