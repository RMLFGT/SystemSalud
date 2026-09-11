/* CONFIGURACIÓN - SALUDSYSTEM */

const notificaciones = document.getElementById("notificaciones");
const recordatorios = document.getElementById("recordatorios");
const farmacia = document.getElementById("farmacia");
const temaOscuro = document.getElementById("temaOscuro");
const animaciones = document.getElementById("animaciones");

document.addEventListener("DOMContentLoaded", () => {
    const configuracion = JSON.parse(localStorage.getItem("saludSystemConfig"));

    if (!configuracion) return;

    notificaciones.checked = configuracion.notificaciones;
    recordatorios.checked = configuracion.recordatorios;
    farmacia.checked = configuracion.farmacia;
    temaOscuro.checked = configuracion.temaOscuro;
    animaciones.checked = configuracion.animaciones;
    document.getElementById("idioma").value = configuracion.idioma;
    document.getElementById("zona").value = configuracion.zona;
    aplicarTema();
});

function guardarConfiguracion() {
    const configuracion = {
        notificaciones: notificaciones.checked,
        recordatorios: recordatorios.checked,
        farmacia: farmacia.checked,
        temaOscuro: temaOscuro.checked,
        animaciones: animaciones.checked,
        idioma: document.getElementById("idioma").value,
        zona: document.getElementById("zona").value
    };

    localStorage.setItem("saludSystemConfig", JSON.stringify(configuracion));
    aplicarTema();
    alert("Configuración guardada correctamente.");
}

temaOscuro.addEventListener("change", aplicarTema);

function aplicarTema() {
    document.body.classList.toggle("dark", temaOscuro.checked);
}

function editarPerfil() {
    const nombre = prompt("Ingresa el nombre del administrador:", "Administrador");

    if (nombre && nombre.trim() !== "") {
        alert(`Perfil actualizado correctamente.\n\nNuevo nombre: ${nombre}`);
    }
}

function cambiarPassword() {
    const actual = prompt("Ingresa tu contraseña actual:");
    if (!actual) return;

    const nueva = prompt("Ingresa tu nueva contraseña:");
    if (!nueva) return;

    if (nueva.length < 4) {
        alert("La contraseña debe tener al menos 4 caracteres.");
        return;
    }

    alert("Contraseña actualizada correctamente.");
}

async function cerrarTodasLasSesiones() {
    const confirmar = confirm("¿Deseas cerrar la sesión actual?");
    if (!confirmar) return;

    try {
        const respuesta = await fetch("../BackEnd/Usuarios/cerrar_sesion.php", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Accept": "application/json" },
            cache: "no-store"
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok || resultado.correcto !== true) {
            throw new Error(resultado.mensaje || "No fue posible cerrar la sesión.");
        }

        window.location.replace("../login/login.html");
    } catch (error) {
        alert(error.message || "No fue posible cerrar la sesión.");
    }
}

function restaurarConfiguracion() {
    const confirmar = confirm("¿Restaurar todos los valores predeterminados?");
    if (!confirmar) return;

    notificaciones.checked = true;
    recordatorios.checked = true;
    farmacia.checked = true;
    temaOscuro.checked = false;
    animaciones.checked = true;
    document.getElementById("idioma").value = "es";
    document.getElementById("zona").selectedIndex = 0;
    localStorage.removeItem("saludSystemConfig");
    aplicarTema();
    alert("Configuración restaurada correctamente.");
}
