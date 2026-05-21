import pool from "../config/db.js";

const ABACATE_TOKEN = process.env.ABACATE_TOKEN;
const PORT = process.env.PORT || 5000;

// Create a billing with AbacatePay (or fallback to simulator)
export async function createBilling(req, res) {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ success: false, error: "Please provide an orderId." });
  }

  try {
    // 1. Fetch order details from PostgreSQL
    const { rows } = await pool.query("SELECT * FROM orders WHERE id = $1;", [orderId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Order not found." });
    }

    const order = rows[0];
    const amountInCents = Math.round(Number(order.total) * 100);

    // 2. Check if we have a real AbacatePay token
    const isMockToken = !ABACATE_TOKEN || ABACATE_TOKEN.includes("your_abacatepay_token_here");
    
    if (isMockToken) {
      // Create local simulated billing
      const mockBillingId = `bill-sim-${Math.floor(100000 + Math.random() * 900000)}`;
      await pool.query(
        "UPDATE orders SET abacate_billing_id = $1, status = 'Pending Payment' WHERE id = $2;",
        [mockBillingId, orderId]
      );

      const mockCheckoutUrl = `http://localhost:${PORT}/api/payments/simulated-checkout?billingId=${mockBillingId}&orderId=${orderId}`;
      
      console.log(`[AbacatePay Simulator] Generated checkout for Order: ${orderId}, Billing: ${mockBillingId}`);
      return res.json({
        success: true,
        checkoutUrl: mockCheckoutUrl,
        isSimulated: true
      });
    }

    // 3. Make real AbacatePay API call
    console.log(`[AbacatePay API] Directing call for order ${orderId} (Amount: ${amountInCents} cents)...`);
    const abacateResponse = await fetch("https://api.abacatepay.com/v2/billing", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ABACATE_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        frequency: "ONE_TIME",
        methods: ["PIX"],
        products: [
          {
            externalId: order.id,
            name: order.product_name,
            quantity: 1,
            price: amountInCents
          }
        ],
        returnUrl: "http://localhost:5173",
        completionUrl: "http://localhost:5173",
        customer: {
          name: order.customer_name,
          email: order.customer_email,
          taxId: "00000000000" // Placeholder CPF for testing
        }
      })
    });

    const abacateData = await abacateResponse.json();

    if (!abacateResponse.ok || !abacateData.success) {
      throw new Error(abacateData.error || `AbacatePay HTTP error ${abacateResponse.status}`);
    }

    const realBillingId = abacateData.data.id;
    const realCheckoutUrl = abacateData.data.url;

    // Update order with billing details
    await pool.query(
      "UPDATE orders SET abacate_billing_id = $1, status = 'Pending Payment' WHERE id = $2;",
      [realBillingId, orderId]
    );

    return res.json({
      success: true,
      checkoutUrl: realCheckoutUrl,
      isSimulated: false
    });

  } catch (err) {
    console.error("AbacatePay create billing error:", err.message);
    
    // Auto-fallback to simulator to prevent app breaks during local test runs
    const fallbackBillingId = `bill-fallback-${Math.floor(100000 + Math.random() * 900000)}`;
    await pool.query(
      "UPDATE orders SET abacate_billing_id = $1, status = 'Pending Payment' WHERE id = $2;",
      [fallbackBillingId, orderId]
    );

    const fallbackUrl = `http://localhost:${PORT}/api/payments/simulated-checkout?billingId=${fallbackBillingId}&orderId=${orderId}`;
    
    return res.json({
      success: true,
      checkoutUrl: fallbackUrl,
      isSimulated: true,
      notice: "Fell back to simulator due to API error."
    });
  }
}

// Render the simulated interactive checkout page (Pix panel mockup)
export async function getSimulatedCheckoutPage(req, res) {
  const { billingId } = req.query;

  if (!billingId) {
    return res.status(400).send("<h3>Missing billingId parameter.</h3>");
  }

  try {
    const { rows: orders } = await pool.query("SELECT * FROM orders WHERE abacate_billing_id = $1;", [billingId]);
    if (orders.length === 0) {
      return res.status(404).send("<h3>No orders found for this billing reference.</h3>");
    }

    const totalAmount = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const customerName = orders[0].customer_name;
    const customerEmail = orders[0].customer_email;

    const itemsHtml = orders.map(o => `
      <div class="detail-row">
        <span>${o.product_name}:</span>
        <strong>R$ ${Number(o.total).toFixed(2)}</strong>
      </div>
    `).join("");

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AbacatePay Simulator | Opticus Eyewear</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
          :root {
            --bg-color: #0d1117;
            --card-bg: rgba(22, 27, 34, 0.7);
            --border-color: rgba(240, 246, 252, 0.1);
            --accent-green: #22c55e;
            --text-light: #f0f6fc;
            --text-gray: #8b949e;
          }
          body {
            background-color: var(--bg-color);
            color: var(--text-light);
            font-family: 'Outfit', sans-serif;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .checkout-container {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            backdrop-filter: blur(16px);
            border-radius: 12px;
            padding: 40px;
            max-width: 460px;
            width: 90%;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
            text-align: center;
          }
          .logo {
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #fff;
            margin-bottom: 24px;
          }
          .badge {
            background: rgba(34, 197, 94, 0.15);
            color: var(--accent-green);
            font-size: 11px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: inline-block;
            margin-bottom: 12px;
          }
          .title {
            font-size: 20px;
            margin: 0 0 10px 0;
          }
          .amount {
            font-size: 32px;
            font-weight: 700;
            margin: 15px 0;
            color: var(--accent-green);
          }
          .order-details {
            border-top: 1px solid var(--border-color);
            border-bottom: 1px solid var(--border-color);
            padding: 15px 0;
            margin: 20px 0;
            text-align: left;
            font-size: 14px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .detail-row span:first-child {
            color: var(--text-gray);
          }
          .qr-placeholder {
            background: #fff;
            padding: 15px;
            border-radius: 10px;
            display: inline-block;
            margin: 15px 0;
          }
          .qr-code {
            width: 180px;
            height: 180px;
            background: #ccc;
            /* Mocking QR code visual */
            background-image: repeating-linear-gradient(45deg, #000 0px, #000 2px, transparent 2px, transparent 10px),
                              repeating-linear-gradient(-45deg, #000 0px, #000 2px, #fff 2px, #fff 10px);
            border: 4px solid #fff;
          }
          .hint {
            font-size: 12px;
            color: var(--text-gray);
            margin-bottom: 24px;
            line-height: 1.4;
          }
          .pay-btn {
            background: var(--accent-green);
            color: #fff;
            border: none;
            padding: 14px 28px;
            font-size: 16px;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
            width: 100%;
            transition: all 0.3s ease;
            text-transform: uppercase;
            box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
          }
          .pay-btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
          }
        </style>
      </head>
      <body>
        <div class="checkout-container">
          <div class="logo">ABACATEPAY <span style="font-weight:300;color:var(--accent-green)">SIMULATOR</span></div>
          <span class="badge">Pix Payment Panel</span>
          <h2 class="title">Opticus Eyewear Checkout</h2>
          
          <div class="amount">R$ ${Number(totalAmount).toFixed(2)}</div>
          
          <div class="qr-placeholder">
            <div class="qr-code"></div>
          </div>
          
          <p class="hint">Aponte o celular para o QR Code acima ou simule o pagamento Pix instantâneo clicando no botão abaixo.</p>

          <div class="order-details">
            <h4 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; color: var(--accent-green);">Itens do Pedido:</h4>
            ${itemsHtml}
            <div style="border-top: 1px dashed var(--border-color); margin: 10px 0;"></div>
            <div class="detail-row">
              <span>Billing Reference:</span>
              <strong style="font-size:11px;color:var(--text-gray)">${billingId}</strong>
            </div>
            <div class="detail-row">
              <span>Customer:</span>
              <strong>${customerName} (${customerEmail})</strong>
            </div>
          </div>

          <form action="/api/payments/confirm-simulated-payment" method="POST">
            <input type="hidden" name="billingId" value="${billingId}" />
            <button type="submit" class="pay-btn">Simular Pagamento Pix</button>
          </form>
        </div>
      </body>
      </html>
    `;
    return res.send(html);
  } catch (err) {
    console.error("Simulated checkout error:", err);
    return res.status(500).send("<h3>Failed to load checkout portal.</h3>");
  }
}

// Handle simulated checkout redirection / validation
export async function confirmSimulatedPayment(req, res) {
  const { billingId } = req.body;

  if (!billingId) {
    return res.status(400).send("<h3>Missing billing details.</h3>");
  }

  try {
    // 1. Transition all orders under this billing ID from 'Pending Payment' to 'Queued'
    await pool.query(
      "UPDATE orders SET status = 'Queued' WHERE abacate_billing_id = $1;",
      [billingId]
    );

    console.log(`[AbacatePay Simulator] Payment Confirmed! Orders under billing ${billingId} moved to Factory Queue.`);

    // 2. Redirect the user back to the client React SPA (Vite port 5174 or 5173 dynamically based on headers)
    const referer = req.headers.referer || "http://localhost:5174";
    const redirectUrl = referer.includes("5173") 
      ? "http://localhost:5173/?payment=success" 
      : "http://localhost:5174/?payment=success";

    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("Confirm simulated payment error:", err);
    return res.status(500).send("<h3>Payment simulation failed.</h3>");
  }
}

// Receive webhooks from AbacatePay server for payment confirmations
export async function handleWebhook(req, res) {
  const payload = req.body;

  console.log("[AbacatePay Webhook] Received webhook payload:", JSON.stringify(payload));

  try {
    // Real AbacatePay webhook events:
    // Event: "billing.paid", inside billing object "id"
    if (payload.event === "billing.paid" && payload.data && payload.data.id) {
      const billingId = payload.data.id;
      
      const { rows } = await pool.query("SELECT id FROM orders WHERE abacate_billing_id = $1;", [billingId]);
      
      if (rows.length > 0) {
        await pool.query("UPDATE orders SET status = 'Queued' WHERE abacate_billing_id = $1;", [billingId]);
        console.log(`[Webhook success] Real payment verified. ${rows.length} orders routed to Factory.`);
      } else {
        console.warn(`[Webhook warning] No order found matching billing ID: ${billingId}`);
      }
    }

    // Always acknowledge webhook with 200 OK to AbacatePay servers
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
