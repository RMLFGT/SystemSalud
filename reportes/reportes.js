const API_REPORTES = "../BackEnd/Reportes";
let datosReporte = null;

document.addEventListener("DOMContentLoaded", () => {
    configurarFechasIniciales();
    document.getElementById("tipoReporte")
        .addEventListener("change", () => cargarReporte(false));
    cargarReporte(false);
});

function configurarFechasIniciales() {
    const inicio = document.getElementById("fechaInicio");
    const fin = document.getElementById("fechaFin");
    if (!inicio.value) inicio.value = `${new Date().getFullYear()}-01-01`;
    if (!fin.value) fin.value = new Date().toISOString().slice(0, 10);
}

async function solicitarJson(url) {
    const respuesta = await fetch(url, {cache: "no-store"});
    const texto = await respuesta.text();
    let contenido;
    try {
        contenido = JSON.parse(texto);
    } catch {
        throw new Error("El servidor no devolvió una respuesta JSON válida.");
    }
    if (!respuesta.ok || contenido.correcto === false) {
        throw new Error(contenido.mensaje || "No fue posible generar el reporte.");
    }
    return contenido;
}

async function generarReporte() {
    await cargarReporte(true);
}

async function cargarReporte(abrirVista = false) {
    const inicio = document.getElementById("fechaInicio").value;
    const fin = document.getElementById("fechaFin").value;
    const tipo = document.getElementById("tipoReporte").value;
    if (!inicio || !fin) return alert("Selecciona las fechas del reporte.");
    if (inicio > fin) return alert("La fecha inicial no puede ser mayor que la fecha final.");

    try {
        const parametros = new URLSearchParams({desde: inicio, hasta: fin, tipo});
        datosReporte = await solicitarJson(
            `${API_REPORTES}/resumen.php?${parametros.toString()}`
        );
        actualizarVista(tipo, datosReporte);
        if (abrirVista) abrirVistaPrevia();
    } catch (error) {
        console.error("Error al generar el reporte:", error);
        alert(error.message);
    }
}

function actualizarVista(tipo, datos) {
    const resumen = datos.resumen || {};
    const detalles = datos.detalles || {};
    const edades = datos.distribucionEdades || {};
    actualizarTarjetas(tipo, resumen, edades, detalles);
    actualizarGrafica(tipo, datos.actividadMensual || [], edades, detalles);
    actualizarDistribucion(tipo, edades, detalles);
    actualizarTabla(tipo, datos.resumenCitas || [], edades, detalles);
    actualizarIndicadoresInferiores(resumen);
}

function actualizarTarjetas(tipo, r, edades, detalles) {
    const citas = convertirEstados(detalles.estadosCitas);
    const lab = convertirEstados(detalles.estadosLaboratorio);
    const configuraciones = {
        general: [
            [r.pacientes, "Pacientes registrados", "Estado actual"],
            [r.medicosActivos, "Médicos activos", "Estado actual"],
            [r.citasPeriodo, "Citas registradas", "En el período seleccionado"],
            [r.estudiosPeriodo, "Estudios registrados", "En el período seleccionado"]
        ],
        pacientes: [
            [r.pacientes, "Pacientes registrados", "Estado actual"],
            [edades.ninos, "Niños", "Menores de 18 años"],
            [edades.jovenes, "Jóvenes", "De 18 a 29 años"],
            [Number(edades.adultos || 0) + Number(edades.adultosMayores || 0), "Adultos", "Desde 30 años"]
        ],
        citas: [
            [r.citasPeriodo, "Citas registradas", "Total del período"],
            [citas.CONFIRMADA, "Confirmadas", "En el período"],
            [citas.PENDIENTE, "Pendientes", "En el período"],
            [citas.CANCELADA, "Canceladas", "En el período"]
        ],
        laboratorio: [
            [r.estudiosPeriodo, "Estudios registrados", "Total del período"],
            [lab.COMPLETADO, "Completados", "Resultado disponible"],
            [lab.PENDIENTE, "Pendientes", "Sin completar"],
            [porcentaje(lab.COMPLETADO, r.estudiosPeriodo) + "%", "Cumplimiento", "En el período"]
        ],
        farmacia: [
            [r.medicamentosActivos, "Medicamentos activos", "Estado actual"],
            [r.unidadesDisponibles, "Unidades disponibles", "Inventario actual"],
            [r.stockBajo, "Stock bajo", "Requieren atención"],
            [`Q ${formatearDecimal(r.valorInventario)}`, "Valor del inventario", "Estado actual"]
        ]
    };

    document.querySelectorAll(".stats .stat-card").forEach((tarjeta, indice) => {
        const dato = configuraciones[tipo][indice];
        tarjeta.querySelector("strong").textContent =
            typeof dato[0] === "number" ? formatearNumero(dato[0]) : (dato[0] ?? 0);
        tarjeta.querySelector("span").textContent = dato[1];
        const detalle = tarjeta.querySelector("small");
        if (detalle) detalle.textContent = dato[2];
    });
}

function actualizarGrafica(tipo, actividad, edades, detalles) {
    let titulo = "Actividad mensual";
    let subtitulo = "Citas y estudios registrados";
    let elementos = actividad.map(x => ({
        etiqueta: nombreMes(x.periodo),
        valor: Number(x.citas || 0) + Number(x.estudios || 0),
        ayuda: `Citas: ${x.citas} | Estudios: ${x.estudios}`
    }));

    if (tipo === "citas") {
        subtitulo = "Citas registradas por mes";
        elementos = actividad.map(x => ({etiqueta: nombreMes(x.periodo), valor: Number(x.citas || 0)}));
    } else if (tipo === "laboratorio") {
        titulo = "Actividad de laboratorio";
        subtitulo = "Estudios registrados por mes";
        elementos = actividad.map(x => ({etiqueta: nombreMes(x.periodo), valor: Number(x.estudios || 0)}));
    } else if (tipo === "pacientes") {
        titulo = "Pacientes por edad";
        subtitulo = "Distribución actual de pacientes";
        elementos = [
            {etiqueta: "Niños", valor: Number(edades.ninos || 0)},
            {etiqueta: "Jóvenes", valor: Number(edades.jovenes || 0)},
            {etiqueta: "Adultos", valor: Number(edades.adultos || 0)},
            {etiqueta: "Mayores", valor: Number(edades.adultosMayores || 0)}
        ];
    } else if (tipo === "farmacia") {
        titulo = "Existencias por medicamento";
        subtitulo = "Medicamentos con mayor cantidad disponible";
        elementos = [...(detalles.inventario || [])]
            .filter(x => x.estado === "ACTIVO")
            .sort((a, b) => Number(b.stock) - Number(a.stock))
            .slice(0, 8)
            .map(x => ({etiqueta: formatearTexto(x.nombre), valor: Number(x.stock)}));
    }
    cambiarEncabezado(".chart-card:first-child", titulo, subtitulo);
    renderizarBarras(elementos);
}

function renderizarBarras(elementos) {
    const grafica = document.querySelector(".bar-chart");
    const insignia = document.querySelector(".chart-badge");
    const visibles = elementos.filter(x => x.valor > 0);
    grafica.innerHTML = "";
    if (!visibles.length) {
        grafica.innerHTML = '<p class="empty-report">No hay datos en este período.</p>';
        if (insignia) insignia.textContent = "Sin datos";
        return;
    }
    const maximo = Math.max(...visibles.map(x => x.valor), 1);
    visibles.forEach(x => {
        const grupo = document.createElement("div");
        grupo.className = "bar-group";
        grupo.innerHTML = `<div class="bar" style="height:${Math.max(x.valor / maximo * 100, 8)}%"
            title="${escaparHtml(x.ayuda || String(x.valor))}"><span>${formatearNumero(x.valor)}</span></div>
            <label>${escaparHtml(x.etiqueta)}</label>`;
        grafica.appendChild(grupo);
    });
    if (insignia) insignia.textContent = "Datos reales";
}

function actualizarDistribucion(tipo, edades, detalles) {
    let titulo = "Distribución de pacientes";
    let subtitulo = "Por grupo de edad";
    let etiquetas = ["Adultos", "Jóvenes", "Adultos mayores", "Niños"];
    let valores = [edades.adultos, edades.jovenes, edades.adultosMayores, edades.ninos];

    if (tipo === "citas") {
        titulo = "Estados de las citas";
        subtitulo = "En el período seleccionado";
        const estados = convertirEstados(detalles.estadosCitas);
        etiquetas = ["Confirmadas", "Pendientes", "Canceladas", "Otros"];
        valores = [estados.CONFIRMADA, estados.PENDIENTE, estados.CANCELADA, estados.OTROS];
    } else if (tipo === "laboratorio") {
        titulo = "Estados de laboratorio";
        subtitulo = "En el período seleccionado";
        const estados = convertirEstados(detalles.estadosLaboratorio);
        etiquetas = ["Completados", "Pendientes", "Otros", "Sin clasificar"];
        valores = [estados.COMPLETADO, estados.PENDIENTE, estados.OTROS, 0];
    } else if (tipo === "farmacia") {
        titulo = "Estado del inventario";
        subtitulo = "Medicamentos registrados";
        const inventario = detalles.inventario || [];
        etiquetas = ["Disponibles", "Stock bajo", "Inactivos", "Otros"];
        valores = [
            inventario.filter(x => x.estado === "ACTIVO" && Number(x.stock) > Number(x.stockMinimo)).length,
            inventario.filter(x => x.estado === "ACTIVO" && Number(x.stock) <= Number(x.stockMinimo)).length,
            inventario.filter(x => x.estado !== "ACTIVO").length,
            0
        ];
    }
    cambiarEncabezado(".chart-card:nth-child(2)", titulo, subtitulo);
    renderizarDona(etiquetas, valores);
}

function renderizarDona(etiquetas, valores) {
    valores = valores.map(x => Number(x || 0));
    const total = valores.reduce((s, x) => s + x, 0);
    const porcentajes = valores.map(x => total ? Math.round(x / total * 100) : 0);
    document.querySelector(".donut-center strong").textContent = formatearNumero(total);
    document.querySelectorAll(".legend > div").forEach((fila, i) => {
        const textos = fila.querySelectorAll("span");
        if (textos.length > 1) textos[1].textContent = etiquetas[i];
        fila.querySelector("strong").textContent = `${porcentajes[i]}%`;
    });
    const a = porcentajes[0], b = a + porcentajes[1], c = b + porcentajes[2];
    document.querySelector(".donut").style.background = total
        ? `conic-gradient(#0284c7 0% ${a}%,#22c55e ${a}% ${b}%,#f97316 ${b}% ${c}%,#8b5cf6 ${c}% 100%)`
        : "#e5e7eb";
}

function actualizarTabla(tipo, resumenCitas, edades, detalles) {
    const encabezado = document.querySelector("table thead tr");
    const cuerpo = document.getElementById("tablaReportes");
    let columnas, filas;

    if (tipo === "general" || tipo === "citas") {
        columnas = ["Fecha", "Médico", "Especialidad", "Citas", "Completadas", "Canceladas", "Cumplimiento"];
        filas = resumenCitas.map(x => [formatearFecha(x.ultimaFecha), formatearTexto(x.medico),
            formatearTexto(x.especialidad), x.citas, x.completadas, x.canceladas, `${x.cumplimiento}%`]);
    } else if (tipo === "pacientes") {
        columnas = ["Grupo de edad", "Rango", "Pacientes", "Porcentaje"];
        const total = Object.values(edades).reduce((s, x) => s + Number(x || 0), 0);
        filas = [["Niños", "Menores de 18", edades.ninos], ["Jóvenes", "18 a 29", edades.jovenes],
            ["Adultos", "30 a 59", edades.adultos], ["Adultos mayores", "60 o más", edades.adultosMayores]]
            .map(x => [...x, `${porcentaje(x[2], total)}%`]);
    } else if (tipo === "laboratorio") {
        columnas = ["Estado", "Cantidad", "Porcentaje"];
        const total = (detalles.estadosLaboratorio || []).reduce((s, x) => s + Number(x.cantidad), 0);
        filas = (detalles.estadosLaboratorio || [])
            .map(x => [formatearTexto(x.estado), x.cantidad, `${porcentaje(x.cantidad, total)}%`]);
    } else {
        columnas = ["Código", "Medicamento", "Stock", "Stock mínimo", "Precio", "Estado"];
        filas = (detalles.inventario || []).map(x => [
            `MED-${String(x.id).padStart(3, "0")}`, formatearTexto(x.nombre),
            x.stock, x.stockMinimo, `Q ${formatearDecimal(x.precio)}`, formatearTexto(x.estado)
        ]);
    }

    encabezado.innerHTML = columnas.map(x => `<th>${x}</th>`).join("");
    cuerpo.innerHTML = filas.length
        ? filas.map(f => `<tr>${f.map(x => `<td>${escaparHtml(String(x ?? ""))}</td>`).join("")}</tr>`).join("")
        : `<tr><td colspan="${columnas.length}" style="text-align:center;color:#64748b">No hay registros para este reporte.</td></tr>`;
}

function actualizarIndicadoresInferiores(r) {
    const datos = [["Unidades disponibles", r.unidadesDisponibles], ["Consultas finalizadas", r.consultasFinalizadas],
        ["Expedientes activos", r.expedientesActivos], ["Medicamentos activos", r.medicamentosActivos]];
    document.querySelectorAll(".summary-card").forEach((tarjeta, i) => {
        tarjeta.querySelector("span").textContent = datos[i][0];
        tarjeta.querySelector("strong").textContent = formatearNumero(datos[i][1]);
    });
}

function cambiarEncabezado(selector, titulo, subtitulo) {
    const tarjeta = document.querySelector(selector);
    if (!tarjeta) return;
    const h2 = tarjeta.querySelector("h2");
    const p = tarjeta.querySelector("p");
    if (h2) h2.textContent = titulo;
    if (p) p.textContent = subtitulo;
}

function convertirEstados(filas = []) {
    const salida = {OTROS: 0};
    filas.forEach(x => salida[String(x.estado || "OTROS").toUpperCase()] = Number(x.cantidad || 0));
    return salida;
}

function exportarReporte() {
    const tabla = document.getElementById("tablaReportes").closest("table");
    const lineas = Array.from(tabla.querySelectorAll("tr")).map(fila =>
        Array.from(fila.querySelectorAll("th,td"))
            .map(celda => `"${celda.innerText.trim().replaceAll('"', '""')}"`).join(",")
    );
    const archivo = new Blob(["\uFEFF" + lineas.join("\n")], {type: "text/csv;charset=utf-8"});
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = `reporte_${document.getElementById("tipoReporte").value}.csv`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
}

function abrirVistaPrevia() {
    if (!datosReporte) return;

    const tipo = document.getElementById("tipoReporte");
    const nombreTipo = tipo.options[tipo.selectedIndex].textContent.trim();
    const inicio = formatearFecha(document.getElementById("fechaInicio").value);
    const fin = formatearFecha(document.getElementById("fechaFin").value);
    const contenido = document.getElementById("contenidoVistaReporte");

    contenido.innerHTML = `
        <header class="print-report-header">
            <div>
                <h1>Salud<span>System</span></h1>
                <p>Sistema de gestión de salud</p>
            </div>
            <div class="print-report-meta">
                <strong>${escaparHtml(nombreTipo)}</strong>
                <span>Período: ${inicio} al ${fin}</span>
                <span>Generado: ${new Date().toLocaleString("es-GT")}</span>
            </div>
        </header>
        <section class="print-report-title">
            <h2>Reporte de ${escaparHtml(nombreTipo)}</h2>
            <p>Información consolidada del período seleccionado</p>
        </section>
        <section class="print-preview-stats">
            ${document.querySelector(".stats").innerHTML}
        </section>
        <section class="print-preview-charts">
            ${document.querySelector(".charts").innerHTML}
        </section>
        <section class="print-preview-table">
            <h2>${tipo.value === "farmacia" ? "Detalle del inventario" : "Detalle del reporte"}</h2>
            ${document.querySelector(".report-panel .table-container").outerHTML}
        </section>
        <footer class="print-report-footer">
            Reporte generado por SaludSystem
        </footer>
    `;

    document.getElementById("vistaReporte").classList.add("show");
    document.body.classList.add("modal-open");
}

function cerrarVistaReporte() {
    document.getElementById("vistaReporte").classList.remove("show");
    document.body.classList.remove("modal-open");
}

async function imprimirReporte() {
    const vista = document.getElementById("vistaReporte");
    if (!vista.classList.contains("show")) {
        await cargarReporte(true);
        return;
    }
    ejecutarImpresion();
}

function ejecutarImpresion() {
    document.body.classList.add("printing-report");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-report"), 500);
}
function porcentaje(valor, total) { return Number(total) ? Math.round(Number(valor || 0) / Number(total) * 100) : 0; }
function nombreMes(periodo) { const [a, m] = String(periodo).split("-"); return `${["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][Number(m)-1] || m} ${a.slice(-2)}`; }
function formatearFecha(fecha) { if (!fecha) return "Sin fecha"; const p = fecha.split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : fecha; }
function formatearNumero(valor) { return Number(valor || 0).toLocaleString("es-GT"); }
function formatearDecimal(valor) { return Number(valor || 0).toLocaleString("es-GT", {minimumFractionDigits: 2, maximumFractionDigits: 2}); }
function formatearTexto(texto) { return String(texto || "").toLocaleLowerCase("es").replace(/(^|[\s/-])\p{L}/gu, letra => letra.toLocaleUpperCase("es")); }
function escaparHtml(valor) { return String(valor).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
