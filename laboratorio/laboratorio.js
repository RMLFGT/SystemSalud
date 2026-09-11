let estudios = [];
let catalogos = { pacientes: [], medicos: [], tiposEstudio: [], consultas: [] };
let estudioEditando = null;

async function cargarEstudios() {
    try {
        const respuesta = await fetch("../BackEnd/Laboratorio/listar.php");
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.correcto) throw new Error(resultado.mensaje || "No fue posible cargar los estudios");
        estudios = resultado.datos;
        renderizarEstudios();
        actualizarEstadisticas(resultado.resumen);
    } catch (error) {
        console.error("Error al cargar estudios:", error);
        alert(error.message);
    }
}

async function cargarCatalogos() {
    try {
        const respuesta = await fetch("../BackEnd/Laboratorio/catalogos.php");
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.correcto) throw new Error(resultado.mensaje || "No fue posible cargar los catálogos");
        catalogos = resultado.datos;
        document.getElementById("paciente").innerHTML = `<option value="">Seleccionar paciente</option>` + catalogos.pacientes.map(item => `<option value="${item.id}">${formatearTexto(item.nombre)} - ${item.dpi}</option>`).join("");
        document.getElementById("medico").innerHTML = `<option value="">Seleccionar médico</option>` + catalogos.medicos.map(item => `<option value="${item.id}">${formatearTexto(item.nombre)} - ${formatearTexto(item.especialidad)}</option>`).join("");
        document.getElementById("estudio").innerHTML = `<option value="">Seleccionar estudio</option>` + catalogos.tiposEstudio.map(item => `<option value="${item.id}">${formatearTexto(item.nombre)}</option>`).join("");
        document.getElementById("consultaLaboratorio").innerHTML = `<option value="">Sin consulta asociada</option>` + catalogos.consultas.map(item => `<option value="${item.id}">CONS-${String(item.id).padStart(3, "0")} • ${formatearTexto(item.paciente)} • ${formatearFecha(item.fecha)}</option>`).join("");
    } catch (error) {
        console.error("Error al cargar catálogos:", error);
        alert(error.message);
    }
}

function formatearTexto(texto) {
    if (!texto) return "";
    return texto.toLocaleLowerCase("es").replace(/(^|\s)\S/g, letra => letra.toLocaleUpperCase("es"));
}

function formatearFecha(fecha) {
    if (!fecha) return "Sin fecha";
    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
}

function claseEstado(estado) {
    if (estado === "COMPLETADO") return "completed";
    if (estado === "EN_PROCESO") return "process";
    return "pending";
}

function renderizarEstudios(lista = estudios) {
    const tabla = document.getElementById("tablaLaboratorio");
    tabla.innerHTML = "";

    if (!lista.length) {
        tabla.innerHTML = `
            <tr class="empty-row">
                <td colspan="8">
                    <div class="empty-state">
                        <strong>No se encontraron estudios</strong>
                        <span>Prueba con otro paciente, estudio o estado.</span>
                    </div>
                </td>
            </tr>`;
    }

    lista.forEach(estudio => {
        const iniciales = estudio.paciente.split(" ").map(nombre => nombre.charAt(0)).slice(0, 2).join("");
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td>LAB-${String(estudio.id).padStart(3, "0")}</td>
            <td><div class="patient"><div class="avatar">${iniciales}</div><div><strong>${formatearTexto(estudio.paciente)}</strong><small>Paciente</small></div></div></td>
            <td><strong>${formatearTexto(estudio.estudio)}</strong></td>
            <td>${formatearFecha(estudio.fechaSolicitud)}</td>
            <td>${formatearTexto(estudio.medico)}</td>
            <td>${estudio.resultado ? "Disponible" : "Sin resultado"}</td>
            <td><span class="status ${claseEstado(estudio.estado)}">${formatearTexto(estudio.estado.replace("_", " "))}</span></td>
            <td><button class="action view" onclick="verResultado(${estudio.id})" title="Ver resultado" aria-label="Ver resultado"><svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button class="action edit" onclick="editarEstudio(${estudio.id})" title="Editar estudio" aria-label="Editar estudio"><svg viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"></path></svg></button></td>`;
        tabla.appendChild(fila);
    });
    document.getElementById("contador").textContent = `${lista.length} estudio${lista.length !== 1 ? "s" : ""}`;
}

function actualizarEstadisticas(resumen) {
    document.getElementById("totalEstudios").textContent = resumen.total;
    document.getElementById("pendientes").textContent = resumen.pendientes;
    document.getElementById("completados").textContent = resumen.completados;
    document.getElementById("estudiosMes").textContent = resumen.esteMes;
}

function buscarEstudio() {
    const texto = document.getElementById("buscarEstudio").value.toLowerCase().trim();
    renderizarEstudios(estudios.filter(estudio => `${estudio.paciente} ${estudio.estudio} ${estudio.medico} ${estudio.estado}`.toLowerCase().includes(texto)));
}

function verResultado(id) {
    const estudio = estudios.find(item => item.id === id);
    if (!estudio) return;
    document.getElementById("resultadoPaciente").textContent = `${formatearTexto(estudio.paciente)} • LAB-${String(estudio.id).padStart(3, "0")}`;
    document.getElementById("contenidoResultado").innerHTML = `
        <div class="result-header"><div><h3>${formatearTexto(estudio.estudio)}</h3><p>Solicitud: ${formatearFecha(estudio.fechaSolicitud)}</p>${estudio.fechaResultado ? `<p>Resultado: ${formatearFecha(estudio.fechaResultado)}</p>` : ""}</div><span class="status ${claseEstado(estudio.estado)}">${formatearTexto(estudio.estado.replace("_", " "))}</span></div>
        <div class="result-box"><h3>Resultado</h3><p>${estudio.resultado || "El resultado todavía no está disponible."}</p></div>
        <div class="result-box"><h3>Médico solicitante</h3><p>${formatearTexto(estudio.medico)}</p></div>
        <div class="result-box"><h3>Observaciones</h3><p>${estudio.observaciones || "Sin observaciones registradas."}</p></div>`;
    document.getElementById("modalResultado").classList.add("show");
    document.body.classList.add("modal-open");
}

function cerrarResultado() {
    document.getElementById("modalResultado").classList.remove("show");
    actualizarBloqueoPagina();
}

function abrirFormulario() {
    estudioEditando = null;
    document.getElementById("tituloFormulario").textContent = "Nuevo estudio";
    document.getElementById("formLaboratorio").reset();
    alternarCamposSolicitud(false);
    document.getElementById("resultado").disabled = true;
    document.getElementById("estado").value = "Pendiente";
    document.getElementById("estado").disabled = true;
    document.querySelector("#formLaboratorio .btn-primary[type='submit']").textContent = "Guardar estudio";
    document.getElementById("modalLaboratorio").classList.add("show");
    document.body.classList.add("modal-open");
    setTimeout(() => document.getElementById("consultaLaboratorio")?.focus(), 0);
}

function cerrarFormulario() {
    document.getElementById("modalLaboratorio").classList.remove("show");
    actualizarBloqueoPagina();
    alternarCamposSolicitud(false);
    document.getElementById("resultado").disabled = false;
    document.getElementById("estado").disabled = false;
    estudioEditando = null;
}

function alternarCamposSolicitud(bloquear) {
    ["consultaLaboratorio", "paciente", "estudio", "fecha", "medico"].forEach(id => {
        document.getElementById(id).disabled = bloquear;
    });
}

function actualizarCampoResultado() {
    const pendiente = document.getElementById("estado").value === "Pendiente";
    document.getElementById("resultado").disabled = pendiente;
    if (pendiente) document.getElementById("resultado").value = "";
}

function prepararConsulta() {
    if (document.getElementById("consultaLaboratorio")) return;
    const grupoPaciente = document.getElementById("paciente").closest(".form-group");
    const grupo = document.createElement("div");
    grupo.className = "form-group";
    grupo.innerHTML = `<label>Consulta asociada (opcional)</label><select id="consultaLaboratorio"><option value="">Sin consulta asociada</option></select>`;
    grupoPaciente.parentElement.insertBefore(grupo, grupoPaciente);
}

function seleccionarConsulta() {
    const consulta = catalogos.consultas.find(item => item.id === Number(document.getElementById("consultaLaboratorio").value));
    if (!consulta) return;
    document.getElementById("paciente").value = consulta.idPaciente;
    document.getElementById("medico").value = consulta.idMedico;
    document.getElementById("fecha").value = consulta.fecha;
}

async function guardarEstudio(event) {
    event.preventDefault();
    const esEdicion = estudioEditando !== null;
    const datos = esEdicion ? {
        id: estudioEditando,
        resultado: document.getElementById("resultado").value.trim(),
        estado: document.getElementById("estado").value.toUpperCase().replace(" ", "_"),
        observaciones: document.getElementById("observaciones").value.trim()
    } : {
        idPaciente: Number(document.getElementById("paciente").value),
        idMedico: Number(document.getElementById("medico").value),
        idTipoEstudio: Number(document.getElementById("estudio").value),
        idConsulta: Number(document.getElementById("consultaLaboratorio").value) || null,
        fechaSolicitud: document.getElementById("fecha").value,
        observaciones: document.getElementById("observaciones").value.trim()
    };
    try {
        const respuesta = await fetch(esEdicion ? "../BackEnd/Laboratorio/actualizar.php" : "../BackEnd/Laboratorio/guardar.php", {
            method: esEdicion ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.correcto) throw new Error(resultado.mensaje || "No fue posible registrar el estudio");
        alert(resultado.mensaje);
        cerrarFormulario();
        await Promise.all([cargarEstudios(), cargarCatalogos()]);
    } catch (error) {
        console.error("Error al guardar estudio:", error);
        alert(error.message);
    }
}

function editarEstudio(id) {
    const estudio = estudios.find(item => item.id === id);
    if (!estudio) return;
    estudioEditando = id;
    document.getElementById("tituloFormulario").textContent = "Editar estudio de laboratorio";
    document.getElementById("formLaboratorio").reset();
    document.getElementById("consultaLaboratorio").value = estudio.idConsulta || "";
    document.getElementById("paciente").value = estudio.idPaciente;
    document.getElementById("estudio").value = estudio.idTipoEstudio;
    document.getElementById("fecha").value = estudio.fechaSolicitud;
    document.getElementById("medico").value = estudio.idMedico;
    document.getElementById("resultado").value = estudio.resultado || "";
    const estadosFormulario = { PENDIENTE: "Pendiente", EN_PROCESO: "En proceso", COMPLETADO: "Completado" };
    document.getElementById("estado").value = estadosFormulario[estudio.estado];
    document.getElementById("observaciones").value = estudio.observaciones || "";
    alternarCamposSolicitud(true);
    document.getElementById("estado").disabled = false;
    actualizarCampoResultado();
    document.querySelector("#formLaboratorio .btn-primary[type='submit']").textContent = "Actualizar estudio";
    document.getElementById("modalLaboratorio").classList.add("show");
    document.body.classList.add("modal-open");
    setTimeout(() => document.getElementById("estado")?.focus(), 0);
}

function actualizarBloqueoPagina() {
    document.body.classList.toggle("modal-open", Boolean(document.querySelector(".modal.show")));
}

function imprimirResultado() {
    window.print();
}

document.getElementById("buscarEstudio").addEventListener("input", buscarEstudio);
document.getElementById("modalResultado").addEventListener("click", function(event) {
    if (event.target === this) cerrarResultado();
});

document.getElementById("modalLaboratorio").addEventListener("click", function(event) {
    if (event.target === this) cerrarFormulario();
});

document.getElementById("formLaboratorio").addEventListener("submit", guardarEstudio);
document.getElementById("estado").addEventListener("change", actualizarCampoResultado);
prepararConsulta();
document.getElementById("consultaLaboratorio").addEventListener("change", seleccionarConsulta);

document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (document.getElementById("modalLaboratorio").classList.contains("show")) {
        cerrarFormulario();
    } else if (document.getElementById("modalResultado").classList.contains("show")) {
        cerrarResultado();
    }
});


Promise.all([cargarEstudios(), cargarCatalogos()]);
