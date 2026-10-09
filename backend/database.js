const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "sync_acesso.db");

let db = null;

async function inicializar() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nome      TEXT NOT NULL,
      cpf       TEXT NOT NULL UNIQUE,
      tipo      TEXT NOT NULL CHECK(tipo IN ('motorista','funcionario')),
      senha     TEXT NOT NULL,
      criado_em DATETIME DEFAULT (datetime('now','localtime'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cargas (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      senha          TEXT NOT NULL,
      motorista      TEXT,
      cpf            TEXT,
      telefone       TEXT,
      transportadora TEXT,
      placaCavalo    TEXT,
      placaCarreta   TEXT,
      nf             TEXT,
      operacao       TEXT,
      tipoCarga      TEXT,
      peso           TEXT,
      observacao     TEXT,
      status         TEXT DEFAULT 'Aguardando',
      doca           TEXT DEFAULT '--',
      data           TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS fila (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      idCarga INTEGER,
      senha   TEXT,
      status  TEXT DEFAULT 'Aguardando',
      doca    TEXT DEFAULT '--',
      data    TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS docas (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      nome   TEXT NOT NULL,
      status TEXT DEFAULT 'Livre'
    );
  `);

  const nomesPadrao = Array.from({ length: 6 }, (_, i) => `Doca ${String(i + 1).padStart(2, "0")}`);
  const docasExistentes = buscarTodos("docas");
  const nomesExistentes = new Set(docasExistentes.map((d) => d.nome));
  const inserirDoca = db.prepare(
    "INSERT INTO docas (nome, status) VALUES (?, ?)"
  );
  for (const nome of nomesPadrao) {
    if (!nomesExistentes.has(nome)) {
      inserirDoca.run([nome, "Livre"]);
    }
  }
  inserirDoca.free();

  db.run("UPDATE docas SET status = 'Livre' WHERE status IS NULL OR status = ''");

  // Slots por doca (horários de agendamento)
  db.run(`
    CREATE TABLE IF NOT EXISTS slots (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      doca     TEXT NOT NULL,
      horario  TEXT NOT NULL,
      status   TEXT DEFAULT 'Livre',
      data     TEXT,
      idCarga  INTEGER
    );
  `);

  // Seed de slots padrão (6 docas x 6 horários = 36 slots)
  try {
    const horariosPadrao = ["08:00-09:30","09:30-11:00","11:00-12:30","13:30-15:00","15:00-16:30","16:30-18:00"];
    const slotsExistentes = buscarTodos("slots");
    if (slotsExistentes.length === 0) {
      const inserirSlot = db.prepare("INSERT INTO slots (doca, horario, status, data) VALUES (?, ?, ?, ?)");
      const hoje = new Date().toLocaleDateString("pt-BR");
      for (const nome of nomesPadrao) {
        for (const h of horariosPadrao) {
          inserirSlot.run([nome, h, "Livre", hoje]);
        }
      }
      inserirSlot.free();
    } else {
      // garantir que toda doca tenha todos os horários (migração suave)
      const horariosPadraoSet = new Set(horariosPadrao);
      const porDoca = {};
      for (const s of slotsExistentes) {
        if (!porDoca[s.doca]) porDoca[s.doca] = new Set();
        porDoca[s.doca].add(s.horario);
      }
      const inserirSlot = db.prepare("INSERT INTO slots (doca, horario, status, data) VALUES (?, ?, ?, ?)");
      const hoje = new Date().toLocaleDateString("pt-BR");
      for (const nome of nomesPadrao) {
        const existentes = porDoca[nome] || new Set();
        for (const h of horariosPadrao) {
          if (!existentes.has(h)) inserirSlot.run([nome, h, "Livre", hoje]);
        }
      }
      inserirSlot.free();
    }
  } catch (e) {
    console.warn("[DB] falha ao inicializar slots:", e.message);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS notificacoes (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      cpf      TEXT,
      senha    TEXT,
      mensagem TEXT,
      data     TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS historico (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      senha          TEXT,
      motorista      TEXT,
      cpf            TEXT,
      telefone       TEXT,
      transportadora TEXT,
      placaCavalo    TEXT,
      placaCarreta   TEXT,
      nf             TEXT,
      operacao       TEXT,
      tipoCarga      TEXT,
      peso           TEXT,
      observacao     TEXT,
      status         TEXT,
      doca           TEXT,
      data           TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS auditorias (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      data        TEXT,
      colaborador TEXT,
      itens       TEXT,
      acao        TEXT,
      observacao  TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS motoristas_salvos (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      cpf            TEXT NOT NULL UNIQUE,
      nome           TEXT,
      telefone       TEXT,
      transportadora TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notas_fiscais (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      idCarga        INTEGER,
      numeroNF       TEXT,
      operacao       TEXT,
      tipoCarga      TEXT,
      peso           TEXT,
      arquivoPDF     TEXT,
      arquivoXML     TEXT
    );
  `);

  salvar();

  // Migração: garante que a coluna cpf exista em notificacoes
  try {
    db.run("ALTER TABLE notificacoes ADD COLUMN cpf TEXT");
  } catch (e) {
    // coluna já existe - ignora
  }
  salvar();

  return db;
}

function salvar() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function buscarTodos(tabela) {
  const resultados = [];
  const stmt = db.prepare(`SELECT * FROM ${tabela}`);
  while (stmt.step()) {
    resultados.push(stmt.getAsObject());
  }
  stmt.free();
  return resultados;
}

function buscarPorId(tabela, id) {
  const stmt = db.prepare(`SELECT * FROM ${tabela} WHERE id = ?`);
  stmt.bind([id]);
  let resultado = null;
  if (stmt.step()) {
    resultado = stmt.getAsObject();
  }
  stmt.free();
  return resultado;
}

function inserir(tabela, dados) {
  const colunas = Object.keys(dados);
  const valores = Object.values(dados);
  const placeholders = colunas.map(() => "?").join(", ");
  const sql = `INSERT INTO ${tabela} (${colunas.join(", ")}) VALUES (${placeholders})`;
  db.run(sql, valores);
  const id = db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];
  salvar();
  return id;
}

function atualizar(tabela, id, dados) {
  const colunas = Object.keys(dados);
  const valores = Object.values(dados);
  const set = colunas.map((c) => `${c} = ?`).join(", ");
  const sql = `UPDATE ${tabela} SET ${set} WHERE id = ?`;
  db.run(sql, [...valores, id]);
  salvar();
}

function remover(tabela, id) {
  db.run(`DELETE FROM ${tabela} WHERE id = ?`, [id]);
  salvar();
}

module.exports = {
  inicializar,
  buscarTodos,
  buscarPorId,
  inserir,
  atualizar,
  remover,
  salvar,
};
