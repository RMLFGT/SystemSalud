"use strict";

document.addEventListener('saludsystem:sesion-lista', () => {
    actualizarHora();
    setInterval(actualizarHora, 1000);
    const boton = document.getElementById('verCitas');
    boton.hidden = !window.SaludSystemSeguridad.tienePermiso('ver', 'CITAS');
    boton.addEventListener('click', () => window.location.href = 'citas/citas.html');
    cargarInicio();
});

async function cargarInicio() {
    try {
        const respuesta = await fetch('BackEnd/Inicio/resumen.php', {cache: 'no-store', credentials: 'same-origin'});
        const resultado = await respuesta.json();
        if (!respuesta.ok || resultado.correcto !== true) throw new Error(resultado.mensaje || 'Consulta de inicio no disponible.');
        const datos = resultado.datos;
        if (!datos || !Array.isArray(datos.proximasCitas)) throw new Error('Respuesta incompleta.');
        SaludDatos.recuperar('inicio');
        for (const tarjeta of document.querySelectorAll('[data-indicador]')) {
            tarjeta.querySelector('h3').textContent = numeroReal(datos[tarjeta.dataset.indicador]);
        }
        for (const id of ['pacientesMes', 'citasAtendidasHoy', 'consultasAbiertas', 'expedientesActivos']) {
            document.getElementById(id).textContent = numeroReal(datos[id]);
        }
        renderizarProximasCitas(datos.proximasCitas, datos.citasPermitidas);
    } catch (error) {
        SaludDatos.fallo('inicio', error, {
            mensaje: 'No se pudo consultar el panel. Recarga la página para volver a intentar.',
            indicadores: ['[data-indicador] h3', '.summary strong']
        });
        document.getElementById('proximasCitas').textContent = 'No fue posible consultar la agenda.';
    }
}

function numeroReal(valor) {
    if (valor === null || valor === undefined) return 'Sin acceso';
    if (typeof valor !== 'number' || !Number.isFinite(valor)) throw new Error('Indicador inválido.');
    return valor.toLocaleString('es-GT');
}

function renderizarProximasCitas(citas, permitido) {
    const contenedor = document.getElementById('proximasCitas');
    contenedor.replaceChildren();
    if (!permitido || !citas.length) {
        contenedor.textContent = permitido ? 'Sin citas pendientes para el resto del día.' : 'Sin acceso a la agenda de citas.';
        return;
    }
    for (const cita of citas) {
        const fila = document.createElement('div');
        fila.className = 'appointment';
        const paciente = document.createElement('div');
        paciente.className = 'patient';
        const nombre = document.createElement('strong');
        nombre.textContent = cita.paciente;
        const detalle = document.createElement('small');
        detalle.textContent = cita.especialidad;
        const textos = document.createElement('div');
        textos.append(nombre, detalle);
        paciente.appendChild(textos);
        const hora = document.createElement('span');
        hora.textContent = cita.hora;
        fila.append(paciente, hora);
        contenedor.appendChild(fila);
    }
}

function actualizarHora() {
    const reloj = document.getElementById('horaActual');
    if (reloj) reloj.textContent = new Date().toLocaleTimeString('es-GT');
}
