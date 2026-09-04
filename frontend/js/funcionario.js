/* ======================================
   DockFlow
   Funcionário JS - Gestão do Pátio
====================================== */

document.addEventListener("DOMContentLoaded", async () => {
  await SyncDB.iniciar();

  let sessao = JSON.parse(localStorage.getItem("sessaoDockFlow"));

  if (!sessao || sessao.tipo !== "funcionario") {
    window.location.href = "login.html";
    return;
  }

  if (document.getElementById("nomeFuncionario")) {
    document.getElementById("nomeFuncionario").textContent = sessao.nome || "Funcionário";
  }

  const relogio = document.getElementById("relogio");
  const dataAtual = document.getElementById("dataAtual");
  if (relogio) {
    const atualizarRelogio = () => {
      const agora = new Date();
      relogio.textContent = agora.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      if (dataAtual) {
        dataAtual.textContent = agora.toLocaleDateString("pt-BR", {
          weekday: "short",
          day: "2-digit",
          month: "short",
        });
      }
    };
    atualizarRelogio();
    setInterval(atualizarRelogio, 1000);
  }

  // ===============================
  // ELEMENTOS
  // ===============================

  const tabelaFila = document.getElementById("tabelaFila");
  const aguardando = document.getElementById("aguardando");
  const descarga = document.getElementById("descarga");
  const docasLivres = document.getElementById("docasLivres");
  const docasCards = document.getElementById("docasCards");
  const totalHoje = document.getElementById("totalHoje");

  // ===============================
  // TÍTULOS DAS ABAS
  // ===============================

  const titulos = {
    dashboard: ["Dashboard", "Visão geral do pátio"],
    fila: ["Fila de Caminhões", "Controle de entradas e movimentações"],
    recebimento: ["Recebimento", "Controle de cargas recebidas"],
    docas: ["Docas", "Situação das docas em tempo real"],
    auditoria: ["Auditoria", "Conferência de armazenagem"],
    relatorios: ["Relatórios", "Indicadores e histórico de cargas"],
    usuarios: ["Usuários", "Gestão de acessos ao sistema"],
  };

  // ===============================
  // NAVEGAÇÃO POR ABAS
  // ===============================

  function navegar(aba) {
    document.querySelectorAll(".sidebar nav a").forEach((a) => {
      a.classList.toggle("active", a.dataset.aba === aba);
    });

    document.querySelectorAll(".abas-painel").forEach((p) => {
      p.classList.add("d-none");
    });

    const painel = document.getElementById("aba-" + aba);
    if (painel) painel.classList.remove("d-none");

    if (titulos[aba]) {
      document.getElementById("tituloAba").textContent = titulos[aba][0];
      document.getElementById("subtituloAba").textContent = titulos[aba][1];
    }

    // Carrega dados específicos da aba
    if (aba === "fila") carregarFilaCompleta();
    if (aba === "docas") carregarDocasCompleto();
    if (aba === "recebimento") carregarRecebimento();
    if (aba === "relatorios") carregarRelatorios();
    if (aba === "usuarios") carregarUsuarios();
    if (aba === "auditoria") carregarAuditorias();
  }

  document.querySelectorAll(".sidebar nav a").forEach((a) => {
    a.addEventListener("click", () => navegar(a.dataset.aba));
  });

  // ===============================
  // CARREGAR FILA (DASHBOARD)
  // ===============================

  async function carregarFila() {
    let fila = await SyncDB.buscarTodos("fila");
    let cargas = await SyncDB.buscarTodos("cargas");

    tabelaFila.innerHTML = "";

    let espera = 0;
    let andamento = 0;

    for (let item of fila) {
      let carga = cargas.find((c) => c.id === item.idCarga);
      if (!carga) continue;

      if (item.status === "Aguardando") espera++;
      if (item.status === "Em descarga") andamento++;

      tabelaFila.innerHTML += `
        <tr>
          <td>${item.senha}</td>
          <td>${carga.placaCavalo}</td>
          <td>${carga.motorista}</td>
          <td>${carga.transportadora}</td>
          <td>${carga.nf}</td>
          <td>
            <span class="badge ${item.status === "Aguardando" ? "bg-warning" : "bg-success"}">
              ${item.status}
            </span>
          </td>
          <td>
            ${
              item.status === "Aguardando"
                ? `<button class="btn btn-success btn-sm" onclick="enviarDoca(${item.id})">
                     <i class="bi bi-door-open"></i> Enviar Doca
                   </button>`
                : `<button class="btn btn-danger btn-sm" onclick="finalizarCarga(${item.id})">
                     <i class="bi bi-check-circle"></i> Finalizar
                   </button>`
            }
          </td>
        </tr>
      `;
    }

    aguardando.innerHTML = espera;
    descarga.innerHTML = andamento;

    const contadorFila = document.getElementById("contadorFila");
    if (contadorFila) {
      contadorFila.textContent = espera + " na fila";
    }

    const historico = await SyncDB.buscarTodos("historico");
    totalHoje.innerHTML = historico.length;

    await atualizarDocas();
  }

  // ===============================
  // FILA COMPLETA (ABA FILA)
  // ===============================

  async function carregarFilaCompleta() {
    let fila = await SyncDB.buscarTodos("fila");
    let cargas = await SyncDB.buscarTodos("cargas");
    const tab = document.getElementById("tabelaFilaCompleta");
    tab.innerHTML = "";

    for (let item of fila) {
      let carga = cargas.find((c) => c.id === item.idCarga);
      if (!carga) continue;

      tab.innerHTML += `
        <tr>
          <td>${item.senha}</td>
          <td>${carga.placaCavalo}</td>
          <td>${carga.motorista}</td>
          <td>${carga.transportadora}</td>
          <td>${carga.nf}</td>
          <td>
            <span class="badge ${item.status === "Aguardando" ? "bg-warning" : "bg-success"}">${item.status}</span>
          </td>
          <td>
            ${
              item.status === "Aguardando"
                ? `<button class="btn btn-success btn-sm" onclick="enviarDoca(${item.id})"><i class="bi bi-door-open"></i> Enviar Doca</button>`
                : `<button class="btn btn-danger btn-sm" onclick="finalizarCarga(${item.id})"><i class="bi bi-check-circle"></i> Finalizar</button>`
            }
          </td>
        </tr>
      `;
    }

    if (fila.length === 0) {
      tab.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Fila vazia</td></tr>';
    }
  }

  // ===============================
  // ENVIAR PARA DOCA
  // ===============================

  window.enviarDoca = async (id) => {
    let fila = await SyncDB.buscar("fila", id);
    let doca = await buscarDocaLivre();

    if (!doca) {
      Swal.fire({ icon: "warning", title: "Sem docas livres" });
      return;
    }

    let cargas = await SyncDB.buscarTodos("cargas");
    let carga = cargas.find((c) => c.id === fila.idCarga);

    fila.status = "Em descarga";
    fila.doca = doca;

    await SyncDB.atualizar("fila", fila);

    await SyncDB.adicionar("notificacoes", {
      cpf: carga ? carga.cpf : "",
      senha: fila.senha,
      mensagem: "Direcione para a doca " + doca,
      data: new Date().toLocaleString(),
    });

    await SyncDB.adicionar("auditorias", {
      data: new Date().toLocaleString(),
      colaborador: sessao.nome || "Funcionário",
      acao: "Caminhão " + fila.senha + " direcionado para " + doca,
    });

    Swal.fire({
      icon: "success",
      title: "Caminhão direcionado",
      text: "Enviado para " + doca,
    });

    await carregarFila();
    await carregarFilaCompleta();
    await atualizarDocas();
  };

  // ===============================
  // FINALIZAR CARGA (LIBERAR)
  // ===============================

  window.finalizarCarga = async (id) => {
    let fila = await SyncDB.buscar("fila", id);
    let cargas = await SyncDB.buscarTodos("cargas");
    let carga = cargas.find((c) => c.id === fila.idCarga);

    carga.status = "Finalizada";
    carga.doca = fila.doca;

    await SyncDB.adicionar("historico", carga);
    await SyncDB.remover("fila", id);

    await SyncDB.adicionar("notificacoes", {
      cpf: carga.cpf,
      senha: carga.senha,
      mensagem: "Descarga finalizada. Direcione-se para a saída.",
      data: new Date().toLocaleString(),
    });

    await SyncDB.adicionar("auditorias", {
      data: new Date().toLocaleString(),
      colaborador: sessao.nome || "Funcionário",
      acao: "Carga " + carga.senha + " finalizada na " + fila.doca,
    });

    Swal.fire({ icon: "success", title: "Carga finalizada e motorista liberado" });

    await carregarFila();
    await carregarFilaCompleta();
    await atualizarDocas();
  };

  // ===============================
  // BUSCAR DOCA LIVRE
  // ===============================

  async function buscarDocaLivre() {
    let docas = await SyncDB.buscarTodos("docas");
    let fila = await SyncDB.buscarTodos("fila");

    for (let doca of docas) {
      let ocupada = fila.some(
        (item) => item.doca === doca.nome && item.status === "Em descarga",
      );
      if (!ocupada && doca.status === "Livre") return doca.nome;
    }
    return null;
  }

  // ===============================
  // ATUALIZAR DOCAS (DASHBOARD CARDS)
  // ===============================

  async function atualizarDocas() {
    if (!docasCards) return;
    let docas = await SyncDB.buscarTodos("docas");
    let fila = await SyncDB.buscarTodos("fila");
    let cargas = await SyncDB.buscarTodos("cargas");

    let livres = 0;
    docasCards.innerHTML = "";

    docas.forEach((d) => {
      let ocupada = fila.find((f) => f.doca === d.nome && f.status === "Em descarga");
      if (!ocupada && d.status === "Livre") livres++;

      let icone, cor, rotulo, corpo;
      if (ocupada) {
        icone = "bi-truck"; cor = "danger"; rotulo = "Ocupada";
        let carga = cargas.find((c) => c.id === ocupada.idCarga);
        corpo = `
          <div class="doca-info-divider"></div>
          <p class="doca-label mb-0"><i class="bi bi-truck me-1"></i>Motorista</p>
          <p class="doca-valor mb-2">${carga ? carga.motorista : "-"}</p>
          <p class="doca-label mb-0"><i class="bi bi-upc-scan me-1"></i>Placa</p>
          <p class="doca-valor mb-2">${carga ? carga.placaCavalo : "-"}</p>
          <p class="doca-label mb-0"><i class="bi bi-ticket me-1"></i>Senha</p>
          <p class="doca-valor mb-0">${ocupada.senha}</p>
        `;
      } else {
        icone = "bi-door-open"; cor = "success"; rotulo = "Livre";
        corpo = `
          <div class="doca-info-divider"></div>
          <p class="doca-status-livre mb-0">Disponível para descarga</p>
          <p class="doca-horario mt-1 mb-0">Pronto para receber caminhão</p>
        `;
      }

      docasCards.innerHTML += `
        <div class="col-md-4">
          <div class="card doca-elegante ${ocupada ? "doca-em-uso" : "doca-disponivel"}">
            <div class="doca-head">
              <span class="doca-nome"><i class="bi ${icone} me-2"></i>${d.nome}</span>
              <span class="badge bg-${cor}">${rotulo}</span>
            </div>
            <div class="doca-body text-center">
              <i class="bi ${icone} doca-icone-g"></i>
              <h5 class="doca-titulo">${rotulo === "Livre" ? "Doca liberada" : "Descarga em andamento"}</h5>
              ${corpo}
            </div>
          </div>
        </div>
      `;
    });

    docasLivres.innerHTML = livres;
  }

  // ===============================
  // DOCAS COMPLETO (ABA DOCAS)
  // ===============================

  async function carregarDocasCompleto() {
    const cont = document.getElementById("docasCardsCompleto");
    let docas = await SyncDB.buscarTodos("docas");
    let fila = await SyncDB.buscarTodos("fila");
    let cargas = await SyncDB.buscarTodos("cargas");

    cont.innerHTML = "";

    docas.forEach((d) => {
      let ocupada = fila.find((f) => f.doca === d.nome && f.status === "Em descarga");
      let icone, cor, rotulo, corpo;
      if (ocupada) {
        icone = "bi-truck"; cor = "danger"; rotulo = "Ocupada";
        let carga = cargas.find((c) => c.id === ocupada.idCarga);
        corpo = `
          <div class="doca-info-divider"></div>
          <p class="doca-label mb-0"><i class="bi bi-person me-1"></i>Motorista</p>
          <p class="doca-valor mb-2">${carga ? carga.motorista : "-"}</p>
          <p class="doca-label mb-0"><i class="bi bi-upc-scan me-1"></i>Placa</p>
          <p class="doca-valor mb-2">${carga ? carga.placaCavalo : "-"}</p>
          <p class="doca-label mb-0"><i class="bi bi-file-earmark-text me-1"></i>NF</p>
          <p class="doca-valor mb-2">${carga ? carga.nf : "-"}</p>
          <p class="doca-label mb-0"><i class="bi bi-ticket me-1"></i>Senha</p>
          <p class="doca-valor mb-0">${ocupada.senha}</p>
        `;
      } else {
        icone = "bi-door-open"; cor = "success"; rotulo = "Livre";
        corpo = `
          <div class="doca-info-divider"></div>
          <p class="doca-status-livre mb-0">Disponível para descarga</p>
          <p class="doca-horario mt-1 mb-0">Pronto para receber caminhão</p>
        `;
      }

      cont.innerHTML += `
        <div class="col-md-6 col-lg-4">
          <div class="card doca-elegante ${ocupada ? "doca-em-uso" : "doca-disponivel"}">
            <div class="doca-head">
              <span class="doca-nome"><i class="bi ${icone} me-2"></i>${d.nome}</span>
              <span class="badge bg-${cor}">${rotulo}</span>
            </div>
            <div class="doca-body text-center">
              <i class="bi ${icone} doca-icone-g"></i>
              <h5 class="doca-titulo">${rotulo === "Livre" ? "Doca liberada" : "Descarga em andamento"}</h5>
              ${corpo}
            </div>
          </div>
        </div>
      `;
    });
  }

  // ===============================
  // RECEBIMENTO (ABA)
  // ===============================

  async function carregarRecebimento() {
    let cargas = await SyncDB.buscarTodos("cargas");
    let historico = await SyncDB.buscarTodos("historico");

    const recebidosHoje = document.getElementById("recebidosHoje");
    const andamento = document.getElementById("recebimentoAndamento");
    const total = document.getElementById("recebimentoTotal");
    const tab = document.getElementById("tabelaRecebimento");

    const emAndamento = cargas.filter((c) => c.status !== "Finalizada").length;
    recebidosHoje.innerHTML = historico.length;
    andamento.innerHTML = emAndamento;
    total.innerHTML = historico.length + emAndamento;

    tab.innerHTML = "";

    [...cargas, ...historico].forEach((c) => {
      tab.innerHTML += `
        <tr>
          <td>${c.senha}</td>
          <td>${c.nf || "-"}</td>
          <td>${c.transportadora || "-"}</td>
          <td>${c.tipoCarga || "-"}</td>
          <td>${c.peso || "-"}</td>
          <td>${c.doca || "-"}</td>
          <td><span class="badge ${c.status === "Finalizada" ? "bg-success" : "bg-warning"}">${c.status}</span></td>
        </tr>
      `;
    });

    if (tab.innerHTML === "") {
      tab.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Nenhum recebimento</td></tr>';
    }
  }

  // ===============================
  // AUDITORIA (ABA)
  // ===============================

  async function carregarAuditorias() {
    const tab = document.getElementById("tabelaAuditorias");
    let auds = await SyncDB.buscarTodos("auditorias");
    tab.innerHTML = "";

    auds.reverse().forEach((a) => {
      tab.innerHTML += `
        <tr>
          <td>${a.data}</td>
          <td>${a.colaborador || "-"}</td>
          <td>${a.itens || "-"}</td>
          <td>${a.acao || a.observacao || "-"}</td>
        </tr>
      `;
    });

    if (auds.length === 0) {
      tab.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhuma auditoria registrada</td></tr>';
    }
  }

  const btnSalvar = document.getElementById("btnSalvarAuditoria");
  if (btnSalvar) {
    btnSalvar.addEventListener("click", async () => {
      const itens = [
        "audProdutoCorreto", "audQuantidade", "audValidade", "audLote",
        "audRack", "audFora", "audQuarentena", "audAvariado",
      ].filter((id) => document.getElementById(id) && document.getElementById(id).checked).length;

      await SyncDB.adicionar("auditorias", {
        data: new Date().toLocaleString(),
        colaborador: sessao.nome || "Funcionário",
        itens: itens + "/8 conferidos",
        acao: "Auditoria de armazenagem registrada",
      });

      Swal.fire({ icon: "success", title: "Auditoria registrada" });
      carregarAuditorias();
    });
  }

  // ===============================
  // RELATÓRIOS (ABA)
  // ===============================

  async function carregarRelatorios() {
    let historico = await SyncDB.buscarTodos("historico");

    document.getElementById("relFinalizadas").innerHTML = historico.length;
    document.getElementById("relMotoristas").innerHTML = new Set(historico.map((h) => h.cpf)).size;
    document.getElementById("relTransportadoras").innerHTML = new Set(historico.map((h) => h.transportadora)).size;

    const tab = document.getElementById("tabelaRelatorios");
    tab.innerHTML = "";

    historico.reverse().forEach((h) => {
      tab.innerHTML += `
        <tr>
          <td>${h.data}</td>
          <td>${h.senha}</td>
          <td>${h.motorista}</td>
          <td>${h.transportadora || "-"}</td>
          <td>${h.nf || "-"}</td>
          <td>${h.doca || "-"}</td>
          <td><span class="badge bg-success">${h.status}</span></td>
        </tr>
      `;
    });

    if (historico.length === 0) {
      tab.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Nenhuma carga finalizada</td></tr>';
    }
  }

  // ===============================
  // USUÁRIOS (ABA)
  // ===============================

  async function carregarUsuarios() {
    const tab = document.getElementById("tabelaUsuarios");
    const res = await fetch("/api/auth/usuarios").catch(() => null);
    let usuarios = res && res.ok ? await res.json() : await SyncDB.buscarTodos("usuarios");

    tab.innerHTML = "";

    usuarios.forEach((u) => {
      tab.innerHTML += `
        <tr>
          <td>${u.id}</td>
          <td>${u.nome}</td>
          <td>${u.cpf}</td>
          <td><span class="badge bg-${u.tipo === "funcionario" ? "primary" : "secondary"}">${u.tipo}</span></td>
        </tr>
      `;
    });

    if (usuarios.length === 0) {
      tab.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhum usuário</td></tr>';
    }
  }

  // MODAL NOVO USUÁRIO
  const btnNovo = document.getElementById("btnNovoUsuario");
  if (btnNovo) {
    const modalEl = document.getElementById("modalNovoUsuario");
    const modalNovo = new bootstrap.Modal(modalEl);
    btnNovo.addEventListener("click", () => modalNovo.show());

    document.getElementById("formNovoUsuario").addEventListener("submit", async (e) => {
      e.preventDefault();
      const nome = document.getElementById("novoNome").value;
      const cpf = document.getElementById("novoCpf").value.replace(/\D/g, "");
      const tipo = document.getElementById("novoTipo").value;
      const senha = document.getElementById("novaSenha").value;

      const res = await fetch("/api/auth/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, cpf, tipo, senha }),
      });
      const data = await res.json();

      if (!res.ok) {
        Swal.fire({ icon: "error", title: "Erro", text: data.erro });
        return;
      }

      Swal.fire({ icon: "success", title: "Usuário cadastrado" });
      modalNovo.hide();
      document.getElementById("formNovoUsuario").reset();
      carregarUsuarios();
    });
  }

  // ===============================
  // LOGOUT
  // ===============================

  document.getElementById("logout").addEventListener("click", () => {
    localStorage.removeItem("sessaoDockFlow");
    window.location.href = "login.html";
  });

  // ===============================
  // PRIMEIRA CARGA E ATUALIZAÇÃO
  // ===============================

  await carregarFila();
  setInterval(() => carregarFila(), 5000);
});
