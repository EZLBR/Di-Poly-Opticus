// ============================================================
//   OPTICUS — Conexão com MySQL
//   Driver: mysql2 (já instalado no projeto)
//   Usa Pool de Conexões para performance
// ============================================================

import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

// ─────────────────────────────────────────
//   POOL DE CONEXÕES
//   Pool mantém várias conexões abertas e
//   reutiliza-as, evitando abrir/fechar
//   uma conexão a cada requisição.
// ─────────────────────────────────────────
const pool = mysql.createPool({
  host:             process.env.DB_HOST     || "localhost",
  port:             process.env.DB_PORT     || 3306,
  user:             process.env.DB_USER     || "root",
  password:         process.env.DB_PASSWORD || "",
  database:         process.env.DB_NAME     || "opticus_db",
  waitForConnections: true,   // aguarda se todas conexões estiverem ocupadas
  connectionLimit:  10,       // máximo de conexões simultâneas no pool
  queueLimit:       0,        // 0 = fila ilimitada de requisições esperando
  timezone:         "Z",      // UTC para consistência de datas
  charset:          "utf8mb4" // suporta emojis e caracteres especiais
});

// ─────────────────────────────────────────
//   INICIALIZAÇÃO DO BANCO
//   Cria as tabelas se não existirem e
//   popula com dados iniciais (seed).
// ─────────────────────────────────────────
export async function initializeDatabase() {
  try {
    // Testa a conexão
    await pool.query("SELECT 1");
    console.log("✅ Conectado ao MySQL com sucesso.");

    // ── TABELA: categorias ─────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id        INT AUTO_INCREMENT PRIMARY KEY,
        nome      VARCHAR(100)  NOT NULL,
        descricao TEXT,
        criado_em TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── TABELA: usuarios ───────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        nome         VARCHAR(255) NOT NULL,
        email        VARCHAR(255) UNIQUE NOT NULL,
        senha_hash   VARCHAR(255) NOT NULL,
        role         ENUM('client','factory','staff') DEFAULT 'client',
        factory_name VARCHAR(255),
        criado_em    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── TABELA: produtos ───────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        nome         VARCHAR(255)   NOT NULL,
        descricao    TEXT,
        preco        DECIMAL(10,2)  NOT NULL,
        categoria_id INT,
        imagem_url   VARCHAR(500),
        ativo        BOOLEAN        DEFAULT TRUE,
        criado_em    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // ── TABELA: pedidos ────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id                 INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id         INT           NOT NULL,
        customer_name      VARCHAR(255)  NOT NULL,
        customer_email     VARCHAR(255)  NOT NULL,
        product_name       VARCHAR(255)  NOT NULL,
        factory_id         INT,
        factory_name       VARCHAR(255),
        status             ENUM('Pending Payment','Queued','In production','Delivered','Cancelled')
                           DEFAULT 'Pending Payment',
        total              DECIMAL(10,2) NOT NULL,
        custom_specs       TEXT,
        abacate_billing_id VARCHAR(255),
        criado_em          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        atualizado_em      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (factory_id) REFERENCES usuarios(id) ON DELETE SET NULL
      );
    `);

    // ── TABELA: pedido_itens ───────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pedido_itens (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        pedido_id      INT           NOT NULL,
        produto_id     INT           NOT NULL,
        quantidade     INT           NOT NULL DEFAULT 1,
        preco_unitario DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (pedido_id)  REFERENCES pedidos(id)  ON DELETE CASCADE,
        FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT
      );
    `);

    // ── TABELA: estoque ────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS estoque (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        produto_id     INT NOT NULL UNIQUE,
        quantidade     INT NOT NULL DEFAULT 0,
        estoque_minimo INT DEFAULT 5,
        atualizado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
      );
    `);

    // ── TABELA: pagamentos ─────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pagamentos (
        id                 INT AUTO_INCREMENT PRIMARY KEY,
        pedido_id          INT           NOT NULL,
        metodo             ENUM('pix','cartao_credito','boleto') DEFAULT 'pix',
        status             ENUM('pendente','aprovado','recusado','estornado') DEFAULT 'pendente',
        valor              DECIMAL(10,2) NOT NULL,
        referencia_externa VARCHAR(255),
        criado_em          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
      );
    `);

    // ── TABELA: saved_designs ──────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_designs (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id      INT           NOT NULL,
        customer_email  VARCHAR(255)  NOT NULL,
        nome            VARCHAR(255)  NOT NULL,
        modelo          VARCHAR(255)  NOT NULL,
        cor             VARCHAR(50)   NOT NULL,
        is_sunglasses   BOOLEAN       DEFAULT FALSE,
        anti_reflective BOOLEAN       DEFAULT FALSE,
        temple_style    VARCHAR(50)   DEFAULT 'standard',
        top_bar         BOOLEAN       DEFAULT FALSE,
        bridge_style    VARCHAR(50)   DEFAULT 'keyhole',
        frame_profile   VARCHAR(50)   DEFAULT 'medium',
        temple_open     DECIMAL(4,2)  DEFAULT 0.00,
        published       BOOLEAN       DEFAULT FALSE,
        criado_em       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        atualizado_em   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      );
    `);

    console.log("✅ Todas as tabelas verificadas/criadas com sucesso.");

    // ─── SEED: Dados iniciais ──────────────
    // Verifica se já existem usuários para não duplicar
    const [rows] = await pool.query("SELECT COUNT(*) AS total FROM usuarios");
    const total = rows[0].total;

    if (total === 0) {
      console.log("🌱 Populando banco com dados iniciais...");
      const senhaHash = await bcrypt.hash("123456", 10);

      // Seed usuários
      await pool.query(`
        INSERT INTO usuarios (nome, email, senha_hash, role, factory_name) VALUES
        ('Cliente Demo',   'client@opticus.com',  ?, 'client',  NULL),
        ('Factory Demo',   'factory@opticus.com', ?, 'factory', 'Demo Factory'),
        ('Staff Opticus',  'staff@opticus.com',   ?, 'staff',   NULL)
      `, [senhaHash, senhaHash, senhaHash]);

      // Seed categorias
      await pool.query(`
        INSERT INTO categorias (nome, descricao) VALUES
        ('Óculos de Sol',    'Armações com lente solar polarizada'),
        ('Armações',         'Armações para lentes de grau'),
        ('Lentes',           'Lentes avulsas e sob medida'),
        ('Acessórios',       'Cases, cordões e kits de limpeza')
      `);

      // Busca as categorias recém inseridas
      const [cats] = await pool.query("SELECT id FROM categorias LIMIT 2");
      const catSol = cats[0]?.id || 1;
      const catArmacao = cats[1]?.id || 2;

      // Seed produtos
      const [p1] = await pool.query(`
        INSERT INTO produtos (nome, descricao, preco, categoria_id, ativo)
        VALUES ('Model Aurora', 'Óculos de sol premium com lente polarizada UV400', 450.00, ?, TRUE)
      `, [catSol]);

      const [p2] = await pool.query(`
        INSERT INTO produtos (nome, descricao, preco, categoria_id, ativo)
        VALUES ('Model Vertex', 'Armação de titânio ultra leve para grau', 320.00, ?, TRUE)
      `, [catArmacao]);

      // Seed estoque para os produtos inseridos
      await pool.query(`
        INSERT INTO estoque (produto_id, quantidade, estoque_minimo) VALUES
        (?, 50, 10),
        (?, 30, 5)
      `, [p1.insertId, p2.insertId]);

      console.log("✅ Dados iniciais inseridos com sucesso.");
      console.log("   → Logins disponíveis (senha: 123456):");
      console.log("      client@opticus.com   | staff@opticus.com   | factory@opticus.com");
    }

  } catch (err) {
    console.error("❌ Erro ao inicializar banco MySQL:", err.message);
    // Encerra o processo se o banco não conectar — impede o servidor de rodar sem DB
    process.exit(1);
  }
}

export default pool;
