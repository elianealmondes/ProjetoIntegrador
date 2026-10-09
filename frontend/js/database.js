/* ======================================
   DockFlow - Database JS
   Cliente da API REST (SQLite no backend)
====================================== */

// Fallback caso api.js não tenha sido carregado antes
if (typeof window.apiUrl !== "function") {
  window.apiUrl = (caminho) => caminho;
  window.apiErroConexao = (contexto, erro) =>
    `Não foi possível conectar ao servidor (${contexto}). Verifique se o backend está rodando com "npm start". (${erro && erro.message ? erro.message : "sem resposta"})`;
}

const SyncDB = {
  iniciar: function () {
    // Avisar quando a página foi aberta como arquivo e não há API configurada
    try {
      if (
        window.API_VIA_ARQUIVO &&
        !window.API_CONFIGURADO &&
        typeof Swal !== "undefined" &&
        !sessionStorage.getItem("dockflowAvisoArquivo")
      ) {
        sessionStorage.setItem("dockflowAvisoArquivo", "1");
        Swal.fire({
          icon: "info",
          title: "Página aberta como arquivo",
          text: window.API_DICA_SERVIDOR,
          confirmButtonText: "Entendi",
        });
      }
    } catch (e) {}
    return Promise.resolve();
  },

  adicionar: async function (tabela, dados) {
    let res;
    try {
      res = await fetch(window.apiUrl(`/api/${tabela}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
    } catch (e) {
      throw new Error(window.apiErroConexao(tabela, e));
    }
    if (!res.ok) {
      const txt = await res.text().catch(()=> "");
      throw new Error(`Falha ao salvar ${tabela}: HTTP ${res.status} ${txt}`);
    }
    const data = await res.json().catch(()=> ({}));
    if (data.id == null && data.id !== 0) {
      // alguns endpoints retornam {id} ou {ok:true}
      return data.id ?? Date.now();
    }
    return data.id;
  },

  buscarTodos: async function (tabela) {
    try {
      const res = await fetch(window.apiUrl(`/api/${tabela}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data;
    } catch (e) {
      console.warn(`[SyncDB] falha ao buscar ${tabela}:`, e);
      // Fallback mock para docas quando API offline (evita painel vazio)
      if (tabela === "docas") {
        return Array.from({ length: 6 }, (_, i) => ({
          id: i + 1,
          nome: `Doca ${String(i + 1).padStart(2, "0")}`,
          status: "Livre",
        }));
      }
      return [];
    }
  },

  buscar: async function (tabela, id) {
    try {
      const res = await fetch(window.apiUrl(`/api/${tabela}/${id}`));
      if (!res.ok) return null;
      return res.json();
    } catch (e) {
      console.warn(`[SyncDB] buscar ${tabela}/${id} falhou:`, e);
      return null;
    }
  },

  atualizar: async function (tabela, dados) {
    const id = dados.id;
    await fetch(window.apiUrl(`/api/${tabela}/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
  },

  remover: async function (tabela, id) {
    await fetch(window.apiUrl(`/api/${tabela}/${id}`), {
      method: "DELETE",
    });
  },
};
