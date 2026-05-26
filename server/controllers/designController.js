// ============================================================
//   DESIGN CONTROLLER — Designs salvos no Creator Studio
//   Migrado de PostgreSQL para MySQL
//   Nota: ON CONFLICT (PostgreSQL) → INSERT ... ON DUPLICATE KEY UPDATE (MySQL)
// ============================================================

import pool from "../config/db.js";

// ─────────────────────────────────────────────────────────
//   SALVAR DESIGN (cria ou atualiza)
//   POST /api/designs
// ─────────────────────────────────────────────────────────
export async function saveDesign(req, res) {
  const {
    id, name, model, color,
    is_sunglasses, anti_reflective, temple_style,
    top_bar, bridge_style, frame_profile, temple_open, published
  } = req.body;

  const customerEmail = req.user.email;
  const usuarioId     = req.user.id;

  if (!name || !model || !color) {
    return res.status(400).json({ success: false, error: "Nome, modelo e cor são obrigatórios." });
  }

  try {
    if (id) {
      // Se tem ID, tenta atualizar primeiro
      const [existing] = await pool.execute(
        "SELECT id FROM saved_designs WHERE id = ? AND customer_email = ?",
        [id, customerEmail]
      );

      if (existing.length > 0) {
        // Atualiza design existente
        await pool.execute(
          `UPDATE saved_designs SET
            nome = ?, modelo = ?, cor = ?,
            is_sunglasses = ?, anti_reflective = ?, temple_style = ?,
            top_bar = ?, bridge_style = ?, frame_profile = ?,
            temple_open = ?, published = ?
           WHERE id = ? AND customer_email = ?`,
          [
            name, model, color,
            Boolean(is_sunglasses), Boolean(anti_reflective), temple_style || "standard",
            Boolean(top_bar), bridge_style || "keyhole", frame_profile || "medium",
            temple_open || 0.00, Boolean(published),
            id, customerEmail
          ]
        );

        return res.json({ success: true, message: "Design atualizado com sucesso." });
      }
    }

    // Insere novo design
    const [result] = await pool.execute(
      `INSERT INTO saved_designs
        (usuario_id, customer_email, nome, modelo, cor,
         is_sunglasses, anti_reflective, temple_style,
         top_bar, bridge_style, frame_profile, temple_open, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId, customerEmail, name, model, color,
        Boolean(is_sunglasses), Boolean(anti_reflective), temple_style || "standard",
        Boolean(top_bar), bridge_style || "keyhole", frame_profile || "medium",
        temple_open || 0.00, Boolean(published)
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Design salvo com sucesso.",
      id:      result.insertId
    });

  } catch (err) {
    console.error("Erro ao salvar design:", err);
    return res.status(500).json({ success: false, error: "Falha ao salvar design." });
  }
}

// ─────────────────────────────────────────────────────────
//   LISTAR DESIGNS DO USUÁRIO
//   GET /api/designs
// ─────────────────────────────────────────────────────────
export async function getDesigns(req, res) {
  const customerEmail = req.user.email;

  try {
    const [rows] = await pool.execute(
      "SELECT * FROM saved_designs WHERE customer_email = ? ORDER BY criado_em DESC",
      [customerEmail]
    );

    // Mapeia snake_case para camelCase para o frontend
    const designs = rows.map(row => ({
      id:             row.id,
      name:           row.nome,
      model:          row.modelo,
      color:          row.cor,
      isSunglasses:   Boolean(row.is_sunglasses),
      antiReflective: Boolean(row.anti_reflective),
      templeStyle:    row.temple_style,
      topBar:         Boolean(row.top_bar),
      bridgeStyle:    row.bridge_style,
      frameProfile:   row.frame_profile,
      templeOpen:     Number(row.temple_open),
      published:      Boolean(row.published),
      createdAt:      row.criado_em,
      updatedAt:      row.atualizado_em
    }));

    return res.json({ success: true, designs });

  } catch (err) {
    console.error("Erro ao buscar designs:", err);
    return res.status(500).json({ success: false, error: "Falha ao carregar designs." });
  }
}

// ─────────────────────────────────────────────────────────
//   DELETAR DESIGN
//   DELETE /api/designs/:id
// ─────────────────────────────────────────────────────────
export async function deleteDesign(req, res) {
  const { id }       = req.params;
  const customerEmail = req.user.email;

  try {
    const [result] = await pool.execute(
      "DELETE FROM saved_designs WHERE id = ? AND customer_email = ?",
      [id, customerEmail]
    );

    // affectedRows = 0 significa que não encontrou ou não pertence ao usuário
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Design não encontrado ou sem permissão." });
    }

    return res.json({ success: true, message: "Design removido com sucesso." });

  } catch (err) {
    console.error("Erro ao deletar design:", err);
    return res.status(500).json({ success: false, error: "Falha ao remover design." });
  }
}
