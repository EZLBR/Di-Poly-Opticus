// ============================================================
//   OPTICUS — Conexão com MySQL
//   Driver   : mysql2/promise
//   Estratégia: Pool de conexões (reutiliza, não reabre)
//   Railway  : SSL automático via DB_SSL=true
// ============================================================

import mysql  from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

// ─────────────────────────────────────────────────────────
//   POOL DE CONEXÕES
//   • waitForConnections: aguarda se todas estiverem ocupadas
//   • connectionLimit: máximo de conexões simultâneas
//   • queueLimit: 0 = fila ilimitada
//   • timezone: "Z" (UTC) para consistência global de datas
//   • charset: utf8mb4 suporta emojis e caracteres especiais
//   • DB_SSL=true ativa SSL (necessário em alguns Railway plans)
// ─────────────────────────────────────────────────────────
const poolConfig = {
  host:               process.env.DB_HOST     || "localhost",
  port:               Number(process.env.DB_PORT)   || 3306,
  user:               process.env.DB_USER     || "root",
  password:           process.env.DB_PASSWORD || "",
  database:           process.env.DB_NAME     || "opticus_db",
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           "Z",
  charset:            "utf8mb4",
  connectTimeout:     60000,  // 60s — Railway pode ter latência na cold start
};

// Ativa SSL se DB_SSL=true (Railway Private Network não precisa,
// mas conexões externas sim)
if (process.env.DB_SSL === "true") {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = mysql.createPool(poolConfig);

// ─────────────────────────────────────────────────────────
//   HELPER: criação idempotente de índice
//   MySQL não possui "CREATE INDEX IF NOT EXISTS", então
//   verificamos via information_schema antes de criar.
// ─────────────────────────────────────────────────────────
async function createIndexIfNotExists(tableName, indexName, indexDef) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total
       FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name   = ?
        AND index_name   = ?`,
    [tableName, indexName]
  );
  if (rows[0].total === 0) {
    await pool.query(`CREATE INDEX ${indexName} ON ${tableName} (${indexDef})`);
  }
}

// ─────────────────────────────────────────────────────────
//   INICIALIZAÇÃO DO BANCO
//   Chamada uma única vez ao subir o servidor.
//   • Testa a conexão
//   • Cria tabelas (CREATE TABLE IF NOT EXISTS)
//   • Cria índices de performance (idempotente)
//   • Popula seed de dados iniciais (se banco vazio)
// ─────────────────────────────────────────────────────────
export async function initializeDatabase() {
  try {
    // ── Teste de conexão ──────────────────────────────────
    const [[info]] = await pool.query(
      "SELECT NOW() AS agora, VERSION() AS versao"
    );
    console.log(`✅ MySQL conectado — versão ${info.versao} (${info.agora})`);

    // ── TABELA: categorias ────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id        INT AUTO_INCREMENT PRIMARY KEY,
        nome      VARCHAR(100)  NOT NULL,
        descricao TEXT,
        criado_em TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── TABELA: usuarios ──────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        nome         VARCHAR(255) NOT NULL,
        email        VARCHAR(255) UNIQUE NOT NULL,
        senha_hash   VARCHAR(255) NOT NULL,
        role         ENUM('client','factory','staff') DEFAULT 'client',
        factory_name VARCHAR(255),
        criado_em    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── TABELA: produtos ──────────────────────────────────
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
        CONSTRAINT fk_produto_categoria
          FOREIGN KEY (categoria_id) REFERENCES categorias(id)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── TABELA: pedidos ───────────────────────────────────
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
        CONSTRAINT fk_pedido_usuario
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        CONSTRAINT fk_pedido_fabrica
          FOREIGN KEY (factory_id) REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── TABELA: pedido_itens ──────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pedido_itens (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        pedido_id      INT           NOT NULL,
        produto_id     INT           NOT NULL,
        quantidade     INT           NOT NULL DEFAULT 1,
        preco_unitario DECIMAL(10,2) NOT NULL,
        CONSTRAINT fk_item_pedido
          FOREIGN KEY (pedido_id)  REFERENCES pedidos(id)  ON DELETE CASCADE,
        CONSTRAINT fk_item_produto
          FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── TABELA: estoque ───────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS estoque (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        produto_id     INT NOT NULL UNIQUE,
        quantidade     INT NOT NULL DEFAULT 0,
        estoque_minimo INT DEFAULT 5,
        atualizado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_estoque_produto
          FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── TABELA: pagamentos ────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pagamentos (
        id                 INT AUTO_INCREMENT PRIMARY KEY,
        pedido_id          INT           NOT NULL,
        metodo             ENUM('pix','cartao_credito','boleto') DEFAULT 'pix',
        status             ENUM('pendente','aprovado','recusado','estornado') DEFAULT 'pendente',
        valor              DECIMAL(10,2) NOT NULL,
        referencia_externa VARCHAR(255),
        criado_em          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_pagamento_pedido
          FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── TABELA: saved_designs ─────────────────────────────
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
        CONSTRAINT fk_design_usuario
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("✅ Tabelas verificadas/criadas com sucesso.");

    // ── ÍNDICES DE PERFORMANCE ────────────────────────────
    //    Criados apenas se não existirem (idempotente via
    //    information_schema — MySQL não tem IF NOT EXISTS p/ índices)
    const indexes = [
      ["produtos",      "idx_produtos_categoria",  "categoria_id"],
      ["pedidos",       "idx_pedidos_usuario",      "usuario_id"],
      ["pedidos",       "idx_pedidos_factory",      "factory_id"],
      ["pedidos",       "idx_pedidos_status",       "status"],
      ["pedidos",       "idx_pedidos_billing",      "abacate_billing_id"],
      ["pedido_itens",  "idx_itens_pedido",         "pedido_id"],
      ["pedido_itens",  "idx_itens_produto",        "produto_id"],
      ["pagamentos",    "idx_pagamentos_pedido",    "pedido_id"],
      ["saved_designs", "idx_designs_usuario",      "usuario_id"],
      ["saved_designs", "idx_designs_email",        "customer_email"],
    ];

    for (const [table, name, col] of indexes) {
      await createIndexIfNotExists(table, name, col);
    }

    console.log("✅ Índices de performance verificados.");

    // ── SEED: dados iniciais ──────────────────────────────
    //    Só popula se o banco estiver completamente vazio
    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM usuarios"
    );

    if (Number(total) === 0) {
      console.log("🌱 Banco vazio — inserindo dados iniciais...");
      const senhaHash = await bcrypt.hash("123456", 10);

      // Usuários demo
      await pool.query(
        `INSERT INTO usuarios (nome, email, senha_hash, role, factory_name) VALUES
          ('Cliente Demo',   'client@opticus.com',  ?, 'client',  NULL),
          ('Factory Demo',   'factory@opticus.com', ?, 'factory', 'Demo Factory'),
          ('Staff Opticus',  'staff@opticus.com',   ?, 'staff',   NULL)`,
        [senhaHash, senhaHash, senhaHash]
      );

      // Categorias
      await pool.query(
        `INSERT INTO categorias (nome, descricao) VALUES
          ('Óculos de Sol', 'Armações com lente solar polarizada'),
          ('Armações',      'Armações para lentes de grau'),
          ('Lentes',        'Lentes avulsas e sob medida'),
          ('Acessórios',    'Cases, cordões e kits de limpeza')`
      );

      // Busca IDs das categorias recém-criadas
      const [[catSol]]    = await pool.execute(
        "SELECT id FROM categorias WHERE nome = 'Óculos de Sol'"
      );
      const [[catArmacao]] = await pool.execute(
        "SELECT id FROM categorias WHERE nome = 'Armações'"
      );

      // Produtos — pool.execute(INSERT) retorna [OkPacket, fields], não rows
      const [resP1] = await pool.execute(
        `INSERT INTO produtos (nome, descricao, preco, categoria_id, ativo)
           VALUES ('Model Aurora', 'Óculos de sol premium com lente polarizada UV400', 450.00, ?, TRUE)`,
        [catSol.id]
      );
      const [resP2] = await pool.execute(
        `INSERT INTO produtos (nome, descricao, preco, categoria_id, ativo)
           VALUES ('Model Vertex', 'Armação de titânio ultra leve para grau', 320.00, ?, TRUE)`,
        [catArmacao.id]
      );

      // Estoque inicial
      await pool.query(
        `INSERT INTO estoque (produto_id, quantidade, estoque_minimo) VALUES (?, 50, 10), (?, 30, 5)`,
        [resP1.insertId, resP2.insertId]
      );

      console.log("✅ Dados iniciais inseridos.");
      console.log("   Logins disponíveis (senha: 123456):");
      console.log("     client@opticus.com  |  factory@opticus.com  |  staff@opticus.com");
    }

  } catch (err) {
    console.error("❌ Falha ao inicializar o banco MySQL:", err.message);
    // Encerra o processo — servidor não deve rodar sem banco
    process.exit(1);
  }
}

// Exporta o pool para uso nos controllers
export default pool;
