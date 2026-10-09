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
  // MÚLTIPLAS NOTAS FISCAIS
  // ===============================

  let contadorNF = 1;

  document.getElementById("btnAdicionarNF").addEventListener("click", () => {
    adicionarNotaFiscal();
  });

  function adicionarNotaFiscal() {
    const container = document.getElementById("containerNotasFiscais");
    const index = contadorNF;
    
    const htmlNF = `
      <div class="nota-fiscal-item" data-index="${index}">
        <div class="nf-item-header">
          <span class="badge bg-primary">NF ${index + 1}</span>
          <button type="button" class="btn btn-sm btn-outline-danger btn-removerNF">
            <i class="bi bi-trash"></i> Remover
          </button>
        </div>
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label fw-semibold small">Número da NF</label>
            <input type="number" class="form-control form-control-sm numeroNF" required placeholder="000000">
          </div>
          <div class="col-md-4">
            <label class="form-label fw-semibold small">Tipo de Operação</label>
            <select class="form-select form-control-sm operacaoNF">
              <option value="">Selecione</option>
              <option>Recebimento</option>
              <option>Expedição</option>
              <option>Transferência</option>
              <option>Devolução</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label fw-semibold small">Tipo de Carga</label>
            <select class="form-select form-control-sm tipoCargaNF">
              <option value="">Selecione</option>
              <option>Paletizada</option>
              <option>Fracionada</option>
              <option>Granel</option>
              <option>Refrigerada</option>
              <option>Perigosa</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label fw-semibold small">Peso (KG)</label>
            <input type="number" class="form-control form-control-sm pesoNF" placeholder="0">
          </div>
          <div class="col-md-4">
            <label class="form-label fw-semibold small">Nota Fiscal PDF</label>
            <input type="file" class="form-control form-control-sm arquivoPDFNF" accept=".pdf">
          </div>
          <div class="col-md-4">
            <label class="form-label fw-semibold small">Arquivo XML</label>
            <input type="file" class="form-control form-control-sm arquivoXMLNF" accept=".xml">
          </div>
        </div>
      </div>
    `;
    
    container.insertAdjacentHTML("beforeend", htmlNF);
    contadorNF++;
    atualizarBotoesRemover();
  }

  function atualizarBotoesRemover() {
    const itens = document.querySelectorAll(".nota-fiscal-item");
    itens.forEach((item, i) => {
      const btnRemover = item.querySelector(".btn-removerNF");
      if (btnRemover) {
        btnRemover.style.display = itens.length > 1 ? "inline-block" : "none";
      }
      const badge = item.querySelector(".badge");
      if (badge) {
        badge.textContent = `NF ${i + 1}`;
      }
    });
  }

  document.getElementById("containerNotasFiscais").addEventListener("click", (e) => {
    if (e.target.closest(".btn-removerNF")) {
      const item = e.target.closest(".nota-fiscal-item");
      if (item) {
        item.remove();
        contadorNF--;
        atualizarBotoesRemover();
      }
    }
  });

  function coletarNotasFiscais() {
    const itens = document.querySelectorAll(".nota-fiscal-item");
    const notas = [];
    itens.forEach((item) => {
      notas.push({
        numeroNF: item.querySelector(".numeroNF").value,
        operacao: item.querySelector(".operacaoNF").value,
        tipoCarga: item.querySelector(".tipoCargaNF").value,
        peso: item.querySelector(".pesoNF").value,
        arquivoPDF: item.querySelector(".arquivoPDFNF").files[0] ? item.querySelector(".arquivoPDFNF").files[0].name : "",
        arquivoXML: item.querySelector(".arquivoXMLNF").files[0] ? item.querySelector(".arquivoXMLNF").files[0].name : "",
      });
    });
    return notas;
  }

  // ===============================
  // MÁSCARA CPF: "-" no 4º, 8º e 12º caractere → formato 000-000-000-00
  // (atende pedido "4 espaço, 8 e 10" — na prática 3-3-3-2)
  // ===============================
  function formatarCPF(valor) {
    const d = (valor || "").replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return d.slice(0, 3) + "-" + d.slice(3);
    if (d.length <= 9) return d.slice(0, 3) + "-" + d.slice(3, 6) + "-" + d.slice(6);
    return d.slice(0, 3) + "-" + d.slice(3, 6) + "-" + d.slice(6, 9) + "-" + d.slice(9);
  }

  // ===============================
  // TELEFONE: exatamente 11 dígitos, alerta vermelho
  // ===============================
  const campoCpfInput = document.getElementById("cpfMotorista");
  const campoTelefone = document.getElementById("telefone");
  let timeoutBusca = null;

  function normalizarTelefone(v) { return (v || "").replace(/\D/g, "").slice(0,11); }

  function validarTelefone(mostrar=true) {
    if (!campoTelefone) return true;
    const raw = normalizarTelefone(campoTelefone.value);
    const fb = document.getElementById("feedbackTelefone");
    if (raw.length === 0) {
      campoTelefone.classList.remove("is-invalid");
      campoTelefone.classList.remove("is-valid");
      if (fb) fb.style.display = "none";
      return false; // vazio não é válido para check-in
    }
    if (raw.length !== 11) {
      campoTelefone.classList.add("is-invalid");
      campoTelefone.classList.remove("is-valid");
      if (fb) {
        fb.textContent = `Telefone deve ter exatamente 11 números (DDD + 9 dígitos). Digitado: ${raw.length}/11`;
        fb.style.display = "block";
      }
      if (mostrar) campoTelefone.setAttribute("title","Exija 11 dígitos");
      return false;
    } else {
      campoTelefone.classList.remove("is-invalid");
      campoTelefone.classList.add("is-valid");
      if (fb) fb.style.display = "none";
      return true;
    }
  }

  function validarCPF(mostrar=true) {
    if (!campoCpfInput) return true;
    const raw = normalizarCpf(campoCpfInput.value);
    const fb = document.getElementById("feedbackCPF");
    if (raw.length === 0) {
      campoCpfInput.classList.remove("is-invalid");
      if (fb) fb.style.display = "none";
      return true; // vazio aceito, mas se preenchido exige 11
    }
    if (raw.length !== 11) {
      campoCpfInput.classList.add("is-invalid");
      if (fb) {
        fb.textContent = `CPF deve ter 11 números. Digitado: ${raw.length}/11`;
        fb.style.display = "block";
      }
      return false;
    } else {
      campoCpfInput.classList.remove("is-invalid");
      campoCpfInput.classList.add("is-valid");
      if (fb) fb.style.display = "none";
      return true;
    }
  }

  if (campoCpfInput) {
    // corrige bug de letra atropelando: cursor calculado com diff + evita loop de formatação
    campoCpfInput.addEventListener("input", (e) => {
      const el = e.target;
      const valorAntes = el.value;
      const posAntes = el.selectionStart ?? valorAntes.length;
      const formatado = formatarCPF(valorAntes);
      if (valorAntes !== formatado) {
        el.value = formatado;
        const diff = formatado.length - valorAntes.length;
        const novaPos = Math.max(0, (posAntes || 0) + diff);
        // usa rAF para garantir que o navegador já aplicou o valor antes de mover cursor
        requestAnimationFrame(() => {
          try { el.setSelectionRange(novaPos, novaPos); } catch {}
        });
      }
      validarCPF(false);
      clearTimeout(timeoutBusca);
      const cpf = normalizarCpf(el.value);
      if (cpf.length === 11) {
        timeoutBusca = setTimeout(() => buscarMotoristaPorCpf(cpf), 300);
      }
    });
    campoCpfInput.addEventListener("blur", () => validarCPF(true));
    // formata valor vindo da sessão (se existir) sem atropelar
    if (campoCpfInput.value) campoCpfInput.value = formatarCPF(campoCpfInput.value);
  }

  // ===============================
  // PLACA Mercosul: AAA-0A00 (ex: BRA2E19)
  // ===============================
  const campoPlacaCavalo = document.getElementById("placaCavalo");
  const campoPlacaCarreta = document.getElementById("placaCarreta");
  function formatarPlaca(valor) {
    const v = (valor || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
    if (v.length <= 3) return v;
    return v.slice(0, 3) + "-" + v.slice(3);
  }
  function validarPlaca(el, mostrar=true) {
    if (!el) return true;
    const raw = (el.value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const re = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
    const ok = re.test(raw);
    const fbId = el.id === "placaCavalo" ? "feedbackPlacaCavalo" : "feedbackPlacaCarreta";
    const fb = document.getElementById(fbId);
    if (raw.length === 0) {
      el.classList.remove("is-invalid","is-valid");
      if (fb) fb.style.display = "none";
      return true;
    }
    if (raw.length === 7 && ok) {
      el.classList.remove("is-invalid"); el.classList.add("is-valid");
      if (fb) fb.style.display = "none";
      return true;
    }
    if (mostrar) {
      el.classList.add("is-invalid"); el.classList.remove("is-valid");
      if (fb) { fb.textContent = "Formato Mercosul inválido. Use AAA-0A00 (ex: BRA2E19)"; fb.style.display = "block"; }
    } else {
      // durante digitação, só mostra se já tem 7 chars e inválido
      if (raw.length === 7 && !ok) {
        el.classList.add("is-invalid"); el.classList.remove("is-valid");
        if (fb) { fb.textContent = "Formato Mercosul inválido. Use AAA-0A00 (ex: BRA2E19)"; fb.style.display = "block"; }
      } else if (raw.length < 7) {
        el.classList.remove("is-invalid","is-valid");
        if (fb) fb.style.display = "none";
        return true; // ainda digitando
      }
    }
    return false;
  }
  function bindPlaca(el) {
    if (!el) return;
    el.addEventListener("input", (e) => {
      const posAntes = e.target.selectionStart ?? e.target.value.length;
      const antes = e.target.value;
      const fmt = formatarPlaca(antes);
      if (antes !== fmt) {
        e.target.value = fmt;
        const diff = fmt.length - antes.length;
        const novaPos = Math.max(0, (posAntes||0)+diff);
        requestAnimationFrame(()=>{ try{ e.target.setSelectionRange(novaPos,novaPos);}catch{} });
      } else {
        e.target.value = fmt; // garante uppercase
      }
      validarPlaca(e.target);
    });
    el.addEventListener("blur", () => validarPlaca(el));
  }
  bindPlaca(campoPlacaCavalo);
  bindPlaca(campoPlacaCarreta);

  if (campoTelefone) {
    campoTelefone.addEventListener("input", (e) => {
      // só dígitos, max 11
      const digits = normalizarTelefone(e.target.value);
      e.target.value = digits;
      validarTelefone(false);
    });
    campoTelefone.addEventListener("blur", () => validarTelefone(true));
  }

  async function buscarMotoristaPorCpf(cpf) {
    try {
      const motoristas = await SyncDB.buscarTodos("motoristas_salvos");
      const motorista = motoristas.find(m => normalizarCpf(m.cpf) === cpf);
      
      if (motorista) {
        document.getElementById("nomeMotorista").value = motorista.nome || "";
        if (campoTelefone) {
          campoTelefone.value = normalizarTelefone(motorista.telefone || "");
          validarTelefone(false);
        }
        document.getElementById("transportadora").value = motorista.transportadora || "";
        
        Swal.fire({
          icon: "info",
          title: "Motorista encontrado",
          text: `Dados de "${motorista.nome}" preenchidos automaticamente.`,
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Erro ao buscar motorista:", error);
    }
  }

  async function salvarMotorista(motorista) {
    try {
      const motoristas = await SyncDB.buscarTodos("motoristas_salvos");
      const existente = motoristas.find(m => normalizarCpf(m.cpf) === motorista.cpf);
      
      if (existente) {
        await SyncDB.atualizar("motoristas_salvos", {
          id: existente.id,
          nome: motorista.nome,
          telefone: motorista.telefone,
          transportadora: motorista.transportadora,
        });
      } else {
        await SyncDB.adicionar("motoristas_salvos", {
          cpf: motorista.cpf,
          nome: motorista.nome,
          telefone: motorista.telefone,
          transportadora: motorista.transportadora,
        });
      }
    } catch (error) {
      console.error("Erro ao salvar motorista:", error);
    }
  }

  // ===============================
  // CHECK-IN - CORRIGIDO (validação + try/catch + feedback)
  // ===============================

  formCheckin.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("[checkin] submit disparado");

    // validações obrigatórias
    const telOk = validarTelefone(true);
    const cpfOk = validarCPF(true);
    const nomeVal = document.getElementById("nomeMotorista").value.trim();
    if (!nomeVal) {
      Swal.fire({ icon: "warning", title: "Nome obrigatório", text: "Informe o nome do motorista." });
      document.getElementById("nomeMotorista").classList.add("is-invalid");
      return;
    } else {
      document.getElementById("nomeMotorista").classList.remove("is-invalid");
    }
    if (!telOk) {
      Swal.fire({ icon: "error", title: "Telefone inválido", text: "O telefone deve ter exatamente 11 números (ex: 11999999999)." });
      return;
    }
    if (!cpfOk) {
      Swal.fire({ icon: "error", title: "CPF inválido", text: "CPF deve ter 11 números quando preenchido." });
      return;
    }
    // validação placas Mercosul AAA-0A00 (opcional mas se preenchido deve ser válido)
    const placaCavEl = document.getElementById("placaCavalo");
    const placaCarEl = document.getElementById("placaCarreta");
    const cavOk = !placaCavEl.value.trim() || validarPlaca(placaCavEl, true);
    const carOk = !placaCarEl.value.trim() || validarPlaca(placaCarEl, true);
    if (!cavOk) {
      Swal.fire({ icon: "error", title: "Placa Cavalo inválida", text: "Use formato Mercosul AAA-0A00 (ex: BRA2E19)." });
      return;
    }
    if (!carOk) {
      Swal.fire({ icon: "error", title: "Placa Carreta inválida", text: "Use formato Mercosul AAA-0A00." });
      return;
    }

    let notasFiscais = coletarNotasFiscais();
    // exige ao menos 1 NF com número
    if (!notasFiscais.length || !notasFiscais[0].numeroNF) {
      Swal.fire({ icon: "warning", title: "Nota Fiscal obrigatória", text: "Informe o número da NF." });
      const nfInput = document.querySelector(".numeroNF");
      if (nfInput) nfInput.classList.add("is-invalid");
      return;
    }

    const btnSubmit = formCheckin.querySelector('button[type="submit"]');
    const textoOriginal = btnSubmit ? btnSubmit.innerHTML : "";
    if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enviando...'; }

    try {
      let senha = gerarSenha();

      let carga = {
        senha: senha,
        motorista: nomeVal,
        cpf: normalizarCpf(document.getElementById("cpfMotorista").value),
        telefone: normalizarTelefone(document.getElementById("telefone").value),
        transportadora: document.getElementById("transportadora").value,
        placaCavalo: document.getElementById("placaCavalo").value,
        placaCarreta: document.getElementById("placaCarreta").value,
        nf: notasFiscais.map(nf => nf.numeroNF).join(", "),
        operacao: notasFiscais.map(nf => nf.operacao).join(", "),
        tipoCarga: notasFiscais.map(nf => nf.tipoCarga).join(", "),
        peso: notasFiscais.map(nf => nf.peso).join(", "),
        observacao: document.getElementById("observacoes").value,
        status: "Aguardando",
        doca: "--",
        data: new Date().toLocaleString(),
      };

      console.log("[checkin] enviando carga", carga);
      let idCarga = await SyncDB.adicionar("cargas", carga);
      if (!idCarga && idCarga !== 0) throw new Error("Servidor não retornou ID da carga. Verifique se o servidor está rodando (npm start).");
      console.log("[checkin] idCarga", idCarga);

      // Salvar as notas fiscais separadamente (opcional, não bloqueia)
      try {
        for (const nf of notasFiscais) {
          await SyncDB.adicionar("notas_fiscais", {
            idCarga: idCarga,
            numeroNF: nf.numeroNF,
            operacao: nf.operacao,
            tipoCarga: nf.tipoCarga,
            peso: nf.peso,
            arquivoPDF: nf.arquivoPDF,
            arquivoXML: nf.arquivoXML,
          });
        }
      } catch (err) {
        console.warn("Erro ao salvar notas fiscais:", err);
      }

      // Salvar dados do motorista para próxima vez (opcional, não bloqueia)
      try {
        await salvarMotorista({
          cpf: carga.cpf,
          nome: carga.motorista,
          telefone: carga.telefone,
          transportadora: carga.transportadora,
        });
      } catch (err) {
        console.warn("Erro ao salvar dados do motorista:", err);
      }

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

      if (senhaFila) senhaFila.innerHTML = senha;
      if (statusCarga) statusCarga.innerHTML = "Aguardando";

      await Swal.fire({
        icon: "success",
        title: "Check-in concluído",
        text: "Sua senha é " + senha,
      });

      formCheckin.reset();
      // limpar estados visuais
      if (campoTelefone) campoTelefone.classList.remove("is-invalid","is-valid");
      if (campoCpfInput) campoCpfInput.classList.remove("is-invalid","is-valid");
      if (campoPlacaCavalo) campoPlacaCavalo.classList.remove("is-invalid","is-valid");
      if (campoPlacaCarreta) campoPlacaCarreta.classList.remove("is-invalid","is-valid");
      const fbTel = document.getElementById("feedbackTelefone");
      const fbCPF = document.getElementById("feedbackCPF");
      const fbCav = document.getElementById("feedbackPlacaCavalo");
      const fbCar = document.getElementById("feedbackPlacaCarreta");
      if (fbTel) fbTel.style.display="none";
      if (fbCPF) fbCPF.style.display="none";
      if (fbCav) fbCav.style.display="none";
      if (fbCar) fbCar.style.display="none";
      
      // Resetar notas fiscais para apenas uma
      const containerNF = document.getElementById("containerNotasFiscais");
      containerNF.innerHTML = `
        <div class="nota-fiscal-item" data-index="0">
          <div class="nf-item-header">
            <span class="badge bg-primary">NF 1</span>
          </div>
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label fw-semibold small">Número da NF</label>
              <input type="number" class="form-control form-control-sm numeroNF" required placeholder="000000">
            </div>
            <div class="col-md-4">
              <label class="form-label fw-semibold small">Tipo de Operação</label>
              <select class="form-select form-control-sm operacaoNF">
                <option value="">Selecione</option>
                <option>Recebimento</option>
                <option>Expedição</option>
                <option>Transferência</option>
                <option>Devolução</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-semibold small">Tipo de Carga</label>
              <select class="form-select form-control-sm tipoCargaNF">
                <option value="">Selecione</option>
                <option>Paletizada</option>
                <option>Fracionada</option>
                <option>Granel</option>
                <option>Refrigerada</option>
                <option>Perigosa</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-semibold small">Peso (KG)</label>
              <input type="number" class="form-control form-control-sm pesoNF" placeholder="0">
            </div>
            <div class="col-md-4">
              <label class="form-label fw-semibold small">Nota Fiscal PDF</label>
              <input type="file" class="form-control form-control-sm arquivoPDFNF" accept=".pdf">
            </div>
            <div class="col-md-4">
              <label class="form-label fw-semibold small">Arquivo XML</label>
              <input type="file" class="form-control form-control-sm arquivoXMLNF" accept=".xml">
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-outline-danger mt-1 btn-removerNF" style="display:none;">
            <i class="bi bi-trash"></i> Remover
          </button>
        </div>
      `;
      contadorNF = 1;
      atualizarBotoesRemover();
      
      await atualizarFila();
      await carregarNotificacoes();
      await carregarHistorico();
    } catch (err) {
      console.error("[checkin] erro", err);
      const textoErro =
        window.API_VIA_ARQUIVO && !window.API_CONFIGURADO
          ? window.API_DICA_SERVIDOR
          : err.message ||
            "Falha ao salvar. Verifique se o servidor está rodando (npm start).";
      Swal.fire({ icon: "error", title: "Erro no check-in", text: textoErro });
    } finally {
      if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerHTML = textoOriginal; }
    }
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
  let totalNaoLidas = 0;

  // Solicitar permissão para notificações do navegador
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  // Toca um som de notificação de tom médio via Web Audio API
  function tocarNotificacao() {
    try {
      let AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      let ctx = new AudioCtx();

      // Primeiro tom (Lá4 - 440Hz)
      let osc1 = ctx.createOscillator();
      let ganho1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.value = 440;
      ganho1.gain.setValueAtTime(0.001, ctx.currentTime);
      ganho1.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.03);
      ganho1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc1.connect(ganho1);
      ganho1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.22);

      // Segundo tom (Dó5 - 523Hz) - suave, 150ms depois
      let osc2 = ctx.createOscillator();
      let ganho2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.value = 523;
      ganho2.gain.setValueAtTime(0.001, ctx.currentTime + 0.15);
      ganho2.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.18);
      ganho2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc2.connect(ganho2);
      ganho2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.48);
    } catch (e) {
      // falha silenciosa se o navegador bloquear áudio autoplay
    }
  }

  // Enviar notificação do navegador (desktop)
  function enviarNotificacaoDesktop(titulo, mensagem) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(titulo, {
        body: mensagem,
        icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔔</text></svg>",
        tag: "dockflow-notif",
      });
    }
  }

  // Atualizar badge de notificações não lidas
  function atualizarBadge() {
    const badge = document.getElementById("badgeNotificacoes");
    if (!badge) return;
    if (totalNaoLidas > 0) {
      badge.textContent = totalNaoLidas > 99 ? "99+" : totalNaoLidas;
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }
  }

  async function carregarNotificacoes() {
    let dados = await SyncDB.buscarTodos("notificacoes");

    // Só notificações deste motorista
    let minhas = dados.filter((n) => normalizarCpf(n.cpf) === cpfMotorista);

    // Toca o bip e notifica para notificações novas ainda não vistas
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
          tocarNotificacao();
          enviarNotificacaoDesktop("DockFlow - Nova Notificação", n.mensagem);
          notificacoesExibidas.add(chave);
          totalNaoLidas++;
          atualizarBadge();
        }
      });
    }

    listaNotificacoes.innerHTML = "";

    if (minhas.length === 0) {
      listaNotificacoes.innerHTML =
        '<li class="list-group-item text-muted">Nenhuma notificação.</li>';
      return;
    }

    let notifs = [...minhas].reverse();
    let ultimas = notifs.slice(0, 10);

    ultimas.forEach((n) => {
      let chave = n.id != null ? n.id : n.data + "|" + n.mensagem;
      let ehNova = notificacoesExibidas.has(chave) && totalNaoLidas > 0;
      let classeItem = n.mensagem.includes("doca") ? "notif-doca" : 
                       n.mensagem.includes("sucesso") ? "notif-sucesso" :
                       n.mensagem.includes("finalizada") ? "notif-finalizada" : "";

      listaNotificacoes.innerHTML += `
        <li class="list-group-item notif-item ${classeItem}">
          <div class="notif-conteudo">
            <i class="bi ${n.mensagem.includes("doca") ? "bi-door-open text-warning" : 
                         n.mensagem.includes("finalizada") ? "bi-check-circle text-success" : 
                         "bi-bell text-primary"} notif-icone"></i>
            <div class="notif-texto">
              <span class="notif-mensagem">${n.mensagem}</span>
              <small class="notif-data">${n.data}</small>
            </div>
          </div>
        </li>
      `;
    });
  }

  // Marcar notificações como lidas ao clicar na lista
  document.getElementById("listaNotificacoes").addEventListener("click", () => {
    totalNaoLidas = 0;
    atualizarBadge();
  });

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
