let medicos = [];
let medicoEditando = null;
let catalogos = { especialidades: [], clinicas: [] };

async function cargarMedicos() {
    try {
        const respuesta = await fetch("../BackEnd/Medicos/listar.php");
        if (!respuesta.ok) throw new Error("Error HTTP: " + respuesta.status);
        const resultado = await respuesta.json();
        if (!resultado.correcto) throw new Error(resultado.mensaje);
        medicos = resultado.datos.map(medico => ({
            ...medico,
            nombre: formatearTexto(medico.nombre),
            apellido: formatearTexto(medico.apellido),
            especialidad: formatearTexto(medico.especialidad),
            estado: formatearTexto(medico.estado),
            clinica: formatearTexto(medico.clinica),
            horario: formatearHorario(medico.horaInicio, medico.horaFin)
        }));
        renderizarMedicos();
    } catch (error) {
        console.error("Error al cargar médicos:", error);
        alert("No fue posible cargar los médicos desde Oracle.");
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

function formatearHorario(inicio, fin) {
    return inicio && fin ? `${hora12(inicio)} - ${hora12(fin)}` : "Sin horario";
}

function prepararCampoClinica() {
    if (document.getElementById("clinica")) return;
    const grupo = document.createElement("div");
    grupo.className = "form-group";
    grupo.innerHTML = `<label>Clínica</label><select id="clinica" required><option value="">Seleccionar</option></select>`;
    document.getElementById("horario").closest(".form-group").insertAdjacentElement("afterend", grupo);
}

async function cargarCatalogos() {
    try {
        const respuesta = await fetch("../BackEnd/Medicos/catalogos.php");
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.correcto) throw new Error(resultado.mensaje || "No fue posible cargar los catálogos");
        catalogos = resultado.datos;
        const especialidad = document.getElementById("especialidad");
        const clinica = document.getElementById("clinica");
        especialidad.innerHTML = `<option value="">Seleccionar</option>` + catalogos.especialidades.map(e => `<option value="${e.id}">${formatearTexto(e.nombre)}</option>`).join("");
        clinica.innerHTML = `<option value="">Seleccionar</option>` + catalogos.clinicas.map(c => `<option value="${c.id}">${formatearTexto(c.nombre)} · ${c.codigo}</option>`).join("");
    } catch (error) {
        console.error("Error al cargar catálogos:", error);
        alert(error.message);
    }
}

function renderizarMedicos(lista = medicos) {
    const tabla = document.getElementById("tablaMedicos");
    tabla.innerHTML = "";
    if (lista.length === 0) {
        tabla.innerHTML = `<tr><td colspan="7" class="empty-row">No se encontraron médicos con el criterio indicado.</td></tr>`;
        actualizarEstadisticas(lista);
        return;
    }
    lista.forEach(medico => {
        const iniciales = medico.nombre.charAt(0) + medico.apellido.charAt(0);
        const claseEstado = medico.estado === "Activo" ? "active-status" : "inactive-status";
        const botonEstado = medico.estado === "Activo"
            ? `<button class="action delete" onclick="cambiarEstadoMedico(${medico.id}, 'INACTIVO')" title="Desactivar médico" aria-label="Desactivar médico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg></button>`
            : `<button class="action reactivate" onclick="cambiarEstadoMedico(${medico.id}, 'ACTIVO')" title="Reactivar médico" aria-label="Reactivar médico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8.1 8.1 0 1 0 2 5.3"/><path d="M20 4v7h-7"/><path d="m9 12 2 2 4-4"/></svg></button>`;
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td>${String(medico.id).padStart(3, "0")}</td>
            <td><div class="doctor"><div class="avatar">${iniciales.toUpperCase()}</div><div><strong>Dr. ${medico.nombre} ${medico.apellido}</strong><small>Colegiado: ${medico.colegiado}</small></div></div></td>
            <td>${medico.especialidad}</td>
            <td>${medico.telefono || "Sin teléfono"}</td>
            <td title="${medico.dias} · ${medico.clinica}">${medico.horario}</td>
            <td><span class="status ${claseEstado}">${medico.estado}</span></td>
            <td>
                <button class="action edit" onclick="editarMedico(${medico.id})" title="Editar médico" aria-label="Editar médico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button>
                ${botonEstado}
            </td>`;
        tabla.appendChild(fila);
    });
    actualizarEstadisticas(lista);
}

function actualizarEstadisticas(lista) {
    document.getElementById("totalMedicos").textContent = medicos.length;
    document.getElementById("medicosActivos").textContent = medicos.filter(m => m.estado === "Activo").length;
    document.getElementById("especialidades").textContent = new Set(medicos.map(m => m.especialidad)).size;
    document.querySelector(".total").textContent = `${lista.length} médico${lista.length !== 1 ? "s" : ""}`;
}

function buscarMedico() {
    const texto = document.getElementById("buscarMedico").value.toLowerCase().trim();
    const resultados = medicos.filter(m => `${m.nombre} ${m.apellido} ${m.especialidad} ${m.colegiado} ${m.telefono} ${m.clinica}`.toLowerCase().includes(texto));
    renderizarMedicos(resultados);
}

function abrirFormulario() {
    medicoEditando = null;
    document.getElementById("tituloFormulario").textContent = "Nuevo médico";
    document.getElementById("formMedico").reset();
    document.getElementById("modalMedico").classList.add("show");
    document.body.classList.add("modal-open");
    setTimeout(() => document.getElementById("nombre").focus(), 50);
}

function cerrarFormulario() {
    document.getElementById("modalMedico").classList.remove("show");
    document.body.classList.remove("modal-open");
    medicoEditando = null;
}

function editarMedico(id) {
    const medico = medicos.find(m => m.id === id);
    if (!medico) return;
    medicoEditando = id;
    document.getElementById("tituloFormulario").textContent = "Editar médico";
    document.getElementById("nombre").value = medico.nombre;
    document.getElementById("apellido").value = medico.apellido;
    document.getElementById("colegiado").value = medico.colegiado;
    document.getElementById("especialidad").value = medico.idEspecialidad;
    document.getElementById("telefono").value = medico.telefono || "";
    document.getElementById("correo").value = medico.correo || "";
    document.getElementById("horario").value = medico.horario;
    document.getElementById("clinica").value = medico.idClinica || "";
    document.getElementById("estado").value = medico.estado;
    document.getElementById("modalMedico").classList.add("show");
    document.body.classList.add("modal-open");
}

function avisarSiguientePaso() {
    alert("Primero comprobaremos el listado. Después conectaremos esta acción con Oracle.");
}

async function cambiarEstadoMedico(id, estado) {
    const medico = medicos.find(m => m.id === id);
    if (!medico) return;
    const accion = estado === "ACTIVO" ? "reactivar" : "desactivar";
    if (!confirm(`¿Deseas ${accion} al Dr. ${medico.nombre} ${medico.apellido}?`)) return;
    try {
        const respuesta = await fetch("../BackEnd/Medicos/cambiar_estado.php", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, estado })
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.correcto) throw new Error(resultado.mensaje || `No fue posible ${accion} al médico`);
        alert(resultado.mensaje);
        await cargarMedicos();
    } catch (error) {
        console.error(`Error al ${accion} médico:`, error);
        alert(error.message);
    }
}

document.getElementById("formMedico").addEventListener("submit", async event => {
    event.preventDefault();
    const horario = document.getElementById("horario").value;
    const [horaInicio, horaFin] = horario.split(" - ");
    const datos = {
        nombre: document.getElementById("nombre").value.trim(),
        apellido: document.getElementById("apellido").value.trim(),
        colegiado: document.getElementById("colegiado").value.trim(),
        idEspecialidad: Number(document.getElementById("especialidad").value),
        telefono: document.getElementById("telefono").value.trim(),
        correo: document.getElementById("correo").value.trim(),
        idClinica: Number(document.getElementById("clinica").value),
        horaInicio,
        horaFin,
        estado: document.getElementById("estado").value,
        id: medicoEditando
    };
    try {
        const esEdicion = medicoEditando !== null;
        const respuesta = await fetch(esEdicion ? "../BackEnd/Medicos/actualizar.php" : "../BackEnd/Medicos/guardar.php", {
            method: esEdicion ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.correcto) throw new Error(resultado.mensaje || "No fue posible guardar el médico");
        alert(resultado.mensaje);
        cerrarFormulario();
        await cargarMedicos();
    } catch (error) {
        console.error("Error al guardar médico:", error);
        alert(error.message);
    }
});

document.getElementById("modalMedico").addEventListener("click", function(event) {
    if (event.target === this) cerrarFormulario();
});

document.getElementById("buscarMedico").addEventListener("input", buscarMedico);

document.addEventListener("keydown", event => {
    if (event.key === "Escape" &&
        document.getElementById("modalMedico").classList.contains("show")) {
        cerrarFormulario();
    }
});

document.getElementById("cerrarSesion").addEventListener("click", event => {
    event.preventDefault();
    if (confirm("¿Seguro que deseas cerrar sesión?")) {
        window.location.href = "../login/login.html";
    }
});

prepararCampoClinica();
Promise.all([cargarCatalogos(), cargarMedicos()]);
