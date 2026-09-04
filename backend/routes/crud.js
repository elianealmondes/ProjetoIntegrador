const express = require("express");
const db = require("../database");

function criarRotas(tabela) {
  const router = express.Router();

  router.get("/", (_req, res) => {
    res.json(db.buscarTodos(tabela));
  });

  router.get("/:id", (req, res) => {
    const item = db.buscarPorId(tabela, Number(req.params.id));
    if (!item) return res.status(404).json({ erro: "Não encontrado." });
    res.json(item);
  });

  router.post("/", (req, res) => {
    const id = db.inserir(tabela, req.body);
    res.status(201).json({ id, ...req.body });
  });

  router.put("/:id", (req, res) => {
    db.atualizar(tabela, Number(req.params.id), req.body);
    res.json({ ok: true });
  });

  router.delete("/:id", (req, res) => {
    db.remover(tabela, Number(req.params.id));
    res.json({ ok: true });
  });

  return router;
}

module.exports = criarRotas;
