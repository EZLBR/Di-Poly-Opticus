// ============================================================
//   PRODUCT CONTROLLER — CRUD completo de Produtos
//   Rotas: /api/products
// ============================================================

import pool from "../config/db.js";

// ─────────────────────────────────────────────────────────
//   CRIAR PRODUTO
//   POST /api/products
//   Somente: staff ou factory
// ─────────────────────────────────────────────────────────
export async function createProduct(req, res) {
  const { nome, descricao, preco, categoria_id, imagem_url } = req.body;

  if (!nome || !preco) {
    return res.status(400).json({
      success: false,
      error: "Nome e preço são obrigatórios."
    });
  }

  if (isNaN(preco) || Number(preco) <= 0) {
    return res.status(400).json({
      success: false,
      error: "Preço deve ser um número positivo."
    });
  }

  try {
    // 1. Insere o produto
    const [result] = await pool.execute(
      `INSERT INTO produtos (nome, descricao, preco, categoria_id, imagem_url, ativo)
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [
        nome.trim(),
        descricao || null,
        Number(preco),
        categoria_id || null,
        imagem_url || null
      ]
    );

    const produtoId = result.insertId;

    // 2. Cria o registro de estoque automaticamente (começa em 0)
    await pool.execute(
      "INSERT INTO estoque (produto_id, quantidade, estoque_minimo) VALUES (?, 0, 5)",
      [produtoId]
    );

    // 3. Retorna o produto recém-criado
    const [rows] = await pool.execute(
      `SELECT p.*, c.nome AS categoria_nome
       FROM produtos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       WHERE p.id = ?`,
      [produtoId]
    );

    return res.status(201).json({ success: true, produto: rows[0] });

  } catch (err) {
    console.error("Erro ao criar produto:", err);
    return res.status(500).json({ success: false, error: "Falha ao criar produto." });
  }
}

// ─────────────────────────────────────────────────────────
//   LISTAR PRODUTOS (com paginação e filtros)
//   GET /api/products?categoria_id=1&page=1&limit=10&search=aurora
// ─────────────────────────────────────────────────────────
export async function getProducts(req, res) {
  const { categoria_id, search, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    // Monta a query dinamicamente baseado nos filtros
    let where = "WHERE p.ativo = TRUE";
    const params = [];

    if (categoria_id) {
      where += " AND p.categoria_id = ?";
      params.push(Number(categoria_id));
    }

    if (search) {
      // LIKE com ? protege contra SQL Injection
      where += " AND (p.nome LIKE ? OR p.descricao LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // Query principal com JOIN para trazer o nome da categoria
    const [rows] = await pool.execute(
      `SELECT
        p.id,
        p.nome,
        p.descricao,
        p.preco,
        p.categoria_id,
        c.nome      AS categoria_nome,
        p.imagem_url,
        p.ativo,
        p.criado_em,
        e.quantidade AS estoque_quantidade
       FROM produtos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       LEFT JOIN estoque    e ON e.produto_id = p.id
       ${where}
       ORDER BY p.criado_em DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    // Total de registros para paginação no frontend
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM produtos p ${where}`,
      params
    );

    return res.json({
      success: true,
      produtos:   rows,
      total:      countRows[0].total,
      page:       Number(page),
      totalPages: Math.ceil(countRows[0].total / Number(limit))
    });

  } catch (err) {
    console.error("Erro ao listar produtos:", err);
    return res.status(500).json({ success: false, error: "Falha ao carregar produtos." });
  }
}

// ─────────────────────────────────────────────────────────
//   BUSCAR PRODUTO POR ID
//   GET /api/products/:id
// ─────────────────────────────────────────────────────────
export async function getProductById(req, res) {
  const { id } = req.params;

  try {
    const [rows] = await pool.execute(
      `SELECT
        p.*,
        c.nome AS categoria_nome,
        e.quantidade     AS estoque_quantidade,
        e.estoque_minimo AS estoque_minimo
       FROM produtos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       LEFT JOIN estoque    e ON e.produto_id = p.id
       WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Produto não encontrado." });
    }

    return res.json({ success: true, produto: rows[0] });

  } catch (err) {
    console.error("Erro ao buscar produto:", err);
    return res.status(500).json({ success: false, error: "Falha ao buscar produto." });
  }
}

// ─────────────────────────────────────────────────────────
//   ATUALIZAR PRODUTO
//   PUT /api/products/:id
// ─────────────────────────────────────────────────────────
export async function updateProduct(req, res) {
  const { id } = req.params;
  const { nome, descricao, preco, categoria_id, imagem_url, ativo } = req.body;

  if (!nome || preco === undefined) {
    return res.status(400).json({ success: false, error: "Nome e preço são obrigatórios." });
  }

  try {
    const [result] = await pool.execute(
      `UPDATE produtos
       SET nome = ?, descricao = ?, preco = ?, categoria_id = ?, imagem_url = ?, ativo = ?
       WHERE id = ?`,
      [
        nome.trim(),
        descricao || null,
        Number(preco),
        categoria_id || null,
        imagem_url || null,
        ativo !== undefined ? Boolean(ativo) : true,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Produto não encontrado." });
    }

    // Retorna o produto atualizado
    const [rows] = await pool.execute(
      "SELECT * FROM produtos WHERE id = ?",
      [id]
    );

    return res.json({ success: true, produto: rows[0] });

  } catch (err) {
    console.error("Erro ao atualizar produto:", err);
    return res.status(500).json({ success: false, error: "Falha ao atualizar produto." });
  }
}

// ─────────────────────────────────────────────────────────
//   DELETAR PRODUTO (soft delete — marca como inativo)
//   DELETE /api/products/:id
//   Usa soft delete para preservar histórico em pedidos
// ─────────────────────────────────────────────────────────
export async function deleteProduct(req, res) {
  const { id } = req.params;

  try {
    // Verifica se o produto existe
    const [rows] = await pool.execute(
      "SELECT id FROM produtos WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Produto não encontrado." });
    }

    // Soft delete: apenas desativa o produto em vez de deletar
    // Isso preserva o histórico em pedidos_itens
    await pool.execute(
      "UPDATE produtos SET ativo = FALSE WHERE id = ?",
      [id]
    );

    return res.json({
      success: true,
      message: "Produto desativado com sucesso. O histórico de pedidos foi preservado."
    });

  } catch (err) {
    console.error("Erro ao deletar produto:", err);
    return res.status(500).json({ success: false, error: "Falha ao remover produto." });
  }
}
