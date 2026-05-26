import pool from './config/db.js';

async function enableRLS() {
  const tables = ['categorias', 'usuarios', 'produtos', 'estoque', 'pedidos', 'pedido_itens', 'pagamentos', 'saved_designs'];
  try {
    for (const t of tables) {
      await pool.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY;`);
    }
    console.log('✅ RLS Habilitado em todas as tabelas!');
  } catch (err) {
    console.error('Erro ao habilitar RLS:', err);
  } finally {
    process.exit(0);
  }
}

enableRLS();
