// ============================================================
//   AUTH CONTROLLER
//   Registro, Login e perfil de usuário
//   Banco: MySQL via mysql2 (pool de conexões)
// ============================================================

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "opticus_premium_jwt_secret_key_2026";

// ─── Helper: gera JWT ─────────────────────────────────────
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// ─────────────────────────────────────────────────────────
//   REGISTRO
//   POST /api/auth/register
// ─────────────────────────────────────────────────────────
export async function register(req, res) {
  const { name, email, password, role, factoryName } = req.body;

  // Validação básica
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      error: "Por favor, informe nome, email e senha."
    });
  }

  const userRole    = role || "client";
  const normEmail   = String(email).trim().toLowerCase();

  try {
    // 1. Verifica se o email já existe
    //    pool.execute() usa prepared statements (protege contra SQL Injection)
    const [existing] = await pool.execute(
      "SELECT id FROM usuarios WHERE email = ?",
      [normEmail]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Já existe uma conta com esse email."
      });
    }

    // 2. Gera hash da senha (nunca salvar senha em texto puro!)
    //    Custo 10 = bom equilíbrio entre segurança e performance
    const senhaHash = await bcrypt.hash(password, 10);

    // 3. Insere o usuário no banco
    const [result] = await pool.execute(
      "INSERT INTO usuarios (nome, email, senha_hash, role, factory_name) VALUES (?, ?, ?, ?, ?)",
      [
        name.trim(),
        normEmail,
        senhaHash,
        userRole,
        userRole === "factory" ? (factoryName || null) : null
      ]
    );

    // result.insertId = ID gerado pelo AUTO_INCREMENT do MySQL
    const userId = result.insertId;

    // 4. Gera o token JWT com os dados do usuário
    const payload = {
      id:          userId,
      name:        name.trim(),
      email:       normEmail,
      role:        userRole,
      factoryName: userRole === "factory" ? factoryName : null
    };
    const token = generateToken(payload);

    return res.status(201).json({ success: true, token, user: payload });

  } catch (err) {
    console.error("Erro no registro:", err);
    return res.status(500).json({
      success: false,
      error: "Falha no registro. Tente novamente."
    });
  }
}

// ─────────────────────────────────────────────────────────
//   LOGIN
//   POST /api/auth/login
// ─────────────────────────────────────────────────────────
export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "Por favor, informe email e senha."
    });
  }

  const normEmail = String(email).trim().toLowerCase();

  try {
    // 1. Busca o usuário pelo email
    const [rows] = await pool.execute(
      "SELECT * FROM usuarios WHERE email = ?",
      [normEmail]
    );

    if (rows.length === 0) {
      // Mensagem genérica para não revelar se o email existe
      return res.status(400).json({
        success: false,
        error: "Email ou senha incorretos."
      });
    }

    const user = rows[0];

    // 2. Compara a senha com o hash salvo no banco
    const senhaCorreta = await bcrypt.compare(password, user.senha_hash);
    if (!senhaCorreta) {
      return res.status(400).json({
        success: false,
        error: "Email ou senha incorretos."
      });
    }

    // 3. Gera token JWT
    const payload = {
      id:          user.id,
      name:        user.nome,
      email:       user.email,
      role:        user.role,
      factoryName: user.factory_name
    };
    const token = generateToken(payload);

    return res.json({ success: true, token, user: payload });

  } catch (err) {
    console.error("Erro no login:", err);
    return res.status(500).json({
      success: false,
      error: "Falha no login. Tente novamente."
    });
  }
}

// ─────────────────────────────────────────────────────────
//   PERFIL DO USUÁRIO AUTENTICADO
//   GET /api/auth/me
// ─────────────────────────────────────────────────────────
export async function getMe(req, res) {
  try {
    // req.user.id vem do middleware JWT (protect)
    const [rows] = await pool.execute(
      `SELECT
        id,
        nome         AS name,
        email,
        role,
        factory_name AS factoryName,
        criado_em    AS createdAt
       FROM usuarios
       WHERE id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Usuário não encontrado."
      });
    }

    return res.json({ success: true, user: rows[0] });

  } catch (err) {
    console.error("Erro ao buscar perfil:", err);
    return res.status(500).json({
      success: false,
      error: "Falha ao carregar perfil."
    });
  }
}

// ─────────────────────────────────────────────────────────
//   LISTAR TODOS OS USUÁRIOS (apenas staff)
//   GET /api/auth/users
// ─────────────────────────────────────────────────────────
export async function getUsers(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT
        id,
        nome         AS name,
        email,
        role,
        factory_name AS factoryName,
        criado_em    AS createdAt
       FROM usuarios
       ORDER BY criado_em DESC`
    );

    return res.json({ success: true, users: rows });

  } catch (err) {
    console.error("Erro ao listar usuários:", err);
    return res.status(500).json({
      success: false,
      error: "Falha ao carregar usuários."
    });
  }
}

// ─────────────────────────────────────────────────────────
//   ATUALIZAR USUÁRIO
//   PUT /api/auth/users/:id
// ─────────────────────────────────────────────────────────
export async function updateUser(req, res) {
  const { id } = req.params;
  const { name, factoryName } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: "Nome é obrigatório." });
  }

  try {
    const [result] = await pool.execute(
      "UPDATE usuarios SET nome = ?, factory_name = ? WHERE id = ?",
      [name.trim(), factoryName || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Usuário não encontrado." });
    }

    return res.json({ success: true, message: "Usuário atualizado com sucesso." });

  } catch (err) {
    console.error("Erro ao atualizar usuário:", err);
    return res.status(500).json({ success: false, error: "Falha ao atualizar usuário." });
  }
}

// ─────────────────────────────────────────────────────────
//   DELETAR USUÁRIO
//   DELETE /api/auth/users/:id
// ─────────────────────────────────────────────────────────
export async function deleteUser(req, res) {
  const { id } = req.params;

  try {
    const [result] = await pool.execute(
      "DELETE FROM usuarios WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Usuário não encontrado." });
    }

    return res.json({ success: true, message: "Usuário removido com sucesso." });

  } catch (err) {
    console.error("Erro ao deletar usuário:", err);
    return res.status(500).json({ success: false, error: "Falha ao remover usuário." });
  }
}
