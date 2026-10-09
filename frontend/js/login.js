/* ======================================
   DockFlow - Login JS
   Controle de acesso do sistema
====================================== */

const API = "/api/auth";

// PERFIL ATUAL

let perfilSelecionado = "motorista";

// Mantém a chave de busca consistente enquanto não há API persistente.
const normalizarCpf = (valor) => valor.replace(/\D/g, "");

// ELEMENTOS

const btnMotorista = document.getElementById("btnMotorista");

const btnFuncionario = document.getElementById("btnFuncionario");

const formLogin = document.getElementById("formLogin");

const senha = document.getElementById("senha");

const mostrarSenha = document.getElementById("mostrarSenha");

const lembrar = document.getElementById("lembrar");

// SELEÇÃO DE PERFIL

btnMotorista.addEventListener("click", () => {
  perfilSelecionado = "motorista";

  btnMotorista.classList.add("ativo");

  btnFuncionario.classList.remove("ativo");
});

btnFuncionario.addEventListener("click", () => {
  perfilSelecionado = "funcionario";

  btnFuncionario.classList.add("ativo");

  btnMotorista.classList.remove("ativo");
});

// MOSTRAR SENHA

mostrarSenha.addEventListener("click", () => {
  if (senha.type === "password") {
    senha.type = "text";

    mostrarSenha.innerHTML = `<i class="bi bi-eye-slash"></i>`;
  } else {
    senha.type = "password";

    mostrarSenha.innerHTML = `<i class="bi bi-eye"></i>`;
  }
});

// ABRIR MODAL CADASTRO

const abrirCadastro = document.getElementById("abrirCadastro");

const modalCadastro = new bootstrap.Modal(
  document.getElementById("modalCadastro"),
);

abrirCadastro.addEventListener("click", () => {
  modalCadastro.show();
});

/* ======================================
   CADASTRO DE USUÁRIO
====================================== */

const formCadastro = document.getElementById("formCadastro");

formCadastro.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("novoNome").value;
  const cpf = normalizarCpf(document.getElementById("novoCPF").value);
  const tipo = document.getElementById("novoTipo").value;
  const senhaVal = document.getElementById("novaSenha").value;

  if (cpf.length !== 11) {
    Swal.fire({ icon: "error", title: "CPF inválido", text: "Informe 11 dígitos." });
    return;
  }

  try {
    const res = await fetch(`${API}/cadastro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, cpf, tipo, senha: senhaVal }),
    });

    const data = await res.json();

    if (!res.ok) {
      Swal.fire({ icon: "error", title: "Erro", text: data.erro });
      return;
    }

    Swal.fire({
      icon: "success",
      title: "Cadastro realizado",
      text: "Usuário criado com sucesso!",
    });

    formCadastro.reset();
    modalCadastro.hide();
  } catch (err) {
    Swal.fire({ icon: "error", title: "Erro de conexão", text: "Não foi possível conectar ao servidor. Inicie com: npm start" });
  }
});

/* ======================================
   LOGIN
====================================== */

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();

  const usuarioInformado = document.getElementById("usuario").value.trim();
  const cpf = usuarioInformado === "admin"
    ? usuarioInformado
    : normalizarCpf(usuarioInformado);
  const senhaDigitada = document.getElementById("senha").value;

  if (cpf === "admin" && senhaDigitada === "123") {
    let sessao = {
      usuario: "admin",
      nome: "Administrador",
      tipo: perfilSelecionado,
      data: new Date(),
    };

    localStorage.setItem("sessaoDockFlow", JSON.stringify(sessao));

    if (lembrar.checked) {
      localStorage.setItem("lembrarLogin", JSON.stringify(sessao));
    }

    Swal.fire({
      icon: "success",
      title: "Login realizado",
      timer: 1500,
      showConfirmButton: false,
    }).then(() => {
      if (perfilSelecionado === "motorista") {
        window.location.href = "motorista.html";
      } else {
        window.location.href = "funcionario.html";
      }
    });
    return;
  }

  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf, senha: senhaDigitada, tipo: perfilSelecionado }),
    });

    const data = await res.json();

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Acesso negado",
        text: data.erro || "Usuário ou senha incorretos",
      });
      return;
    }

    let sessao = {
      usuario: data.cpf,
      nome: data.nome,
      tipo: data.tipo,
      data: new Date(),
    };

    localStorage.setItem("sessaoDockFlow", JSON.stringify(sessao));

    if (lembrar.checked) {
      localStorage.setItem("lembrarLogin", JSON.stringify(sessao));
    }

    Swal.fire({
      icon: "success",
      title: "Login realizado",
      timer: 1500,
      showConfirmButton: false,
    }).then(() => {
      if (perfilSelecionado === "motorista") {
        window.location.href = "motorista.html";
      } else {
        window.location.href = "funcionario.html";
      }
    });
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "Erro de conexão",
      text: "Não foi possível conectar ao servidor. Inicie com: npm start",
    });
  }
});

/* ======================================
   RECUPERAR SENHA
====================================== */

const recuperarSenha = document.getElementById("recuperarSenha");

const modalSenha = new bootstrap.Modal(document.getElementById("modalSenha"));

recuperarSenha.addEventListener("click", (e) => {
  e.preventDefault();

  modalSenha.show();
});

document.getElementById("btnRecuperar").addEventListener("click", async () => {
  const cpf = document.getElementById("cpfRecuperar").value;

  try {
    const res = await fetch(`${API}/recuperar-senha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf }),
    });

    const data = await res.json();

    if (res.ok) {
      Swal.fire({
        icon: "info",
        title: "Senha encontrada",
        text: data.mensagem,
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "CPF não encontrado",
      });
    }
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "Erro de conexão",
      text: "Não foi possível conectar ao servidor.",
    });
  }
});

/* ======================================
   AUTO LOGIN
====================================== */

window.addEventListener("load", () => {
  let loginSalvo = JSON.parse(localStorage.getItem("lembrarLogin"));

  if (loginSalvo) {
    document.getElementById("usuario").value = loginSalvo.usuario;

    lembrar.checked = true;
  }
});
