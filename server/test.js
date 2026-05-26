// ============================================================
//   SCRIPT DE TESTES DO BANCO MySQL — OPTICUS
//   Execute: node test.js  (dentro da pasta server/)
// ============================================================

import pool from "./config/db.js";
import bcrypt from "bcryptjs";

const OK   = (msg) => console.log(`  ✅ ${msg}`);
const FAIL = (msg) => console.log(`  ❌ ${msg}`);
const INFO = (msg) => console.log(`  ℹ️  ${msg}`);
const HEAD = (msg) => console.log(`\n${"=".repeat(50)}\n  ${msg}\n${"=".repeat(50)}`);

async function runTests() {
  HEAD("TESTES DO BANCO MYSQL — OPTICUS");

  HEAD("1. Conexão com MySQL");
  try {
    const [rows] = await pool.query("SELECT NOW() AS agora, VERSION() AS versao");
    OK(`Conectado! ${rows[0].agora}`);
    OK(`MySQL ${rows[0].versao}`);
  } catch (err) {
    FAIL(`Falha: ${err.message}`);
    FAIL("Verifique DB_HOST, DB_USER, DB_PASSWORD, DB_NAME no .env");
    process.exit(1);
  }

  HEAD("2. Verificando Tabelas");
  try {
    const [rows] = await pool.query("SHOW TABLES");
    const tabelas = rows.map(r => Object.values(r)[0]);
    for (const t of ["usuarios","categorias","produtos","pedidos","pedido_itens","estoque","pagamentos","saved_designs"]) {
      tabelas.includes(t) ? OK(`"${t}" existe`) : FAIL(`"${t}" NÃO encontrada!`);
    }
  } catch (err) { FAIL(err.message); }

  HEAD("3. CRUD — Usuários");
  let uid = null;
  try {
    const hash = await bcrypt.hash("senha123", 10);
    const [ins] = await pool.execute(
      "INSERT INTO usuarios (nome, email, senha_hash, role) VALUES (?,?,?,?)",
      ["Teste", `t${Date.now()}@test.com`, hash, "client"]
    );
    uid = ins.insertId;
    OK(`CREATE: ID ${uid}`);
    const [r] = await pool.execute("SELECT nome FROM usuarios WHERE id=?", [uid]);
    OK(`READ: ${r[0].nome}`);
    await pool.execute("UPDATE usuarios SET nome=? WHERE id=?", ["Atualizado", uid]);
    OK("UPDATE: ok");
    await pool.execute("DELETE FROM usuarios WHERE id=?", [uid]);
    OK("DELETE: ok");
  } catch (err) {
    FAIL(err.message);
    if (uid) await pool.execute("DELETE FROM usuarios WHERE id=?", [uid]).catch(()=>{});
  }

  HEAD("4. FK — Produto → Categoria");
  let cid = null, pid = null;
  try {
    const [ci] = await pool.execute("INSERT INTO categorias (nome) VALUES (?)", ["Cat Teste"]);
    cid = ci.insertId; OK(`Categoria ${cid}`);
    const [pi] = await pool.execute(
      "INSERT INTO produtos (nome,preco,categoria_id,ativo) VALUES (?,?,?,TRUE)",
      ["Prod Teste", 99.9, cid]
    );
    pid = pi.insertId; OK(`Produto ${pid}`);
    const [j] = await pool.execute(
      "SELECT p.nome,c.nome AS cat FROM produtos p JOIN categorias c ON c.id=p.categoria_id WHERE p.id=?", [pid]
    );
    OK(`JOIN: "${j[0].nome}" → "${j[0].cat}"`);
    await pool.execute("DELETE FROM produtos WHERE id=?", [pid]);
    await pool.execute("DELETE FROM categorias WHERE id=?", [cid]);
    OK("Limpeza ok");
  } catch (err) {
    FAIL(err.message);
    if (pid) await pool.execute("DELETE FROM produtos WHERE id=?", [pid]).catch(()=>{});
    if (cid) await pool.execute("DELETE FROM categorias WHERE id=?", [cid]).catch(()=>{});
  }

  HEAD("5. Contagem de Registros");
  for (const t of ["usuarios","categorias","produtos","pedidos","estoque","pagamentos"]) {
    try {
      const [r] = await pool.query(`SELECT COUNT(*) AS n FROM ${t}`);
      INFO(`${t}: ${r[0].n}`);
    } catch (err) { FAIL(`${t}: ${err.message}`); }
  }

  HEAD("6. Usuários de Demonstração");
  try {
    const [rows] = await pool.execute("SELECT nome,email,role FROM usuarios ORDER BY criado_em ASC");
    rows.length > 0
      ? rows.forEach(u => INFO(`${u.role.padEnd(8)} ${u.email} — ${u.nome}`)) && OK("Senha: 123456")
      : FAIL("Sem usuários. Inicie o servidor primeiro.");
  } catch (err) { FAIL(err.message); }

  HEAD("TESTES CONCLUÍDOS ✅");
  await pool.end();
}

runTests().catch(e => { console.error("Erro fatal:", e.message); process.exit(1); });
