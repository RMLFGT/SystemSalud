let pacientes = [];
let pacienteEditando = null;

async function cargarPacientes() {
    try {
        const respuesta = await fetch("../BackEnd/Pacientes/listar.php");
        if (!respuesta.ok) throw new Error("Error HTTP: " + respuesta.status);

        const resultado = await respuesta.json();
        if (!resultado.correcto) throw new Error(resultado.mensaje);

        pacientes = resultado.datos.map(paciente => ({
            ...paciente,
            nombre: formatearTexto(paciente.nombre),
            apellido: formatearTexto(paciente.apellido),
            sexo: formatearTexto(paciente.sexo),
            estado: formatearTexto(paciente.estado),
            contactoEmergencia: formatearTexto(paciente.contactoEmergencia)
        }));

        renderizarPacientes();
    } catch (error) {
        console.error("Error al cargar pacientes:", error);
        alert("No fue posible cargar los pacientes desde Oracle.");
    }
}

function formatearTexto(texto) {
    if (!texto) return "";

    return texto
        .toLocaleLowerCase("es")
        .replace(/(^|\s)\S/g, letra => letra.toLocaleUpperCase("es"));
}

/* =========================
   FORMULARIO
========================= */

function abrirFormulario() {
    pacienteEditando = null;
    document.getElementById("tituloFormulario").textContent = "Nuevo paciente";
    document.getElementById("formPaciente").reset();
    document.getElementById("modalPaciente").classList.add("show");
    document.body.classList.add("modal-open");
    setTimeout(() => document.getElementById("nombre").focus(), 50);
}

function cerrarFormulario() {
    document.getElementById("modalPaciente").classList.remove("show");
    document.body.classList.remove("modal-open");
    pacienteEditando = null;
}

document.getElementById("formPaciente").addEventListener("submit", async event => {
    event.preventDefault();

    const datosPaciente = {
        id: pacienteEditando,
        nombre: document.getElementById("nombre").value.trim(),
        apellido: document.getElementById("apellido").value.trim(),
        dpi: document.getElementById("dpi").value.trim(),
        fechaNacimiento: document.getElementById("fechaNacimiento").value,
        sexo: document.getElementById("sexo").value,
        tipoSangre: document.getElementById("tipoSangre").value,
        telefono: document.getElementById("telefono").value.trim(),
        correo: document.getElementById("correo").value.trim(),
        direccion: document.getElementById("direccion").value.trim(),
        contactoEmergencia: document.getElementById("contactoEmergencia").value.trim(),
        telefonoEmergencia: document.getElementById("telefonoEmergencia").value.trim()
    };

    const esEdicion = pacienteEditando !== null;
    const url = esEdicion
        ? "../BackEnd/Pacientes/actualizar.php"
        : "../BackEnd/Pacientes/guardar.php";

    try {
        const respuesta = await fetch(url, {
            method: esEdicion ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datosPaciente)
        });

        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.correcto) {
            throw new Error(resultado.mensaje || "No fue posible guardar el paciente");
        }

        alert(resultado.mensaje);
        cerrarFormulario();
        await cargarPacientes();
    } catch (error) {
        console.error("Error al guardar paciente:", error);
        alert(error.message);
    }
});

/* =========================
   MOSTRAR PACIENTES
========================= */

function renderizarPacientes(lista = pacientes) {
    const tabla = document.getElementById("tablaPacientes");
    tabla.innerHTML = "";

    if (lista.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="8" class="empty-row">
                    No se encontraron pacientes con el criterio indicado.
                </td>
            </tr>
        `;
        actualizarTotal(0);
        return;
    }

    lista.forEach(paciente => {
        const iniciales = paciente.nombre.charAt(0) + paciente.apellido.charAt(0);
        const claseEstado = paciente.estado === "Activo"
            ? "active-status"
            : "inactive-status";

        const fila = document.createElement("tr");
        const esActivo = paciente.estado === "Activo";
        const botonEstado = esActivo
            ? `<button class="action delete" onclick="eliminarPaciente(${paciente.id})" title="Desactivar paciente" aria-label="Desactivar paciente"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg></button>`
            : `<button class="action reactivate" onclick="reactivarPaciente(${paciente.id})" title="Reactivar paciente" aria-label="Reactivar paciente"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8.1 8.1 0 1 0 2 5.3"/><path d="M20 4v7h-7"/><path d="m9 12 2 2 4-4"/></svg></button>`;
        fila.innerHTML = `
            <td>${String(paciente.id).padStart(3, "0")}</td>
            <td>
                <div class="patient">
                    <div class="avatar">${iniciales.toUpperCase()}</div>
                    <div>
                        <strong>${paciente.nombre} ${paciente.apellido}</strong>
                        <small>${paciente.correo || "Sin correo"}</small>
                    </div>
                </div>
            </td>
            <td>${paciente.dpi}</td>
            <td>${paciente.telefono || ""}</td>
            <td>${paciente.edad}</td>
            <td>${paciente.sexo}</td>
            <td><span class="status ${claseEstado}">${paciente.estado}</span></td>
            <td>
                <button class="action edit" onclick="editarPaciente(${paciente.id})" title="Editar paciente" aria-label="Editar paciente">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
                </button>
                ${botonEstado}
            </td>
        `;

        tabla.appendChild(fila);
    });

    actualizarTotal(lista.length);
}

function actualizarTotal(cantidad) {
    document.querySelector(".total").textContent =
        `${cantidad} paciente${cantidad !== 1 ? "s" : ""}`;
}

/* =========================
   BUSCAR
========================= */

function buscarPaciente() {
    const texto = document.getElementById("buscarPaciente").value.toLowerCase().trim();

    const resultados = pacientes.filter(paciente => {
        const contenido = `
            ${paciente.nombre} ${paciente.apellido}
            ${paciente.dpi} ${paciente.telefono} ${paciente.correo}
        `.toLowerCase();

        return contenido.includes(texto);
    });

    renderizarPacientes(resultados);
}

/* =========================
   EDITAR
========================= */

function editarPaciente(id) {
    const paciente = pacientes.find(p => p.id === id);
    if (!paciente) return;

    pacienteEditando = id;
    document.getElementById("tituloFormulario").textContent = "Editar paciente";
    document.getElementById("nombre").value = paciente.nombre;
    document.getElementById("apellido").value = paciente.apellido;
    document.getElementById("dpi").value = paciente.dpi;
    document.getElementById("fechaNacimiento").value = paciente.fechaNacimiento;
    document.getElementById("sexo").value = paciente.sexo;
    document.getElementById("tipoSangre").value = paciente.tipoSangre || "";
    document.getElementById("telefono").value = paciente.telefono || "";
    document.getElementById("correo").value = paciente.correo || "";
    document.getElementById("direccion").value = paciente.direccion || "";
    document.getElementById("contactoEmergencia").value = paciente.contactoEmergencia || "";
    document.getElementById("telefonoEmergencia").value = paciente.telefonoEmergencia || "";
    document.getElementById("modalPaciente").classList.add("show");
    document.body.classList.add("modal-open");
}

/* =========================
   ELIMINAR
========================= */

async function eliminarPaciente(id) {
    const paciente = pacientes.find(p => p.id === id);
    if (!paciente) return;
    if (paciente.estado === "Inactivo") return alert("El paciente ya está inactivo.");
    const confirmar = confirm(`¿Deseas desactivar a ${paciente.nombre} ${paciente.apellido}? Su historial médico se conservará.`);
    if (!confirmar) return;
    try {
        const respuesta = await fetch("../BackEnd/Pacientes/eliminar.php", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.correcto) throw new Error(resultado.mensaje || "No fue posible desactivar el paciente");
        alert(resultado.mensaje);
        await cargarPacientes();
    } catch (error) {
        console.error("Error al desactivar paciente:", error);
        alert(error.message);
    }
}

async function reactivarPaciente(id) {
    const paciente = pacientes.find(p => p.id === id);
    if (!paciente) return;
    const confirmar = confirm(`¿Deseas reactivar a ${paciente.nombre} ${paciente.apellido}?`);
    if (!confirmar) return;
    try {
        const respuesta = await fetch("../BackEnd/Pacientes/reactivar.php", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.correcto) throw new Error(resultado.mensaje || "No fue posible reactivar el paciente");
        alert(resultado.mensaje);
        await cargarPacientes();
    } catch (error) {
        console.error("Error al reactivar paciente:", error);
        alert(error.message);
    }
}

document.getElementById("modalPaciente").addEventListener("click", function(event) {
    if (event.target === this) cerrarFormulario();
});

document.getElementById("buscarPaciente").addEventListener("input", buscarPaciente);

document.addEventListener("keydown", event => {
    if (event.key === "Escape" &&
        document.getElementById("modalPaciente").classList.contains("show")) {
        cerrarFormulario();
    }
});

document.getElementById("cerrarSesion").addEventListener("click", event => {
    event.preventDefault();
    if (confirm("¿Seguro que deseas cerrar sesión?")) {
        window.location.href = "../login/login.html";
    }
});

cargarPacientes();

