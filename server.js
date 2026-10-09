const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./backend/database");
const authRoutes = require("./backend/routes/auth");
const criarRotas = require("./backend/routes/crud");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.use("/api/auth", authRoutes);
app.use("/api/cargas", criarRotas("cargas"));
app.use("/api/fila", criarRotas("fila"));
app.use("/api/docas", criarRotas("docas"));
app.use("/api/notificacoes", criarRotas("notificacoes"));
app.use("/api/historico", criarRotas("historico"));
app.use("/api/auditorias", criarRotas("auditorias"));
app.use("/api/motoristas_salvos", criarRotas("motoristas_salvos"));
app.use("/api/notas_fiscais", criarRotas("notas_fiscais"));
app.use("/api/slots", criarRotas("slots"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", storage: "sqlite" });
});

db.inicializar().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
});
