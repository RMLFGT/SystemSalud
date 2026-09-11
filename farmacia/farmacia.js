const API_FARMACIA = "../BackEnd/Farmacia";

let medicamentos = [];
let categorias = [];
let medicamentoEditando = null;
let mostrandoInactivos = false;

document.addEventListener("DOMContentLoaded", iniciarFarmacia);

async function iniciarFarmacia() {
    crearBotonInactivos();
    document
        .getElementById("formFarmacia")
        .addEventListener("submit", guardarMedicamento);

    document
        .getElementById("modalFarmacia")
        .addEventListener("click", cerrarModalDesdeFondo);

    document
        .getElementById("buscarMedicamento")
        .addEventListener("input", buscarMedicamento);

    await Promise.all([
        cargarCategorias(),
        cargarMedicamentos()
    ]);
}

async function solicitarJson(url, opciones = {}) {
    const respuesta = await fetch(url, opciones);
    const texto = await respuesta.text();

    let contenido;

    try {
        contenido = JSON.parse(texto);
    } catch {
        throw new Error(
            "El servidor no devolvió una respuesta JSON válida."
        );
    }

    if (!respuesta.ok || contenido.correcto === false) {
        throw new Error(
            contenido.mensaje || "No fue posible completar la solicitud."
        );
    }

    return contenido;
}

async function cargarMedicamentos() {
    try {
        const respuesta = await solicitarJson(
            `${API_FARMACIA}/listar.php?estado=${mostrandoInactivos ? "INACTIVO" : "ACTIVO"}`
        );

        medicamentos = Array.isArray(respuesta.datos)
            ? respuesta.datos
            : [];

        renderizarMedicamentos(medicamentos);
        if (!mostrandoInactivos) actualizarEstadisticas(respuesta.resumen || {});
    } catch (error) {
        medicamentos = [];
        renderizarMedicamentos([]);
        actualizarEstadisticas({});
        alert(error.message);
    }
}

async function cargarCategorias() {
    try {
        const respuesta = await solicitarJson(
            `${API_FARMACIA}/catalogos.php`
        );

        categorias = Array.isArray(respuesta.categorias)
            ? respuesta.categorias
            : [];

        const selector = document.getElementById("categoria");

        selector.innerHTML =
            '<option value="">Seleccionar categoría</option>';

        categorias.forEach(categoria => {
            const opcion = document.createElement("option");
            opcion.value = String(categoria.id);
            opcion.textContent = formatearTexto(categoria.nombre);
            selector.appendChild(opcion);
        });
    } catch (error) {
        categorias = [];
        alert(error.message);
    }
}

function renderizarMedicamentos(lista) {
    const tabla = document.getElementById("tablaFarmacia");
    tabla.innerHTML = "";

    if (lista.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center; color:#64748b;">
                    No se encontraron medicamentos.
                </td>
            </tr>
        `;

        return;
    }

    lista.forEach(medicamento => {
        const presentacionEstado = obtenerEstadoStock(
            medicamento.disponibilidad
        );

        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>MED-${String(medicamento.id).padStart(3, "0")}</td>
            <td>
                <div class="medicine">
                    <div class="medicine-icon" aria-hidden="true">
                        <svg width="22" height="22" viewBox="0 0 24 24"
                             fill="none" stroke="currentColor"
                             stroke-width="2" stroke-linecap="round"
                             stroke-linejoin="round">
                            <path d="m10.5 20.5 10-10a4.95 4.95 0 0 0-7-7l-10 10a4.95 4.95 0 0 0 7 7Z"/>
                            <path d="m8.5 8.5 7 7"/>
                        </svg>
                    </div>
                    <div>
                        <strong>${escaparHtml(formatearTexto(medicamento.nombre))}</strong>
                        <small>${escaparHtml(formatearTexto(medicamento.laboratorio) || "Sin laboratorio")}</small>
                    </div>
                </div>
            </td>
            <td>${escaparHtml(formatearTexto(medicamento.categoria))}</td>
            <td>${escaparHtml(formatearTexto(medicamento.presentacion))}</td>
            <td>
                <span class="stock ${presentacionEstado.claseStock}">
                    ${Number(medicamento.stock).toLocaleString("es-GT")}
                </span>
            </td>
            <td>${formatearMoneda(medicamento.precio)}</td>
            <td>${formatearFecha(medicamento.fechaVencimiento)}</td>
            <td>
                <span class="status ${presentacionEstado.claseEstado}">
                    ${presentacionEstado.texto}
                </span>
            </td>
            <td>
                ${medicamento.estado === "INACTIVO" ? `
                <button class="action view" type="button"
                    onclick="reactivarMedicamento(${medicamento.id})"
                    title="Reactivar medicamento" aria-label="Reactivar medicamento">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/>
                    </svg>
                </button>` : `
                <button
                    class="action edit"
                    type="button"
                    onclick="editarMedicamento(${medicamento.id})"
                    title="Editar medicamento"
                    aria-label="Editar medicamento"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor"
                         stroke-width="2" stroke-linecap="round"
                         stroke-linejoin="round">
                        <path d="M12 20h9"/>
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                    </svg>
                </button>
                <button
                    class="action delete"
                    type="button"
                    onclick="desactivarMedicamento(${medicamento.id})"
                    title="Desactivar medicamento"
                    aria-label="Desactivar medicamento"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor"
                         stroke-width="2" stroke-linecap="round"
                         stroke-linejoin="round">
                        <path d="M3 6h18"/>
                        <path d="M8 6V4h8v2"/>
                        <path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v5"/>
                        <path d="M14 11v5"/>
                    </svg>
                </button>
                `}
            </td>
        `;

        tabla.appendChild(fila);
    });
}

function crearBotonInactivos() {
    const nuevo = document.querySelector(".actions > .btn-primary");
    if (!nuevo || document.getElementById("btnInactivos")) return;
    const boton = document.createElement("button");
    boton.id = "btnInactivos";
    boton.type = "button";
    boton.className = "btn-cancel";
    boton.textContent = "Ver inactivos";
    boton.addEventListener("click", alternarInactivos);
    nuevo.before(boton);
}

async function alternarInactivos() {
    mostrandoInactivos = !mostrandoInactivos;
    document.getElementById("btnInactivos").textContent =
        mostrandoInactivos ? "Ver activos" : "Ver inactivos";
    await cargarMedicamentos();
}

async function reactivarMedicamento(id) {
    if (!confirm("¿Deseas reactivar este medicamento?")) return;
    try {
        const respuesta = await solicitarJson(`${API_FARMACIA}/reactivar.php`, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({id})
        });
        alert(respuesta.mensaje);
        mostrandoInactivos = false;
        document.getElementById("btnInactivos").textContent = "Ver inactivos";
        await cargarMedicamentos();
    } catch (error) {
        alert(error.message);
    }
}

function actualizarEstadisticas(resumen) {
    document.getElementById("totalMedicamentos").textContent =
        Number(resumen.total || 0).toLocaleString("es-GT");

    document.getElementById("stockTotal").textContent =
        Number(resumen.stockTotal || 0).toLocaleString("es-GT");

    document.getElementById("stockBajo").textContent =
        Number(resumen.stockBajo || 0).toLocaleString("es-GT");

    document.getElementById("valorInventario").textContent =
        formatearMoneda(resumen.valorInventario || 0);

    const total = Number(resumen.total || 0);

    document.getElementById("contador").textContent =
        `${total} ${total === 1 ? "medicamento" : "medicamentos"}`;
}

function abrirFormulario() {
    medicamentoEditando = null;
    const formulario = document.getElementById("formFarmacia");
    formulario.reset();

    document.getElementById("tituloFormulario").textContent =
        "Nuevo medicamento";

    document.getElementById("stockMinimo").value = "20";
    document.getElementById("modalFarmacia").classList.add("show");
    document.getElementById("nombre").focus();
}

function cerrarFormulario() {
    document.getElementById("modalFarmacia").classList.remove("show");
    document.getElementById("formFarmacia").reset();
    medicamentoEditando = null;
}

function cerrarModalDesdeFondo(evento) {
    if (evento.target === evento.currentTarget) {
        cerrarFormulario();
    }
}

async function guardarMedicamento(evento) {
    evento.preventDefault();

    const boton = evento.submitter ||
        document.querySelector("#formFarmacia button[type='submit']");

    const datos = {
        id: medicamentoEditando,
        idCategoria: Number(
            document.getElementById("categoria").value
        ),
        nombre: document.getElementById("nombre").value.trim(),
        presentacion: document
            .getElementById("presentacion")
            .value
            .trim(),
        laboratorio: document
            .getElementById("laboratorio")
            .value
            .trim(),
        stock: Number(document.getElementById("stock").value),
        stockMinimo: Number(
            document.getElementById("stockMinimo").value
        ),
        precio: Number(document.getElementById("precio").value),
        fechaVencimiento: document.getElementById("vencimiento").value,
        descripcion: document
            .getElementById("descripcion")
            .value
            .trim()
    };

    if (
        !datos.idCategoria ||
        !datos.nombre ||
        !datos.presentacion ||
        !datos.fechaVencimiento
    ) {
        alert("Complete todos los campos obligatorios.");
        return;
    }

    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = "Guardando...";

    try {
        const editando = medicamentoEditando !== null;
        const respuesta = await solicitarJson(
            `${API_FARMACIA}/${editando ? "actualizar.php" : "guardar.php"}`,
            {
                method: editando ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(datos)
            }
        );

        alert(respuesta.mensaje);
        cerrarFormulario();

        await cargarMedicamentos();
    } catch (error) {
        alert(error.message);
    } finally {
        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
}

function editarMedicamento(id) {
    const medicamento = medicamentos.find(
        elemento => Number(elemento.id) === Number(id)
    );

    if (!medicamento) {
        alert("No se encontró el medicamento seleccionado.");
        return;
    }

    medicamentoEditando = medicamento.id;

    document.getElementById("tituloFormulario").textContent =
        "Editar medicamento";
    document.getElementById("nombre").value = medicamento.nombre;
    document.getElementById("categoria").value =
        String(medicamento.idCategoria);
    document.getElementById("presentacion").value =
        medicamento.presentacion;
    document.getElementById("laboratorio").value =
        medicamento.laboratorio;
    document.getElementById("stock").value = medicamento.stock;
    document.getElementById("stockMinimo").value =
        medicamento.stockMinimo;
    document.getElementById("precio").value = medicamento.precio;
    document.getElementById("vencimiento").value =
        medicamento.fechaVencimiento;
    document.getElementById("descripcion").value =
        medicamento.descripcion;

    document.getElementById("modalFarmacia").classList.add("show");
    document.getElementById("nombre").focus();
}

async function desactivarMedicamento(id) {
    const medicamento = medicamentos.find(
        elemento => Number(elemento.id) === Number(id)
    );

    if (!medicamento) {
        alert("No se encontró el medicamento seleccionado.");
        return;
    }

    const confirmado = confirm(
        `¿Deseas desactivar "${formatearTexto(medicamento.nombre)}"?\n\n` +
        "El registro permanecerá en Oracle, pero dejará de aparecer " +
        "en el inventario activo."
    );

    if (!confirmado) {
        return;
    }

    try {
        const respuesta = await solicitarJson(
            `${API_FARMACIA}/desactivar.php`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ id: medicamento.id })
            }
        );

        alert(respuesta.mensaje);
        await cargarMedicamentos();
    } catch (error) {
        alert(error.message);
    }
}

function buscarMedicamento() {
    const texto = document
        .getElementById("buscarMedicamento")
        .value
        .trim()
        .toLocaleLowerCase("es");

    if (!texto) {
        renderizarMedicamentos(medicamentos);
        return;
    }

    const resultados = medicamentos.filter(medicamento => {
        const contenido = [
            medicamento.nombre,
            medicamento.categoria,
            medicamento.presentacion,
            medicamento.laboratorio
        ]
            .join(" ")
            .toLocaleLowerCase("es");

        return contenido.includes(texto);
    });

    renderizarMedicamentos(resultados);
}

function obtenerEstadoStock(disponibilidad) {
    if (disponibilidad === "AGOTADO") {
        return {
            texto: "Agotado",
            claseEstado: "out",
            claseStock: "stock-low"
        };
    }

    if (disponibilidad === "STOCK_BAJO") {
        return {
            texto: "Stock bajo",
            claseEstado: "low",
            claseStock: "stock-low"
        };
    }

    return {
        texto: "Disponible",
        claseEstado: "available",
        claseStock: "stock-normal"
    };
}

function formatearFecha(fecha) {
    if (!fecha) {
        return "Sin fecha";
    }

    const partes = fecha.split("-");

    if (partes.length !== 3) {
        return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatearMoneda(valor) {
    return new Intl.NumberFormat("es-GT", {
        style: "currency",
        currency: "GTQ",
        minimumFractionDigits: 2
    }).format(Number(valor || 0));
}

function formatearTexto(texto) {
    return String(texto || "")
        .toLocaleLowerCase("es")
        .replace(/(^|[\s/-])\p{L}/gu, letra => letra.toLocaleUpperCase("es"));
}

function escaparHtml(valor) {
    return String(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
