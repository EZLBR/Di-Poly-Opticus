-- ============================================================
--   OPTICUS DATABASE SCHEMA
--   MySQL 8.x  |  Charset: utf8mb4
--   Ordem de criação: sem dependência → com dependência
-- ============================================================

-- Garante que estamos no banco correto
USE opticus_db;

-- ──────────────────────────────────────────────────────────
-- 1. CATEGORIAS
--    Agrupa os produtos em categorias (ex: Óculos de Sol,
--    Armações, Lentes, Acessórios).
--    Não depende de nenhuma outra tabela.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(100)  NOT NULL,
  descricao   TEXT,
  criado_em   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ──────────────────────────────────────────────────────────
-- 2. USUARIOS
--    Armazena clientes, fábricas e funcionários.
--    Role define o nível de acesso no sistema.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(255)  NOT NULL,
  email         VARCHAR(255)  UNIQUE NOT NULL,
  senha_hash    VARCHAR(255)  NOT NULL,
  role          ENUM('client', 'factory', 'staff') DEFAULT 'client',
  factory_name  VARCHAR(255),
  criado_em     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ──────────────────────────────────────────────────────────
-- 3. PRODUTOS
--    Catálogo de produtos disponíveis no marketplace.
--    Cada produto pertence a uma categoria (FK).
--    Se a categoria for deletada, categoria_id vira NULL.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS produtos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(255)  NOT NULL,
  descricao     TEXT,
  preco         DECIMAL(10, 2) NOT NULL,
  categoria_id  INT,
  imagem_url    VARCHAR(500),
  ativo         BOOLEAN       DEFAULT TRUE,
  criado_em     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_produto_categoria
    FOREIGN KEY (categoria_id)
    REFERENCES categorias(id)
    ON DELETE SET NULL    -- se categoria for deletada, produto fica sem categoria
    ON UPDATE CASCADE     -- se o id da categoria mudar, atualiza aqui também
);

-- ──────────────────────────────────────────────────────────
-- 4. PEDIDOS
--    Registra cada pedido feito por um usuário.
--    Guarda dados desnormalizados do cliente e da fábrica
--    para histórico imutável (mesmo se o usuário for deletado).
--    Status segue o ciclo de vida da produção.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id          INT           NOT NULL,
  customer_name       VARCHAR(255)  NOT NULL,
  customer_email      VARCHAR(255)  NOT NULL,
  product_name        VARCHAR(255)  NOT NULL,
  factory_id          INT,
  factory_name        VARCHAR(255),
  status              ENUM(
                        'Pending Payment',
                        'Queued',
                        'In production',
                        'Delivered',
                        'Cancelled'
                      ) DEFAULT 'Pending Payment',
  total               DECIMAL(10, 2) NOT NULL,
  custom_specs        TEXT,           -- JSON stringificado das specs do óculos
  abacate_billing_id  VARCHAR(255),
  criado_em           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  atualizado_em       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_pedido_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE CASCADE,    -- se usuário deletar, deleta seus pedidos

  CONSTRAINT fk_pedido_fabrica
    FOREIGN KEY (factory_id)
    REFERENCES usuarios(id)
    ON DELETE SET NULL    -- se fábrica for removida, pedido fica sem fábrica
);

-- ──────────────────────────────────────────────────────────
-- 5. PEDIDO_ITENS (tabela de junção N:N)
--    Resolve o relacionamento muitos-para-muitos entre
--    pedidos e produtos. Cada linha é um produto dentro
--    de um pedido específico.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedido_itens (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id       INT           NOT NULL,
  produto_id      INT           NOT NULL,
  quantidade      INT           NOT NULL DEFAULT 1,
  preco_unitario  DECIMAL(10, 2) NOT NULL,  -- preço no momento da compra (histórico)

  CONSTRAINT fk_item_pedido
    FOREIGN KEY (pedido_id)
    REFERENCES pedidos(id)
    ON DELETE CASCADE,    -- se pedido deletar, deleta os itens

  CONSTRAINT fk_item_produto
    FOREIGN KEY (produto_id)
    REFERENCES produtos(id)
    ON DELETE RESTRICT    -- impede deletar produto que está em pedidos
);

-- ──────────────────────────────────────────────────────────
-- 6. ESTOQUE
--    Relação 1:1 com produtos — cada produto tem exatamente
--    um registro de estoque. UNIQUE em produto_id garante isso.
--    estoque_minimo define quando emitir alertas de reposição.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estoque (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  produto_id      INT  NOT NULL UNIQUE,      -- UNIQUE = relação 1:1
  quantidade      INT  NOT NULL DEFAULT 0,
  estoque_minimo  INT  DEFAULT 5,
  atualizado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_estoque_produto
    FOREIGN KEY (produto_id)
    REFERENCES produtos(id)
    ON DELETE CASCADE     -- se produto for deletado, deleta o estoque
);

-- ──────────────────────────────────────────────────────────
-- 7. PAGAMENTOS
--    Registra o histórico financeiro de cada pedido.
--    Permite rastrear qual método foi usado e o status
--    do pagamento ao longo do tempo.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagamentos (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id           INT           NOT NULL,
  metodo              ENUM('pix', 'cartao_credito', 'boleto') DEFAULT 'pix',
  status              ENUM('pendente', 'aprovado', 'recusado', 'estornado') DEFAULT 'pendente',
  valor               DECIMAL(10, 2) NOT NULL,
  referencia_externa  VARCHAR(255),  -- ID do AbacatePay, gateway externo, etc.
  criado_em           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_pagamento_pedido
    FOREIGN KEY (pedido_id)
    REFERENCES pedidos(id)
    ON DELETE CASCADE     -- se pedido for deletado, deleta os pagamentos
);

-- ──────────────────────────────────────────────────────────
-- 8. SAVED_DESIGNS (designs salvos no Creator Studio)
--    Designs personalizados de óculos salvos por usuários.
-- ──────────────────────────────────────────────────────────
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
  temple_open     DECIMAL(4, 2) DEFAULT 0.00,
  published       BOOLEAN       DEFAULT FALSE,
  criado_em       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_design_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE CASCADE
);

-- ============================================================
--   ÍNDICES DE PERFORMANCE
--   Colunas frequentemente usadas em WHERE, JOIN ou ORDER BY
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_produtos_categoria  ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario     ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_factory     ON pedidos(factory_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status      ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_billing     ON pedidos(abacate_billing_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido        ON pedido_itens(pedido_id);
CREATE INDEX IF NOT EXISTS idx_itens_produto       ON pedido_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_pedido   ON pagamentos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_designs_usuario     ON saved_designs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_designs_email       ON saved_designs(customer_email);
