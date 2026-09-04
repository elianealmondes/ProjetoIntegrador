/* ======================================
   DockFlow - Database JS
   Cliente da API REST (SQLite no backend)
====================================== */

const SyncDB = {
  iniciar: function () {
    return Promise.resolve();
  },

  adicionar: async function (tabela, dados) {
    const res = await fetch(`/api/${tabela}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    const data = await res.json();
    return data.id;
  },

  buscarTodos: async function (tabela) {
    const res = await fetch(`/api/${tabela}`);
    return res.json();
  },

  buscar: async function (tabela, id) {
    const res = await fetch(`/api/${tabela}/${id}`);
    if (!res.ok) return null;
    return res.json();
  },

  atualizar: async function (tabela, dados) {
    const id = dados.id;
    await fetch(`/api/${tabela}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
  },

  remover: async function (tabela, id) {
    await fetch(`/api/${tabela}/${id}`, {
      method: "DELETE",
    });
  },
};
