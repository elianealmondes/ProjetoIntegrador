/* ======================================
   DockFlow
   Motorista JS - Gestão do Pátio
====================================== */

document.addEventListener("DOMContentLoaded", async () => {
  await SyncDB.iniciar();

  // ===============================
  // VALIDAR SESSÃO
  // ===============================

  let sessao = JSON.parse(localStorage.getItem("sessaoDockFlow"));

  if (!sessao || sessao.tipo !== "motorista") {
    window.location.href = "login.html";
    return;
  }

  const cpfMotorista = (sessao.usuario || "").replace(/\D/g, "");

  // Preenche o CPF automaticamente a partir do login (sem mascara)
  const campoCpf = document.getElementById("cpfMotorista");
  if (campoCpf && cpfMotorista) {
    campoCpf.value = cpfMotorista;
  }

  // ===============================
  // ELEMENTOS
  // ===============================

  const formCheckin = document.getElementById("formCheckin");
  const senhaFila = document.getElementById("senhaFila");
  const posicaoFila = document.getElementById("posicaoFila");
  const statusCarga = document.getElementById("statusCarga");
  const numeroDoca = document.getElementById("numeroDoca");
  const situacaoMotorista = document.getElementById("situacaoMotorista");
  const listaNotificacoes = document.getElementById("listaNotificacoes");
  const historico = document.getElementById("historicoViagens");

  // ===============================
  // GERAR SENHA
  // ===============================

  function gerarSenha() {
    let numero = Math.floor(Math.random() * 900 + 100);
    return "A" + numero;
  }

  // ===============================
  // CHECK-IN
  // ===============================

  formCheckin.addEventListener("submit", async (e) => {
    e.preventDefault();

    let senha = gerarSenha();

    let carga = {
      senha: senha,
      motorista: document.getElementById("nomeMotorista").value,
      cpf: normalizarCpf(document.getElementById("cpfMotorista").value),
      telefone: document.getElementById("telefone").value,
      transportadora: document.getElementById("transportadora").value,
      placaCavalo: document.getElementById("placaCavalo").value,
      placaCarreta: document.getElementById("placaCarreta").value,
      nf: document.getElementById("numeroNF").value,
      operacao: document.getElementById("tipoOperacao").value,
      tipoCarga: document.getElementById("tipoCarga").value,
      peso: document.getElementById("pesoCarga").value,
      observacao: document.getElementById("observacoes").value,
      status: "Aguardando",
      doca: "--",
      data: new Date().toLocaleString(),
    };

    let idCarga = await SyncDB.adicionar("cargas", carga);

    await SyncDB.adicionar("fila", {
      idCarga: idCarga,
      senha: senha,
      status: "Aguardando",
      doca: "--",
      data: carga.data,
    });

    await SyncDB.adicionar("notificacoes", {
      cpf: carga.cpf,
      senha: senha,
      mensagem: "Check-in realizado com sucesso.",
      data: new Date().toLocaleString(),
    });

    senhaFila.innerHTML = senha;
    statusCarga.innerHTML = "Aguardando";

    Swal.fire({
      icon: "success",
      title: "Check-in concluído",
      text: "Sua senha é " + senha,
    });

    formCheckin.reset();
    atualizarFila();
  });

  function normalizarCpf(valor) {
    return (valor || "").replace(/\D/g, "");
  }

  // ===============================
  // ATUALIZAR FILA
  // ===============================

  async function atualizarFila() {
    let fila = await SyncDB.buscarTodos("fila");
    let cargas = await SyncDB.buscarTodos("cargas");
    let historico = await SyncDB.buscarTodos("historico");

    function pintarStatus(status) {
      const barra = document.getElementById("progressoCarga");
      const badge = document.getElementById("statusCarga");
      if (barra) {
        if (status === "Aguardando") {
          barra.style.width = "20%";
          barra.textContent = "20% · Na fila";
        } else if (status === "Em descarga") {
          barra.style.width = "65%";
          barra.textContent = "65% · Em descarga";
        } else if (status === "Finalizada") {
          barra.style.width = "100%";
          barra.textContent = "100% · Concluída";
        }
      }
      if (badge) {
        let classe = "status-texto ";
        if (status === "Aguardando") classe += "st-aguardando";
        else if (status === "Em descarga") classe += "st-descarga";
        else classe += "st-finalizado";
        badge.className = classe;
        badge.textContent = status;
      }
    }

    // Cargas desta sessão (por CPF)
    let minhasCargas = cargas.filter(
      (c) => normalizarCpf(c.cpf) === cpfMotorista,
    );
    let minhasSenhas = minhasCargas.map((c) => c.senha);

    // Minha entrada ativa na fila (não finalizada)
    let minhaFila = fila.find((item) => minhasSenhas.includes(item.senha));

    // Viagens finalizadas deste motorista
    let minhasFinalizadas = historico.filter(
      (h) => normalizarCpf(h.cpf) === cpfMotorista,
    );

    let aguardando = fila.filter((item) => item.status === "Aguardando");
    posicaoFila.innerHTML = aguardando.length;

    if (minhaFila) {
      senhaFila.innerHTML = minhaFila.senha;
      statusCarga.innerHTML = minhaFila.status;

      let minhaCarga = minhasCargas.find(
        (c) => c.senha === minhaFila.senha,
      );

      if (minhaFila.status === "Em descarga") {
        numeroDoca.innerHTML = minhaFila.doca || "--";
        situacaoMotorista.innerHTML =
          "Dirija-se à <strong>" + (minhaFila.doca || "--") + "</strong>";
      } else if (minhaFila.status === "Aguardando") {
        numeroDoca.innerHTML = "--";
        situacaoMotorista.innerHTML = "Aguardando fila";
      }

      if (minhaCarga && minhaCarga.doca && minhaCarga.doca !== "--") {
        numeroDoca.innerHTML = minhaCarga.doca;
      }
      pintarStatus(minhaFila.status);
    } else if (minhasFinalizadas.length > 0) {
      // Última viagem foi finalizada (liberada pelo funcionário)
      let ultima = minhasFinalizadas[minhasFinalizadas.length - 1];
      statusCarga.innerHTML = "Finalizada";
      senhaFila.innerHTML = ultima.senha;
      numeroDoca.innerHTML = ultima.doca || "--";
      situacaoMotorista.innerHTML =
        '<span class="text-success"><i class="bi bi-check-circle-fill"></i> Processo finalizado. Direcione-se para a saída.</span>';
      pintarStatus("Finalizada");
    } else if (minhasCargas.length === 0) {
      senhaFila.innerHTML = "A001";
      numeroDoca.innerHTML = "--";
      situacaoMotorista.innerHTML = "Aguardando fila";
      statusCarga.innerHTML = "Aguardando";
      pintarStatus("Aguardando");
    }
  }

  // ===============================
  // NOTIFICAÇÕES (filtradas por motorista)
  // ===============================

  // IDs de notificações já exibidas (para detectar novidades)
  let notificacoesExibidas = new Set();
  let primeiraCargaNotif = true;

  // Toca um "bip" de notificação via Web Audio API (sem arquivo externo)
  function tocarBip() {
    try {
      let AudioCtx =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      let ctx = new AudioCtx();
      let oscilador = ctx.createOscillator();
      let ganho = ctx.createGain();
      oscilador.type = "sine";
      oscilador.frequency.value = 880;
      ganho.gain.setValueAtTime(0.001, ctx.currentTime);
      ganho.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      oscilador.connect(ganho);
      ganho.connect(ctx.destination);
      oscilador.start();
      oscilador.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // falha silenciosa se o navegador bloquear áudio autoplay
    }
  }

  async function carregarNotificacoes() {
    let dados = await SyncDB.buscarTodos("notificacoes");

    // Só notificações deste motorista
    let minhas = dados.filter((n) => normalizarCpf(n.cpf) === cpfMotorista);

    // Toca o bip para notificações novas ainda não vistas
    if (primeiraCargaNotif) {
      // Primeira carga: só registra as existentes, sem tocar som
      minhas.forEach((n) => {
        let chave = n.id != null ? n.id : n.data + "|" + n.mensagem;
        notificacoesExibidas.add(chave);
      });
      primeiraCargaNotif = false;
    } else {
      minhas.forEach((n) => {
        let chave = n.id != null ? n.id : n.data + "|" + n.mensagem;
        if (!notificacoesExibidas.has(chave)) {
          tocarBip();
          notificacoesExibidas.add(chave);
        }
      });
    }

    listaNotificacoes.innerHTML = "";

    if (minhas.length === 0) {
      listaNotificacoes.innerHTML =
        '<li class="list-group-item text-muted">Nenhuma notificação.</li>';
      return;
    }

    minhas.reverse().forEach((n) => {
      listaNotificacoes.innerHTML += `
        <li class="list-group-item">
          <i class="bi bi-bell text-primary"></i>
          ${n.mensagem}
          <br>
          <small>${n.data}</small>
        </li>
      `;
    });
  }

  // ===============================
  // HISTÓRICO (filtrado por motorista)
  // ===============================

  async function carregarHistorico() {
    let dados = await SyncDB.buscarTodos("historico");

    // Só viagens deste motorista
    let minhas = dados.filter(
      (item) => normalizarCpf(item.cpf) === cpfMotorista,
    );

    historico.innerHTML = "";

    if (minhas.length === 0) {
      historico.innerHTML =
        '<tr><td colspan="5" class="text-center text-muted">Nenhuma viagem registrada</td></tr>';
      return;
    }

    minhas.forEach((item) => {
      historico.innerHTML += `
        <tr>
          <td>${item.data}</td>
          <td>${item.nf}</td>
          <td>${item.transportadora}</td>
          <td>${item.status}</td>
          <td>${item.doca}</td>
        </tr>
      `;
    });
  }

  // ===============================
  // TEMPO
  // ===============================

  let minutos = 45;

  setInterval(() => {
    let campo = document.getElementById("tempoEstimado");
    if (campo) {
      if (minutos > 0) minutos--;
      campo.innerHTML = minutos + " min";
    }
  }, 60000);

  // Relógio e data (topbar)
  function atualizarRelogio() {
    let agora = new Date();
    let campoData = document.getElementById("dataAtual");
    let campoRelogio = document.getElementById("relogio");
    if (campoRelogio) {
      campoRelogio.innerHTML = agora.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (campoData) {
      campoData.innerHTML =
        agora.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
        }) +
        " · " +
        agora.getFullYear();
    }
  }
  atualizarRelogio();
  setInterval(atualizarRelogio, 1000);

  // ===============================
  // LOGOUT
  // ===============================

  document.getElementById("btnLogout").addEventListener("click", () => {
    localStorage.removeItem("sessaoDockFlow");
    window.location.href = "login.html";
  });

  // ===============================
  // ATUALIZAÇÕES
  // ===============================

  await atualizarFila();
  await carregarNotificacoes();
  await carregarHistorico();

  setInterval(async () => {
    await atualizarFila();
    await carregarNotificacoes();
  }, 5000);
});
