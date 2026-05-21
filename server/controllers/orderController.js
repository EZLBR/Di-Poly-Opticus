import pool from "../config/db.js";
import { sendOrderStatusEmail } from "../utils/emailService.js";

// Place a new custom eyewear order
export async function createOrder(req, res) {
  const { productName, factoryId, factoryName, total, customSpecs, status } = req.body;

  if (!productName || !factoryId || !factoryName || !total || !customSpecs) {
    return res.status(400).json({ success: false, error: "Please provide all required order parameters." });
  }

  const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
  const customerName = req.user.name;
  const customerEmail = req.user.email;

  try {
    await pool.query(
      "INSERT INTO orders (id, customer_name, customer_email, product_name, factory_id, factory_name, total, custom_specs, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);",
      [
        orderId,
        customerName,
        customerEmail,
        productName,
        factoryId,
        factoryName,
        Number(total),
        JSON.stringify(customSpecs),
        status || "Queued"
      ]
    );

    const { rows } = await pool.query(`
      SELECT 
        id,
        customer_name AS "customerName",
        customer_email AS "customerEmail",
        product_name AS "productName",
        factory_id AS "factoryId",
        factory_name AS "factoryName",
        status,
        total,
        custom_specs AS "customSpecs",
        abacate_billing_id AS "abacateBillingId",
        DATE(created_at) AS "createdAt"
      FROM orders WHERE id = $1;
    `, [orderId]);

    return res.status(201).json({
      success: true,
      order: rows[0]
    });
  } catch (err) {
    console.error("Create order error:", err);
    return res.status(500).json({ success: false, error: "Failed to place your order due to server error." });
  }
}

// Retrieve orders based on user role (Client, Factory, or Staff)
export async function getOrders(req, res) {
  const { role, email, id } = req.user;

  try {
    let query = "";
    let params = [];

    const selectFields = `
      id,
      customer_name AS "customerName",
      customer_email AS "customerEmail",
      product_name AS "productName",
      factory_id AS "factoryId",
      factory_name AS "factoryName",
      status,
      total,
      custom_specs AS "customSpecs",
      abacate_billing_id AS "abacateBillingId",
      DATE(created_at) AS "createdAt",
      DATE(updated_at) AS "updatedAt"
    `;

    if (role === "client") {
      query = `SELECT ${selectFields} FROM orders WHERE customer_email = $1 ORDER BY created_at DESC;`;
      params = [email];
    } else if (role === "factory") {
      query = `SELECT ${selectFields} FROM orders WHERE factory_id = $1 ORDER BY created_at DESC;`;
      params = [id];
    } else if (role === "staff") {
      query = `SELECT ${selectFields} FROM orders ORDER BY created_at DESC;`;
    } else {
      return res.status(403).json({ success: false, error: "Unauthorized access to order logs." });
    }

    const { rows } = await pool.query(query, params);
    
    // Postgres stores TEXT, we parse custom_specs back to JSON
    const parsedRows = rows.map(r => ({
      ...r,
      customSpecs: r.customSpecs ? JSON.parse(r.customSpecs) : {}
    }));

    return res.json({
      success: true,
      orders: parsedRows
    });
  } catch (err) {
    console.error("Get orders error:", err);
    return res.status(500).json({ success: false, error: "Failed to load orders from system database." });
  }
}

// Update order status (Queued, In production, Delivered)
export async function updateOrderStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, error: "Please provide a new status." });
  }

  const validStatuses = ["Queued", "In production", "Delivered", "Pending Payment"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: "Invalid status state provided." });
  }

  try {
    // Only factories or staff can update status
    if (req.user.role !== "factory" && req.user.role !== "staff") {
      return res.status(403).json({ success: false, error: "Permission denied. Only factories and staff can update status." });
    }

    // If role is factory, make sure the order belongs to them
    if (req.user.role === "factory") {
      const { rows } = await pool.query("SELECT factory_id FROM orders WHERE id = $1;", [id]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: "Order not found." });
      }
      if (rows[0].factory_id !== req.user.id) {
        return res.status(403).json({ success: false, error: "Access denied. Order is assigned to another factory." });
      }
    }

    await pool.query("UPDATE orders SET status = $1 WHERE id = $2;", [status, id]);

    // Fetch the updated order to send the email
    const updated = await pool.query("SELECT * FROM orders WHERE id = $1;", [id]);
    if (updated.rows.length > 0) {
      // Dispatch email notification asynchronously
      sendOrderStatusEmail(updated.rows[0], status);
    }

    return res.json({
      success: true,
      message: `Order status updated to ${status} successfully.`
    });
  } catch (err) {
    console.error("Update status error:", err);
    return res.status(500).json({ success: false, error: "Failed to update order status." });
  }
}

// Place a consolidated cart checkout of orders
export async function checkoutCart(req, res) {
  const { cartItems } = req.body;

  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ success: false, error: "Please provide a non-empty cartItems array." });
  }

  const customerName = req.user.name;
  const customerEmail = req.user.email;
  const consolidatedBillingId = `bill-sim-${Math.floor(100000 + Math.random() * 900000)}`;

  try {
    const createdOrders = [];

    for (const item of cartItems) {
      const { productName, factoryId, factoryName, total, customSpecs, quantity } = item;
      
      if (!productName || !factoryId || !factoryName || !total || !customSpecs) {
        return res.status(400).json({ success: false, error: "Missing required parameters in one of the cart items." });
      }

      // Add quantity to custom specs if not already present
      const specsWithQty = {
        ...customSpecs,
        quantity: quantity || 1
      };

      const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
      const orderTotal = Number(total) * (quantity || 1);

      await pool.query(
        "INSERT INTO orders (id, customer_name, customer_email, product_name, factory_id, factory_name, total, custom_specs, status, abacate_billing_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending Payment', $9);",
        [
          orderId,
          customerName,
          customerEmail,
          productName,
          factoryId,
          factoryName,
          orderTotal,
          JSON.stringify(specsWithQty),
          consolidatedBillingId
        ]
      );

      createdOrders.push({
        id: orderId,
        productName,
        total: orderTotal,
        factoryId,
        factoryName
      });
    }

    // Now check if we can make a real AbacatePay billing creation call
    const ABACATE_TOKEN = process.env.ABACATE_TOKEN;
    const PORT = process.env.PORT || 5000;
    const isMockToken = !ABACATE_TOKEN || ABACATE_TOKEN.includes("your_abacatepay_token_here");

    if (!isMockToken) {
      try {
        console.log(`[AbacatePay API] Creating multi-item billing for ${createdOrders.length} products...`);
        
        // Sum total in cents
        const totalAmountInCents = createdOrders.reduce((sum, ord) => sum + Math.round(ord.total * 100), 0);

        // Map products for AbacatePay billing payload
        const abacateProducts = cartItems.map((item, idx) => ({
          externalId: createdOrders[idx].id,
          name: item.productName,
          quantity: item.quantity || 1,
          price: Math.round(Number(item.total) * 100)
        }));

        const abacateResponse = await fetch("https://api.abacatepay.com/v2/billing", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${ABACATE_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            frequency: "ONE_TIME",
            methods: ["PIX"],
            products: abacateProducts,
            returnUrl: `http://localhost:${PORT === "5000" ? 5174 : 5173}`,
            completionUrl: `http://localhost:${PORT === "5000" ? 5174 : 5173}`,
            customer: {
              name: customerName,
              email: customerEmail,
              taxId: "00000000000" // Placeholder
            }
          })
        });

        const abacateData = await abacateResponse.json();

        if (abacateResponse.ok && abacateData.success) {
          const realBillingId = abacateData.data.id;
          const realCheckoutUrl = abacateData.data.url;

          // Update all inserted orders to use the real billing ID instead of the simulated one
          await pool.query(
            "UPDATE orders SET abacate_billing_id = $1 WHERE abacate_billing_id = $2;",
            [realBillingId, consolidatedBillingId]
          );

          console.log(`[AbacatePay API] Multi-item billing successfully created: ${realBillingId}`);
          return res.json({
            success: true,
            checkoutUrl: realCheckoutUrl,
            isSimulated: false,
            billingId: realBillingId
          });
        } else {
          console.warn("[AbacatePay API] Unified billing creation failed, falling back to simulator:", abacateData.error);
        }
      } catch (err) {
        console.error("[AbacatePay API] Unified billing error, falling back to simulator:", err.message);
      }
    }

    // Default simulated checkout URL fallback
    // We pass the simulated billingId
    const simulatedCheckoutUrl = `http://localhost:${PORT}/api/payments/simulated-checkout?billingId=${consolidatedBillingId}`;

    return res.json({
      success: true,
      checkoutUrl: simulatedCheckoutUrl,
      isSimulated: true,
      billingId: consolidatedBillingId
    });

  } catch (err) {
    console.error("Cart checkout error:", err);
    return res.status(500).json({ success: false, error: "Failed to process your cart checkout due to server error." });
  }
}
