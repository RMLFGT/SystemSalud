const API_LOGIN = "../BackEnd/Usuarios/iniciar_sesion.php";

const loginForm = document.getElementById("loginForm");
const usuario = document.getElementById("usuario");
const password = document.getElementById("password");
const recordar = document.getElementById("recordar");
const mensaje = document.getElementById("loginMessage");
const mostrarPassword = document.getElementById("mostrarPassword");
const iconoPassword = document.getElementById("iconoPassword");
const loginButton = document.getElementById("loginButton");

document.addEventListener("DOMContentLoaded", () => {
    const usuarioRecordado = localStorage.getItem("saludSystemUsuario");

    if (usuarioRecordado) {
        usuario.value = usuarioRecordado;
        recordar.checked = true;
        password.focus();
    } else {
        usuario.focus();
    }
});

mostrarPassword.addEventListener("click", () => {
    const mostrar = password.type === "password";

    password.type = mostrar ? "text" : "password";
    iconoPassword.setAttribute("href", mostrar ? "#i-eye-off" : "#i-eye");
    mostrarPassword.setAttribute("aria-pressed", String(mostrar));
    mostrarPassword.setAttribute(
        "aria-label",
        mostrar ? "Ocultar contraseña" : "Mostrar contraseña"
    );
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const credencial = usuario.value.trim();
    const contrasena = password.value;

    mostrarMensaje("", "");

    if (!credencial || !contrasena) {
        mostrarMensaje("Completa todos los campos.", "error");
        return;
    }

    cambiarEstadoBoton(true);

    try {
        const respuesta = await fetch(API_LOGIN, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                usuario: credencial,
                password: contrasena
            })
        });

        const texto = await respuesta.text();
        let resultado;

        try {
            resultado = JSON.parse(texto);
        } catch {
            throw new Error("El servidor no devolvió una respuesta JSON válida.");
        }

        if (!respuesta.ok || resultado.correcto !== true) {
            throw new Error(resultado.mensaje || "No fue posible iniciar sesión.");
        }

        if (recordar.checked) {
            localStorage.setItem("saludSystemUsuario", credencial);
        } else {
            localStorage.removeItem("saludSystemUsuario");
        }

        mostrarMensaje("Inicio de sesión correcto. Entrando al sistema...", "success");

        window.setTimeout(() => {
            window.location.href = "../index.html";
        }, 700);
    } catch (error) {
        mostrarMensaje(error.message || "No fue posible conectar con el servidor.", "error");
        password.value = "";
        password.focus();
        cambiarEstadoBoton(false);
    }
});

document.getElementById("recuperar").addEventListener("click", (event) => {
    event.preventDefault();
    mostrarMensaje(
        "La recuperación de contraseña será habilitada por el administrador del sistema.",
        "info"
    );
});

function mostrarMensaje(texto, tipo) {
    mensaje.className = "login-message";
    mensaje.textContent = texto;

    if (tipo) {
        mensaje.classList.add(tipo);
    }
}

function cambiarEstadoBoton(cargando) {
    loginButton.disabled = cargando;
    loginButton.querySelector("span").textContent = cargando
        ? "Validando credenciales..."
        : "Iniciar sesión";
}
