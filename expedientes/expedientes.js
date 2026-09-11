let expedientes = [];
let catalogos = { pacientes: [], medicos: [], tiposConsulta: [], citasConfirmadas: [] };
let consultaEditando = null;
let historialActual = null;

async function cargarExpedientes() {
    try {
        const respuesta = await fetch("../BackEnd/Expedientes/listar.php");
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.correcto) throw new Error(resultado.mensaje || "No fue posible cargar los expedientes");
        expedientes = resultado.datos.map(e => ({ ...e, paciente: formatearTexto(e.paciente), estado: formatearTexto(e.estado) }));
        renderizarExpedientes();
    } catch (error) {
        console.error("Error al cargar expedientes:", error);
        alert(error.message);
    }
}

async function cargarCatalogos() {
    try {
        const respuesta = await fetch("../BackEnd/Expedientes/catalogos.php");
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.correcto) throw new Error(resultado.mensaje || "No fue posible cargar los catálogos");
        catalogos = resultado.datos;
        document.getElementById("paciente").innerHTML = `<option value="">Seleccionar paciente</option>` + catalogos.pacientes.map(p => `<option value="${p.id}">${formatearTexto(p.nombre)} - ${p.dpi}</option>`).join("");
        document.getElementById("medico").innerHTML = `<option value="">Seleccionar médico</option>` + catalogos.medicos.map(m => `<option value="${m.id}">${formatearTexto(m.nombre)} - ${formatearTexto(m.especialidad)}</option>`).join("");
        document.getElementById("tipo").innerHTML = `<option value="">Seleccionar</option>` + catalogos.tiposConsulta.map(t => `<option value="${t.id}">${formatearTexto(t.nombre)}</option>`).join("");
        const cita = document.getElementById("cita");
        if (cita) cita.innerHTML = `<option value="">Consulta sin cita asociada</option>` + catalogos.citasConfirmadas.map(c => `<option value="${c.id}">CITA-${String(c.id).padStart(3, "0")} • ${formatearTexto(c.paciente)} • ${formatearFecha(c.fecha)} ${c.hora}</option>`).join("");
    } catch (error) {
        console.error("Error al cargar catálogos:", error);
        alert(error.message);
    }
}

async function cargarEstadisticas() {
    try {
        const respuesta = await fetch("../BackEnd/Expedientes/estadisticas.php");
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.correcto) throw new Error(resultado.mensaje || "No fue posible cargar las estadísticas");
        document.getElementById("tratamientosActivos").textContent = resultado.datos.tratamientosActivos;
        document.getElementById("estudiosRegistrados").textContent = resultado.datos.estudiosRegistrados;
    } catch (error) {
        console.error("Error al cargar estadísticas:", error);
        alert(error.message);
    }
}

function formatearTexto(texto) {
    if (!texto) return "";
    return texto.toLocaleLowerCase("es").replace(/(^|\s)\S/g, letra => letra.toLocaleUpperCase("es"));
}

function formatearFecha(fecha) {
    if (!fecha) return "Sin consultas";
    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
}

function renderizarExpedientes(lista = expedientes) {
    const tabla = document.getElementById("tablaExpedientes");
    tabla.innerHTML = "";

    if (!lista.length) {
        tabla.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">
                    <div class="empty-state">
                        <strong>No se encontraron expedientes</strong>
                        <span>Prueba con otro término de búsqueda.</span>
                    </div>
                </td>
            </tr>`;
    }

    lista.forEach(expediente => {
        const consulta = expediente.ultimaConsulta;
        const iniciales = expediente.paciente.split(" ").map(n => n.charAt(0)).slice(0, 2).join("");
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td>EXP-${String(expediente.id).padStart(3, "0")}</td>
            <td><div class="patient"><div class="avatar">${iniciales}</div><div><strong>${expediente.paciente}</strong><small>${expediente.totalConsultas} consulta${expediente.totalConsultas !== 1 ? "s" : ""}</small></div></div></td>
            <td>${formatearFecha(consulta?.fecha)}</td>
            <td>${formatearTexto(consulta?.diagnostico) || "Sin diagnóstico"}</td>
            <td>${formatearTexto(consulta?.medico) || "Sin médico asignado"}</td>
            <td><span class="status ${expediente.estado === "Activo" ? "active-status" : "closed-status"}">${expediente.estado}</span></td>
            <td><button class="action view" onclick="verExpediente(${expediente.id})" title="Ver expediente" aria-label="Ver expediente"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button><button class="action ${expediente.estado === "Activo" ? "close-record" : "reopen-record"}" onclick="cambiarEstadoExpediente(${expediente.id}, '${expediente.estado === "Activo" ? "CERRADO" : "ACTIVO"}')" title="${expediente.estado === "Activo" ? "Cerrar expediente" : "Reabrir expediente"}" aria-label="${expediente.estado === "Activo" ? "Cerrar expediente" : "Reabrir expediente"}">${expediente.estado === "Activo" ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>'}</button></td>`;
        tabla.appendChild(fila);
    });
    document.getElementById("totalExpedientes").textContent = expedientes.length;
    document.getElementById("consultasMes").textContent = expedientes.reduce((total, e) => total + e.consultasMes, 0);
    document.querySelector(".total").textContent = `${lista.length} expediente${lista.length !== 1 ? "s" : ""}`;
}

function buscarExpediente() {
    const texto = document.getElementById("buscarExpediente").value.toLowerCase().trim();
    renderizarExpedientes(expedientes.filter(e => `${e.paciente} ${e.dpi} ${e.ultimaConsulta?.diagnostico || ""} ${e.ultimaConsulta?.medico || ""}`.toLowerCase().includes(texto)));
}

async function verExpediente(id) {
    try {
        const respuesta = await fetch(`../BackEnd/Expedientes/historial.php?id=${id}`);
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.correcto) throw new Error(resultado.mensaje || "No fue posible cargar el historial");
        const expediente = resultado.datos;
        historialActual = expediente;
        document.getElementById("detallePaciente").textContent = `${formatearTexto(expediente.paciente)} • EXP-${String(expediente.id).padStart(3, "0")}`;
        const consultas = expediente.consultas.length ? expediente.consultas.map((consulta, indice) => `
            <section class="consulta-historial">
                <div class="consulta-encabezado"><h3>Consulta ${expediente.consultas.length - indice}</h3><div class="consulta-estado-acciones"><span class="status ${consulta.estado === "FINALIZADA" ? "active-status" : "open-status"}">${formatearTexto(consulta.estado)}</span>${expediente.estado === "ACTIVO" ? `<button class="action edit" onclick="editarConsulta(${consulta.id})" title="Editar consulta" aria-label="Editar consulta"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button>` : ""}</div></div>
                <div class="detail-grid">
                    <div class="detail-box"><h3>Información</h3><p><strong>Fecha:</strong> ${formatearFecha(consulta.fecha)} ${consulta.hora}</p><p><strong>Tipo:</strong> ${formatearTexto(consulta.tipo)}</p><p><strong>Médico:</strong> ${formatearTexto(consulta.medico)}</p>${consulta.idCita ? `<p><strong>Cita:</strong> CITA-${String(consulta.idCita).padStart(3, "0")}</p>` : ""}</div>
                    <div class="detail-box"><h3>Signos vitales</h3><p><strong>Presión:</strong> ${consulta.presion || "No registrada"}</p><p><strong>Frecuencia:</strong> ${consulta.frecuencia ?? "No registrada"} BPM</p><p><strong>Temperatura:</strong> ${consulta.temperatura ?? "No registrada"} °C</p><p><strong>Peso:</strong> ${consulta.peso ?? "No registrado"} kg</p></div>
                    <div class="detail-box"><h3>Diagnóstico</h3><p>${formatearTexto(consulta.diagnostico)}</p></div>
                    <div class="detail-box"><h3>Síntomas</h3><p>${consulta.sintomas || "Sin información registrada."}</p></div>
                    <div class="detail-box"><h3>Tratamiento</h3><p>${consulta.tratamiento || "Sin tratamiento registrado."}</p></div>
                    <div class="detail-box"><h3>Observaciones</h3><p>${consulta.observaciones || "Sin observaciones."}</p></div>
                </div>
            </section>`).join("") : `<div class="detail-box"><h3>Historial clínico</h3><p>Este paciente todavía no tiene consultas médicas registradas.</p></div>`;
        document.getElementById("contenidoDetalle").innerHTML = `
            <div class="detail-grid resumen-expediente">
                <div class="detail-box"><h3>Paciente</h3><p><strong>DPI:</strong> ${expediente.dpi}</p><p><strong>Edad:</strong> ${expediente.edad} años</p><p><strong>Sexo:</strong> ${formatearTexto(expediente.sexo)}</p><p><strong>Contacto:</strong> ${expediente.telefono || "No registrado"}</p></div>
                <div class="detail-box"><h3>Expediente</h3><p><strong>Apertura:</strong> ${formatearFecha(expediente.fechaApertura)}</p><p><strong>Estado:</strong> ${formatearTexto(expediente.estado)}</p><p><strong>Total de consultas:</strong> ${expediente.consultas.length}</p><p>${expediente.observacionesGenerales || "Sin observaciones generales."}</p></div>
            </div>${consultas}`;
        document.getElementById("modalDetalle").classList.add("show");
        document.body.classList.add("modal-open");
    } catch (error) {
        console.error("Error al cargar historial:", error);
        alert(error.message);
    }
}

function cerrarDetalle() {
    document.getElementById("modalDetalle").classList.remove("show");
    actualizarBloqueoPagina();
}

async function cambiarEstadoExpediente(id, estado) {
    const accion = estado === "CERRADO" ? "cerrar" : "reabrir";
    if (!confirm(`¿Deseas ${accion} este expediente?`)) return;
    try {
        const respuesta = await fetch("../BackEnd/Expedientes/estado.php", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, estado })
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.correcto) throw new Error(resultado.mensaje || "No fue posible cambiar el estado del expediente");
        alert(resultado.mensaje);
        await cargarExpedientes();
    } catch (error) {
        console.error("Error al cambiar el estado del expediente:", error);
        alert(error.message);
    }
}

function abrirFormulario() {
    consultaEditando = null;
    document.getElementById("tituloFormulario").textContent = "Nueva consulta médica";
    document.getElementById("formExpediente").reset();
    document.getElementById("paciente").disabled = false;
    document.getElementById("medico").disabled = false;
    if (document.getElementById("cita")) document.getElementById("cita").disabled = false;
    document.getElementById("estadoConsulta").value = "FINALIZADA";
    document.querySelector("#formExpediente .modal-footer .btn-primary").textContent = "Guardar consulta";
    document.getElementById("modalExpediente").classList.add("show");
    document.body.classList.add("modal-open");
    setTimeout(() => document.getElementById("cita")?.focus(), 0);
}

function cerrarFormulario() {
    document.getElementById("modalExpediente").classList.remove("show");
    actualizarBloqueoPagina();
    document.getElementById("paciente").disabled = false;
    document.getElementById("medico").disabled = false;
    if (document.getElementById("cita")) document.getElementById("cita").disabled = false;
    consultaEditando = null;
}

function prepararEstadoConsulta() {
    if (document.getElementById("estadoConsulta")) return;
    const grupo = document.createElement("div");
    grupo.className = "form-group";
    grupo.innerHTML = `<label>Estado de la consulta</label><select id="estadoConsulta"><option value="ABIERTA">Abierta</option><option value="FINALIZADA" selected>Finalizada</option></select>`;
    document.getElementById("tipo").closest(".form-group").insertAdjacentElement("afterend", grupo);
}

function editarConsulta(id) {
    const consulta = historialActual?.consultas.find(c => c.id === id);
    if (!consulta) return;
    consultaEditando = id;
    cerrarDetalle();
    document.getElementById("tituloFormulario").textContent = "Editar consulta médica";
    document.getElementById("formExpediente").reset();
    document.getElementById("paciente").value = historialActual.idPaciente;
    document.getElementById("paciente").disabled = true;
    document.getElementById("medico").value = consulta.idMedico;
    document.getElementById("medico").disabled = consulta.idCita !== null;
    const cita = document.getElementById("cita");
    if (cita) {
        if (consulta.idCita && ![...cita.options].some(opcion => Number(opcion.value) === consulta.idCita)) cita.add(new Option(`CITA-${String(consulta.idCita).padStart(3, "0")} • Asociada`, consulta.idCita));
        cita.value = consulta.idCita || "";
        cita.disabled = true;
    }
    document.getElementById("fecha").value = consulta.fecha;
    document.getElementById("tipo").value = consulta.idTipoConsulta;
    document.getElementById("diagnostico").value = consulta.diagnostico || "";
    document.getElementById("sintomas").value = consulta.sintomas || "";
    document.getElementById("tratamiento").value = consulta.tratamiento || "";
    document.getElementById("observaciones").value = consulta.observaciones || "";
    document.getElementById("presion").value = consulta.presion || "";
    document.getElementById("frecuencia").value = consulta.frecuencia ?? "";
    document.getElementById("temperatura").value = consulta.temperatura ?? "";
    document.getElementById("peso").value = consulta.peso ?? "";
    document.getElementById("estadoConsulta").value = consulta.estado;
    document.querySelector("#formExpediente .modal-footer .btn-primary").textContent = "Actualizar consulta";
    document.getElementById("modalExpediente").classList.add("show");
    document.body.classList.add("modal-open");
    setTimeout(() => document.getElementById("fecha")?.focus(), 0);
}

function actualizarBloqueoPagina() {
    const hayModalAbierto = document.querySelector(".modal.show");
    document.body.classList.toggle("modal-open", Boolean(hayModalAbierto));
}

function seleccionarCita() {
    const id = Number(document.getElementById("cita")?.value);
    const cita = catalogos.citasConfirmadas.find(c => c.id === id);
    if (!cita) return;
    document.getElementById("paciente").value = cita.idPaciente;
    document.getElementById("medico").value = cita.idMedico;
    document.getElementById("fecha").value = cita.fecha;
}

async function guardarConsulta() {
    const datos = {
        idPaciente: Number(document.getElementById("paciente").value),
        idMedico: Number(document.getElementById("medico").value),
        idTipoConsulta: Number(document.getElementById("tipo").value),
        idCita: Number(document.getElementById("cita")?.value) || null,
        fecha: document.getElementById("fecha").value,
        diagnostico: document.getElementById("diagnostico").value.trim(),
        sintomas: document.getElementById("sintomas").value.trim(),
        tratamiento: document.getElementById("tratamiento").value.trim(),
        observaciones: document.getElementById("observaciones").value.trim(),
        presion: document.getElementById("presion").value.trim(),
        frecuencia: document.getElementById("frecuencia").value,
        temperatura: document.getElementById("temperatura").value,
        peso: document.getElementById("peso").value,
        estado: document.getElementById("estadoConsulta").value,
        id: consultaEditando
    };
    try {
        const esEdicion = consultaEditando !== null;
        const respuesta = await fetch(esEdicion ? "../BackEnd/Expedientes/actualizar.php" : "../BackEnd/Expedientes/guardar.php", {
            method: esEdicion ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.correcto) throw new Error(resultado.mensaje || "No fue posible guardar la consulta");
        alert(resultado.mensaje);
        cerrarFormulario();
        await Promise.all([cargarExpedientes(), cargarCatalogos(), cargarEstadisticas()]);
    } catch (error) {
        console.error("Error al guardar consulta:", error);
        alert(error.message);
    }
}

document.getElementById("modalDetalle").addEventListener("click", function(event) {
    if (event.target === this) cerrarDetalle();
});

document.getElementById("modalExpediente").addEventListener("click", function(event) {
    if (event.target === this) cerrarFormulario();
});

document.getElementById("formExpediente").addEventListener("submit", function(event) {
    event.preventDefault();
    guardarConsulta();
});

document.getElementById("cita")?.addEventListener("change", seleccionarCita);
document.getElementById("buscarExpediente")?.addEventListener("input", buscarExpediente);

document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (document.getElementById("modalExpediente").classList.contains("show")) {
        cerrarFormulario();
    } else if (document.getElementById("modalDetalle").classList.contains("show")) {
        cerrarDetalle();
    }
});

document.getElementById("cerrarSesion")?.addEventListener("click", event => {
    event.preventDefault();
    if (confirm("¿Seguro que deseas cerrar sesión?")) {
        window.location.href = "../login/login.html";
    }
});

prepararEstadoConsulta();
Promise.all([cargarExpedientes(), cargarCatalogos(), cargarEstadisticas()]);
