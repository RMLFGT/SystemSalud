document.addEventListener("DOMContentLoaded", () => {
    animarTarjetas();
    configurarNavegacion();
    configurarCitas();
    actualizarHora();
    setInterval(actualizarHora, 1000);
});

function animarTarjetas() {
    document.querySelectorAll(".card").forEach((tarjeta, indice) => {
        tarjeta.style.opacity = "0";
        tarjeta.style.transform = "translateY(12px)";
        setTimeout(() => {
            tarjeta.style.transition = "opacity .35s ease, transform .35s ease, box-shadow .2s";
            tarjeta.style.opacity = "1";
            tarjeta.style.transform = "translateY(0)";
        }, indice * 80);
    });
}

function configurarNavegacion() {
    document.getElementById("verCitas")?.addEventListener("click", () => {
        window.location.href = "citas/citas.html";
    });
}

function configurarCitas() {
    document.querySelectorAll(".appointment").forEach(cita => {
        cita.addEventListener("click", () => {
            const paciente = cita.querySelector("strong")?.textContent;
            if (paciente) alert(`Cita seleccionada: ${paciente}`);
        });
    });
}

function actualizarHora() {
    const ahora = new Date();
    const hora = ahora.toLocaleTimeString("es-GT", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
    const reloj = document.getElementById("horaActual");
    if (reloj) reloj.textContent = hora;
    document.title = `SaludSystem | ${hora}`;
}
