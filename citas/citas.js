let citas = [];
let citaEditando = null;
let catalogos = { pacientes: [], medicos: [] };

async function cargarCitas() {
    try {
        const respuesta = await fetch("../BackEnd/Citas/listar.php");
        if (!respuesta.ok) throw new Error("Error HTTP: " + respuesta.status);
        const resultado = await respuesta.json();
        if (!resultado.correcto) throw new Error(resultado.mensaje);
        citas = resultado.datos.map(cita => ({
            ...cita,
            paciente: formatearTexto(cita.paciente),
            medico: formatearTexto(cita.medico),
            especialidad: formatearTexto(cita.especialidad),
            clinica: formatearTexto(cita.clinica),
            motivo: formatearTexto(cita.motivo),
            estado: formatearTexto(cita.estado),
            hora24: cita.hora,
            hora: hora12(cita.hora)
        }));
        renderizarCitas();
    } catch (error) {
        console.error("Error al cargar citas:", error);
        alert("No fue posible cargar las citas desde Oracle.");
    }
}

function formatearTexto(texto) {
    if (!texto) return "";
    return texto.toLocaleLowerCase("es").replace(/(^|\s)\S/g, letra => letra.toLocaleUpperCase("es"));
}

function hora12(hora) {
    if (!hora || !/^\d{2}:\d{2}$/.test(hora)) return hora || "";
    const [h, minutos] = hora.split(":").map(Number);
    return `${String(h % 12 || 12).padStart(2, "0")}:${String(minutos).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function formatearFecha(fecha) {
    if (!fecha) return "";
    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
}

function prepararFormulario() {
    const especialidad = document.getElementById("especialidad");
    especialidad.disabled = true;
    if (!document.getElementById("clinica")) {
        const grupo = document.createElement("div");
        grupo.className = "form-group";
        grupo.innerHTML = `<label>Clínica</label><input type="text" id="clinica" value="Seleccione médico y fecha" readonly>`;
        especialidad.closest(".form-group").insertAdjacentElement("afterend", grupo);
    }
    document.getElementById("medico").addEventListener("change", actualizarDisponibilidad);
    document.getElementById("fecha").addEventListener("change", actualizarDisponibilidad);
}

async function cargarCatalogos() {
    try {
        const respuesta = await fetch("../BackEnd/Citas/catalogos.php");
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.correcto) throw new Error(resultado.mensaje || "No fue posible cargar los catálogos");
        catalogos = resultado.datos;
        document.getElementById("paciente").innerHTML = `<option value="">Seleccionar paciente</option>` + catalogos.pacientes.map(p => `<option value="${p.id}">${formatearTexto(p.nombre)}</option>`).join("");
        document.getElementById("medico").innerHTML = `<option value="">Seleccionar médico</option>` + catalogos.medicos.map(m => `<option value="${m.id}" data-especialidad="${m.especialidad}">${formatearTexto(m.nombre)}</option>`).join("");
        document.getElementById("especialidad").innerHTML = `<option value="">Se completa automáticamente</option>`;
    } catch (error) {
        console.error("Error al cargar catálogos:", error);
        alert(error.message);
    }
}

async function actualizarDisponibilidad() {
    const idMedico = document.getElementById("medico").value;
    const fecha = document.getElementById("fecha").value;
    const hora = document.getElementById("hora");
    const clinica = document.getElementById("clinica");
    const opcionMedico = document.getElementById("medico").selectedOptions[0];
    document.getElementById("especialidad").innerHTML = `<option>${formatearTexto(opcionMedico?.dataset.especialidad || "Se completa automáticamente")}</option>`;
    hora.innerHTML = `<option value="">Seleccionar</option>`;
    clinica.value = "Seleccione médico y fecha";
    if (!idMedico || !fecha) return;
    try {
        const excluir = citaEditando !== null ? `&idCita=${citaEditando}` : "";
        const respuesta = await fetch(`../BackEnd/Citas/disponibilidad.php?idMedico=${idMedico}&fecha=${fecha}${excluir}`);
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.correcto) throw new Error(resultado.mensaje || "No fue posible consultar la disponibilidad");
        clinica.value = formatearTexto(resultado.datos.clinica);
        hora.innerHTML += resultado.datos.horas.map(h => `<option value="${h}">${hora12(h)}</option>`).join("");
        if (!resultado.datos.horas.length) hora.innerHTML = `<option value="">Sin horarios disponibles</option>`;
    } catch (error) {
        clinica.value = "Sin disponibilidad";
        console.error("Error de disponibilidad:", error);
        alert(error.message);
    }
}

function renderizarCitas(lista = citas) {
    const tabla = document.getElementById("tablaCitas");
    tabla.innerHTML = "";
    if (lista.length === 0) {
        tabla.innerHTML = `<tr><td colspan="8" class="empty-row">No se encontraron citas con los criterios indicados.</td></tr>`;
        actualizarEstadisticas(lista);
        return;
    }
    lista.forEach(cita => {
        const iniciales = cita.paciente.split(" ").map(n => n.charAt(0)).slice(0, 2).join("");
        const claseEstado = cita.estado === "Confirmada" ? "confirmed" : cita.estado === "Cancelada" ? "cancelled" : "pending";
        const botonEstado = cita.estado === "Cancelada"
            ? `<button class="action reactivate" onclick="cambiarEstadoCita(${cita.id}, 'PENDIENTE')" title="Reactivar cita" aria-label="Reactivar cita"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button>`
            : `<button class="action delete" onclick="cambiarEstadoCita(${cita.id}, 'CANCELADA')" title="Cancelar cita" aria-label="Cancelar cita"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg></button>`;
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td>${String(cita.id).padStart(3, "0")}</td>
            <td><div class="patient"><div class="avatar">${iniciales}</div><div><strong>${cita.paciente}</strong><small>${cita.motivo}</small></div></div></td>
            <td>${cita.medico}</td>
            <td title="${cita.clinica}">${cita.especialidad}</td>
            <td>${formatearFecha(cita.fecha)}</td>
            <td>${cita.hora}</td>
            <td><span class="status ${claseEstado}">${cita.estado}</span></td>
            <td>
                <button class="action edit" onclick="editarCita(${cita.id})" title="Editar cita" aria-label="Editar cita"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button>
                ${botonEstado}
            </td>`;
        tabla.appendChild(fila);
    });
    actualizarEstadisticas(lista);
}

function actualizarEstadisticas(lista) {
    document.getElementById("totalCitas").textContent = citas.length;
    document.getElementById("citasConfirmadas").textContent = citas.filter(c => c.estado === "Confirmada").length;
    document.getElementById("citasPendientes").textContent = citas.filter(c => c.estado === "Pendiente").length;
    document.getElementById("citasCanceladas").textContent = citas.filter(c => c.estado === "Cancelada").length;
    document.querySelector(".total").textContent = `${lista.length} cita${lista.length !== 1 ? "s" : ""}`;
}

function buscarCita() {
    const texto = document.getElementById("buscarCita").value.toLowerCase().trim();
    renderizarCitas(citas.filter(c => `${c.paciente} ${c.medico} ${c.especialidad} ${c.clinica} ${c.motivo}`.toLowerCase().includes(texto)));
}

function filtrarCitas() {
    const fecha = document.getElementById("filtroFecha").value;
    const estado = document.getElementById("filtroEstado").value;
    renderizarCitas(citas.filter(c => (!fecha || c.fecha === fecha) && (!estado || c.estado === estado)));
}

function limpiarFiltros() {
    document.getElementById("filtroFecha").value = "";
    document.getElementById("filtroEstado").value = "";
    document.getElementById("buscarCita").value = "";
    renderizarCitas();
}

function abrirFormulario() {
    citaEditando = null;
    document.getElementById("tituloFormulario").textContent = "Nueva cita";
    document.getElementById("formCita").reset();
    document.getElementById("modalCita").classList.add("show");
    document.body.classList.add("modal-open");
    setTimeout(() => document.getElementById("paciente").focus(), 50);
}

function cerrarFormulario() {
    document.getElementById("modalCita").classList.remove("show");
    document.body.classList.remove("modal-open");
    citaEditando = null;
}

async function editarCita(id) {
    const cita = citas.find(c => c.id === id);
    if (!cita) return;
    citaEditando = id;
    document.getElementById("tituloFormulario").textContent = "Editar cita";
    document.getElementById("paciente").value = cita.idPaciente;
    document.getElementById("medico").value = cita.idMedico;
    document.getElementById("motivo").value = cita.motivo;
    document.getElementById("fecha").value = cita.fecha;
    document.getElementById("estado").value = cita.estado;
    document.getElementById("notas").value = "";
    document.getElementById("modalCita").classList.add("show");
    document.body.classList.add("modal-open");
    await actualizarDisponibilidad();
    document.getElementById("hora").value = cita.hora24;
}

async function cambiarEstadoCita(id, estado) {
    const accion = estado === "CANCELADA" ? "cancelar" : "reactivar";
    if (!confirm(`¿Desea ${accion} esta cita?`)) return;
    try {
        const respuesta = await fetch("../BackEnd/Citas/cambiar_estado.php", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, estado })
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.correcto) throw new Error(resultado.mensaje || `No fue posible ${accion} la cita`);
        alert(resultado.mensaje);
        await cargarCitas();
    } catch (error) {
        console.error(`Error al ${accion} la cita:`, error);
        alert(error.message);
    }
}

document.getElementById("formCita").addEventListener("submit", event => {
    event.preventDefault();
    guardarCita();
});

async function guardarCita() {
    const datos = {
        idPaciente: Number(document.getElementById("paciente").value),
        idMedico: Number(document.getElementById("medico").value),
        fecha: document.getElementById("fecha").value,
        hora: document.getElementById("hora").value,
        motivo: document.getElementById("motivo").value.trim(),
        estado: document.getElementById("estado").value,
        id: citaEditando
    };
    try {
        const esEdicion = citaEditando !== null;
        const respuesta = await fetch(esEdicion ? "../BackEnd/Citas/actualizar.php" : "../BackEnd/Citas/guardar.php", {
            method: esEdicion ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.correcto) throw new Error(resultado.mensaje || "No fue posible guardar la cita");
        alert(resultado.mensaje);
        cerrarFormulario();
        await cargarCitas();
    } catch (error) {
        console.error("Error al guardar cita:", error);
        alert(error.message);
    }
}

document.getElementById("modalCita").addEventListener("click", function(event) {
    if (event.target === this) cerrarFormulario();
});

document.getElementById("buscarCita").addEventListener("input", buscarCita);

document.addEventListener("keydown", event => {
    if (event.key === "Escape" &&
        document.getElementById("modalCita").classList.contains("show")) {
        cerrarFormulario();
    }
});

document.getElementById("cerrarSesion").addEventListener("click", event => {
    event.preventDefault();
    if (confirm("¿Seguro que deseas cerrar sesión?")) {
        window.location.href = "../login/login.html";
    }
});

prepararFormulario();
Promise.all([cargarCatalogos(), cargarCitas()]);
