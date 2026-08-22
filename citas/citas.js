let citas = [

    {
        id: 1,
        paciente: "Juan Pérez",
        medico: "Dr. Carlos Ramírez",
        especialidad: "Cardiología",
        fecha: "2026-08-21",
        hora: "08:00 AM",
        motivo: "Control cardíaco",
        estado: "Confirmada",
        notas: ""
    },

    {
        id: 2,
        paciente: "María González",
        medico: "Dra. Ana Gómez",
        especialidad: "Pediatría",
        fecha: "2026-08-21",
        hora: "09:00 AM",
        motivo: "Consulta general",
        estado: "Pendiente",
        notas: ""
    },

    {
        id: 3,
        paciente: "Carlos Ramírez",
        medico: "Dr. Luis Morales",
        especialidad: "Dermatología",
        fecha: "2026-08-21",
        hora: "10:00 AM",
        motivo: "Revisión de piel",
        estado: "Confirmada",
        notas: ""
    },

    {
        id: 4,
        paciente: "Laura Sánchez",
        medico: "Dra. Sofía Castillo",
        especialidad: "Ginecología",
        fecha: "2026-08-22",
        hora: "02:00 PM",
        motivo: "Consulta",
        estado: "Pendiente",
        notas: ""
    },

    {
        id: 5,
        paciente: "Ana López",
        medico: "Dr. Jorge Méndez",
        especialidad: "Traumatología",
        fecha: "2026-08-22",
        hora: "03:00 PM",
        motivo: "Dolor muscular",
        estado: "Confirmada",
        notas: ""
    },

    {
        id: 6,
        paciente: "Pedro García",
        medico: "Dra. Andrea López",
        especialidad: "Neurología",
        fecha: "2026-08-23",
        hora: "09:00 AM",
        motivo: "Dolor de cabeza",
        estado: "Pendiente",
        notas: ""
    },

    {
        id: 7,
        paciente: "Sofía Morales",
        medico: "Dr. Carlos Ramírez",
        especialidad: "Cardiología",
        fecha: "2026-08-23",
        hora: "11:00 AM",
        motivo: "Seguimiento",
        estado: "Cancelada",
        notas: ""
    },

    {
        id: 8,
        paciente: "José Castillo",
        medico: "Dra. Ana Gómez",
        especialidad: "Pediatría",
        fecha: "2026-08-24",
        hora: "01:00 PM",
        motivo: "Consulta",
        estado: "Confirmada",
        notas: ""
    }

];


let citaEditando = null;


/* =========================
   MOSTRAR CITAS
========================= */

function renderizarCitas(lista = citas) {

    const tabla =
        document.getElementById("tablaCitas");

    tabla.innerHTML = "";


    lista.forEach(function(cita) {

        const iniciales =
            cita.paciente
                .split(" ")
                .map(nombre => nombre.charAt(0))
                .slice(0, 2)
                .join("");


        let claseEstado = "pending";


        if (cita.estado === "Confirmada") {
            claseEstado = "confirmed";
        }


        if (cita.estado === "Cancelada") {
            claseEstado = "cancelled";
        }


        const fila =
            document.createElement("tr");


        fila.innerHTML = `

            <td>
                ${String(cita.id).padStart(3, "0")}
            </td>


            <td>

                <div class="patient">

                    <div class="avatar">
                        ${iniciales}
                    </div>

                    <div>

                        <strong>
                            ${cita.paciente}
                        </strong>

                        <small>
                            ${cita.motivo}
                        </small>

                    </div>

                </div>

            </td>


            <td>
                ${cita.medico}
            </td>


            <td>
                ${cita.especialidad}
            </td>


            <td>
                ${formatearFecha(cita.fecha)}
            </td>


            <td>
                ${cita.hora}
            </td>


            <td>

                <span class="status ${claseEstado}">
                    ${cita.estado}
                </span>

            </td>


            <td>

                <button
                    class="action edit"
                    onclick="editarCita(${cita.id})"
                    title="Editar"
                >
                    ✏️
                </button>


                <button
                    class="action delete"
                    onclick="eliminarCita(${cita.id})"
                    title="Eliminar"
                >
                    🗑️
                </button>

            </td>

        `;


        tabla.appendChild(fila);

    });


    actualizarEstadisticas(lista);

}


/* =========================
   ESTADÍSTICAS
========================= */

function actualizarEstadisticas(lista) {

    document.getElementById("totalCitas")
        .textContent = citas.length;


    document.getElementById("citasConfirmadas")
        .textContent =
        citas.filter(
            c => c.estado === "Confirmada"
        ).length;


    document.getElementById("citasPendientes")
        .textContent =
        citas.filter(
            c => c.estado === "Pendiente"
        ).length;


    document.getElementById("citasCanceladas")
        .textContent =
        citas.filter(
            c => c.estado === "Cancelada"
        ).length;


    document.querySelector(".total")
        .textContent =
        `${lista.length} cita${lista.length !== 1 ? "s" : ""}`;

}


/* =========================
   FORMULARIO
========================= */

function abrirFormulario() {

    citaEditando = null;


    document.getElementById(
        "tituloFormulario"
    ).textContent = "Nueva cita";


    document.getElementById(
        "formCita"
    ).reset();


    document.getElementById(
        "modalCita"
    ).classList.add("show");

}


function cerrarFormulario() {

    document.getElementById(
        "modalCita"
    ).classList.remove("show");


    citaEditando = null;

}


/* =========================
   GUARDAR
========================= */

document.getElementById("formCita")
    .addEventListener(
        "submit",
        function(event) {

            event.preventDefault();


            const paciente =
                document.getElementById(
                    "paciente"
                ).value;


            const medico =
                document.getElementById(
                    "medico"
                ).value;


            const especialidad =
                document.getElementById(
                    "especialidad"
                ).value;


            const motivo =
                document.getElementById(
                    "motivo"
                ).value.trim();


            const fecha =
                document.getElementById(
                    "fecha"
                ).value;


            const hora =
                document.getElementById(
                    "hora"
                ).value;


            const estado =
                document.getElementById(
                    "estado"
                ).value;


            const notas =
                document.getElementById(
                    "notas"
                ).value.trim();


            /* EDITAR */

            if (citaEditando !== null) {

                const cita =
                    citas.find(
                        c => c.id === citaEditando
                    );


                cita.paciente = paciente;

                cita.medico = medico;

                cita.especialidad =
                    especialidad;

                cita.motivo = motivo;

                cita.fecha = fecha;

                cita.hora = hora;

                cita.estado = estado;

                cita.notas = notas;


                alert(
                    "Cita actualizada correctamente."
                );

            }


            /* NUEVA */

            else {

                const nuevaCita = {

                    id:
                        citas.length > 0
                            ? Math.max(
                                ...citas.map(
                                    c => c.id
                                )
                            ) + 1
                            : 1,

                    paciente:
                        paciente,

                    medico:
                        medico,

                    especialidad:
                        especialidad,

                    motivo:
                        motivo,

                    fecha:
                        fecha,

                    hora:
                        hora,

                    estado:
                        estado,

                    notas:
                        notas

                };


                citas.push(
                    nuevaCita
                );


                alert(
                    "Cita registrada correctamente."
                );

            }


            renderizarCitas();

            cerrarFormulario();

        }
    );


/* =========================
   BUSCAR
========================= */

function buscarCita() {

    const texto =
        document.getElementById(
            "buscarCita"
        ).value
        .toLowerCase()
        .trim();


    const resultados =
        citas.filter(function(cita) {

            const contenido = `

                ${cita.paciente}

                ${cita.medico}

                ${cita.especialidad}

                ${cita.motivo}

            `.toLowerCase();


            return contenido.includes(
                texto
            );

        });


    renderizarCitas(
        resultados
    );

}


/* =========================
   FILTROS
========================= */

function filtrarCitas() {

    const fecha =
        document.getElementById(
            "filtroFecha"
        ).value;


    const estado =
        document.getElementById(
            "filtroEstado"
        ).value;


    const resultados =
        citas.filter(function(cita) {

            const coincideFecha =
                !fecha ||
                cita.fecha === fecha;


            const coincideEstado =
                !estado ||
                cita.estado === estado;


            return (
                coincideFecha &&
                coincideEstado
            );

        });


    renderizarCitas(
        resultados
    );

}


/* =========================
   LIMPIAR FILTROS
========================= */

function limpiarFiltros() {

    document.getElementById(
        "filtroFecha"
    ).value = "";


    document.getElementById(
        "filtroEstado"
    ).value = "";


    document.getElementById(
        "buscarCita"
    ).value = "";


    renderizarCitas();

}


/* =========================
   EDITAR
========================= */

function editarCita(id) {

    const cita =
        citas.find(
            c => c.id === id
        );


    if (!cita) return;


    citaEditando = id;


    document.getElementById(
        "tituloFormulario"
    ).textContent =
        "Editar cita";


    document.getElementById(
        "paciente"
    ).value =
        cita.paciente;


    document.getElementById(
        "medico"
    ).value =
        cita.medico;


    document.getElementById(
        "especialidad"
    ).value =
        cita.especialidad;


    document.getElementById(
        "motivo"
    ).value =
        cita.motivo;


    document.getElementById(
        "fecha"
    ).value =
        cita.fecha;


    document.getElementById(
        "hora"
    ).value =
        cita.hora;


    document.getElementById(
        "estado"
    ).value =
        cita.estado;


    document.getElementById(
        "notas"
    ).value =
        cita.notas;


    document.getElementById(
        "modalCita"
    ).classList.add("show");

}


/* =========================
   ELIMINAR
========================= */

function eliminarCita(id) {

    const cita =
        citas.find(
            c => c.id === id
        );


    if (!cita) return;


    const confirmar =
        confirm(
            `¿Deseas eliminar la cita de ${cita.paciente}?`
        );


    if (!confirmar) return;


    citas =
        citas.filter(
            c => c.id !== id
        );


    renderizarCitas();


    alert(
        "Cita eliminada correctamente."
    );

}


/* =========================
   FORMATEAR FECHA
========================= */

function formatearFecha(fecha) {

    if (!fecha) return "";


    const partes =
        fecha.split("-");


    return `${partes[2]}/${partes[1]}/${partes[0]}`;

}


/* =========================
   CERRAR AL HACER CLICK
   FUERA DEL MODAL
========================= */

document.getElementById(
    "modalCita"
).addEventListener(
    "click",
    function(event) {

        if (event.target === this) {

            cerrarFormulario();

        }

    }
);


/* =========================
   CARGAR
========================= */

renderizarCitas();