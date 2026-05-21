import pool from "../config/db.js";

// Save a new design
export async function saveDesign(req, res) {
  const { id, name, model, color, is_sunglasses, anti_reflective, temple_style, top_bar, bridge_style, frame_profile, temple_open, published } = req.body;
  const customerEmail = req.user.email;

  if (!id || !name || !model || !color) {
    return res.status(400).json({ success: false, error: "Missing required design parameters." });
  }

  try {
    await pool.query(
      `INSERT INTO saved_designs 
      (id, customer_email, name, model, color, is_sunglasses, anti_reflective, temple_style, top_bar, bridge_style, frame_profile, temple_open, published) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT(id) DO UPDATE SET 
      name=EXCLUDED.name, model=EXCLUDED.model, color=EXCLUDED.color, is_sunglasses=EXCLUDED.is_sunglasses, 
      anti_reflective=EXCLUDED.anti_reflective, temple_style=EXCLUDED.temple_style, top_bar=EXCLUDED.top_bar, 
      bridge_style=EXCLUDED.bridge_style, frame_profile=EXCLUDED.frame_profile, temple_open=EXCLUDED.temple_open, 
      published=EXCLUDED.published;`,
      [
        id, customerEmail, name, model, color, 
        is_sunglasses ? true : false, anti_reflective ? true : false, temple_style || 'standard', 
        top_bar ? true : false, bridge_style || 'keyhole', frame_profile || 'medium', 
        temple_open || 0.00, published ? true : false
      ]
    );

    return res.status(201).json({ success: true, message: "Design saved successfully." });
  } catch (err) {
    console.error("Save design error:", err);
    return res.status(500).json({ success: false, error: "Failed to save design to the cloud." });
  }
}

// Get all designs for the authenticated user
export async function getDesigns(req, res) {
  const customerEmail = req.user.email;

  try {
    const { rows } = await pool.query(
      "SELECT * FROM saved_designs WHERE customer_email = $1 ORDER BY created_at DESC;",
      [customerEmail]
    );

    // Map snake_case to camelCase for the frontend
    const mappedDesigns = rows.map(row => ({
      id: row.id,
      name: row.name,
      model: row.model,
      color: row.color,
      isSunglasses: Boolean(row.is_sunglasses),
      antiReflective: Boolean(row.anti_reflective),
      templeStyle: row.temple_style,
      topBar: Boolean(row.top_bar),
      bridgeStyle: row.bridge_style,
      frameProfile: row.frame_profile,
      templeOpen: Number(row.temple_open),
      published: Boolean(row.published),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return res.json({ success: true, designs: mappedDesigns });
  } catch (err) {
    console.error("Get designs error:", err);
    return res.status(500).json({ success: false, error: "Failed to fetch designs from the cloud." });
  }
}

// Delete a design
export async function deleteDesign(req, res) {
  const { id } = req.params;
  const customerEmail = req.user.email;

  try {
    const result = await pool.query(
      "DELETE FROM saved_designs WHERE id = $1 AND customer_email = $2;",
      [id, customerEmail]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Design not found or unauthorized." });
    }

    return res.json({ success: true, message: "Design deleted successfully." });
  } catch (err) {
    console.error("Delete design error:", err);
    return res.status(500).json({ success: false, error: "Failed to delete design." });
  }
}
