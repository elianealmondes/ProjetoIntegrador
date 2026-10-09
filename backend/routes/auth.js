const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../database");

const router = express.Router();

/* ======================================
   CADASTRO DE USUÁRIO
====================================== */
router.post("/cadastro", (req, res) => {
  const { nome, cpf, tipo, senha } = req.body;

  if (!nome || !cpf || !tipo || !senha) {
    return res.status(400).json({ erro: "Preencha todos os campos." });
  }

  if (tipo !== "motorista" && tipo !== "funcionario") {
    return res.status(400).json({ erro: "Tipo de usuário inválido." });
  }

  const jaExiste = db.buscarTodos("usuarios").find((u) => u.cpf === cpf);
  if (jaExiste) {
    return res.status(409).json({ erro: "CPF já cadastrado." });
  }

  const senhaHash = bcrypt.hashSync(senha, 10);

  const id = db.inserir("usuarios", { nome, cpf, tipo, senha: senhaHash });

  res.status(201).json({ id, nome, cpf, tipo });
});

/* ======================================
   LOGIN
====================================== */
router.post("/login", (req, res) => {
  const { cpf, senha, tipo } = req.body;

  if (!cpf || !senha || !tipo) {
    return res.status(400).json({ erro: "Preencha todos os campos." });
  }

  const usuario = db
    .buscarTodos("usuarios")
    .find((u) => u.cpf === cpf && u.tipo === tipo);

  const senhaConfere = usuario && bcrypt.compareSync(senha, usuario.senha);

  if (!senhaConfere) {
    return res.status(401).json({ erro: "Usuário ou senha incorretos." });
  }

  res.json({
    id: usuario.id,
    nome: usuario.nome,
    cpf: usuario.cpf,
    tipo: usuario.tipo,
  });
});

/* ======================================
   RECUPERAR SENHA
====================================== */
router.post("/recuperar-senha", (req, res) => {
  const { cpf } = req.body;

  if (!cpf) {
    return res.status(400).json({ erro: "Informe o CPF." });
  }

  const usuario = db.buscarTodos("usuarios").find((u) => u.cpf === cpf);

  if (usuario) {
    return res.json({
      encontrado: true,
      mensagem: "Entre em contato com o administrador para redefinir.",
    });
  }

  res.status(404).json({ encontrado: false, erro: "CPF não encontrado." });
});

/* ======================================
   LISTAR USUÁRIOS (para gestão)
====================================== */
router.get("/usuarios", (req, res) => {
  const usuarios = db
    .buscarTodos("usuarios")
    .map(({ senha, ...usuario }) => usuario);
  res.json(usuarios);
});

module.exports = router;
