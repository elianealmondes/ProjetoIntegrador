/* ======================================
   DockFlow - API JS
   Resolve a URL base da API REST

   Ordem de prioridade:
   1) ?api=http://IP:3000  (query string)
   2) localStorage "dockflowApiBase"
   3) vazio quando a página é servida pelo próprio servidor
   4) http://localhost:3000 quando aberta como arquivo (file://)
====================================== */

(function () {
  let base = "";
  let configurado = false;

  try {
    const param = new URLSearchParams(window.location.search).get("api");
    if (param && param.trim()) {
      base = param.trim().replace(/\/+$/, "");
      configurado = true;
      try {
        localStorage.setItem("dockflowApiBase", base);
      } catch (e) {}
    }
  } catch (e) {}

  if (!configurado) {
    try {
      const salvo = (localStorage.getItem("dockflowApiBase") || "").trim();
      if (salvo) {
        base = salvo.replace(/\/+$/, "");
        configurado = true;
      }
    } catch (e) {}
  }

  const viaArquivo = window.location.protocol === "file:";

  if (viaArquivo && !configurado) {
    base = "http://localhost:3000";
  }

  window.API_BASE = base;
  window.API_CONFIGURADO = configurado;
  window.API_VIA_ARQUIVO = viaArquivo;
  window.API_DICA_SERVIDOR =
    'Esta página foi aberta como arquivo (file://) e está usando http://localhost:3000 como servidor. ' +
    'Se o backend roda nesta mesma máquina ("npm start"), funciona normalmente. ' +
    'Em outro dispositivo, abra http://IP-da-máquina:3000/motorista.html ou acrescente ' +
    '?api=http://IP-da-máquina:3000 no final do endereço deste arquivo.';

  window.apiUrl = function (caminho) {
    return (window.API_BASE || "") + caminho;
  };

  window.apiErroConexao = function (contexto, erro) {
    if (window.API_VIA_ARQUIVO && !window.API_CONFIGURADO) {
      return window.API_DICA_SERVIDOR;
    }
    const detalhe = erro && erro.message ? erro.message : "sem resposta";
    return (
      "Não foi possível conectar ao servidor (" + contexto + "). " +
      'Verifique se o backend está rodando com "npm start" em ' +
      (window.API_BASE || "http://localhost:3000") + " (" + detalhe + ")."
    );
  };
})();
