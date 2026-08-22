let medicos = [

    {
        id: 1,
        nombre: "Carlos",
        apellido: "Ramírez",
        colegiado: "45821",
        especialidad: "Cardiología",
        telefono: "5555-1001",
        correo: "carlos@salud.com",
        horario: "08:00 AM - 02:00 PM",
        estado: "Activo"
    },

    {
        id: 2,
        nombre: "Ana",
        apellido: "Gómez",
        colegiado: "39215",
        especialidad: "Pediatría",
        telefono: "5555-1002",
        correo: "ana@salud.com",
        horario: "07:00 AM - 01:00 PM",
        estado: "Activo"
    },

    {
        id: 3,
        nombre: "Luis",
        apellido: "Morales",
        colegiado: "52147",
        especialidad: "Dermatología",
        telefono: "5555-1003",
        correo: "luis@salud.com",
        horario: "09:00 AM - 03:00 PM",
        estado: "Activo"
    },

    {
        id: 4,
        nombre: "Sofía",
        apellido: "Castillo",
        colegiado: "61324",
        especialidad: "Ginecología",
        telefono: "5555-1004",
        correo: "sofia@salud.com",
        horario: "02:00 PM - 08:00 PM",
        estado: "Activo"
    },

    {
        id: 5,
        nombre: "Jorge",
        apellido: "Méndez",
        colegiado: "48751",
        especialidad: "Traumatología",
        telefono: "5555-1005",
        correo: "jorge@salud.com",
        horario: "03:00 PM - 09:00 PM",
        estado: "Activo"
    },

    {
        id: 6,
        nombre: "Andrea",
        apellido: "López",
        colegiado: "70432",
        especialidad: "Neurología",
        telefono: "5555-1006",
        correo: "andrea@salud.com",
        horario: "09:00 AM - 03:00 PM",
        estado: "Inactivo"
    }

];


let medicoEditando = null;


/* =========================
   MOSTRAR MÉDICOS
========================= */

function renderizarMedicos(lista = medicos) {

    const tabla =
        document.getElementById("tablaMedicos");

    tabla.innerHTML = "";


    lista.forEach(function(medico) {

        const iniciales =
            medico.nombre.charAt(0) +
            medico.apellido.charAt(0);


        const fila =
            document.createElement("tr");


        fila.innerHTML = `

            <td>
                ${String(medico.id).padStart(3, "0")}
            </td>


            <td>

                <div class="doctor">

                    <div class="avatar">
                        ${iniciales.toUpperCase()}
                    </div>

                    <div>

                        <strong>
                            Dr. ${medico.nombre}
                            ${medico.apellido}
                        </strong>

                        <small>
                            Colegiado: ${medico.colegiado}
                        </small>

                    </div>

                </div>

            </td>


            <td>
                ${medico.especialidad}
            </td>


            <td>
                ${medico.telefono}
            </td>


            <td>
                ${medico.horario}
            </td>


            <td>

                <span class="status ${
                    medico.estado === "Activo"
                        ? "active-status"
                        : "inactive-status"
                }">

                    ${medico.estado}

                </span>

            </td>


            <td>

                <button
                    class="action edit"
                    onclick="editarMedico(${medico.id})"
                    title="Editar"
                >
                    ✏️
                </button>


                <button
                    class="action delete"
                    onclick="eliminarMedico(${medico.id})"
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

    document.getElementById("totalMedicos")
        .textContent = medicos.length;


    const activos =
        medicos.filter(
            medico => medico.estado === "Activo"
        ).length;


    document.getElementById("medicosActivos")
        .textContent = activos;


    const especialidades =
        new Set(
            medicos.map(
                medico => medico.especialidad
            )
        );


    document.getElementById("especialidades")
        .textContent = especialidades.size;


    document.querySelector(".total")
        .textContent =
        `${lista.length} médico${lista.length !== 1 ? "s" : ""}`;

}


/* =========================
   ABRIR FORMULARIO
========================= */

function abrirFormulario() {

    medicoEditando = null;

    document.getElementById(
        "tituloFormulario"
    ).textContent = "Nuevo médico";


    document.getElementById(
        "formMedico"
    ).reset();


    document.getElementById(
        "modalMedico"
    ).classList.add("show");

}


/* =========================
   CERRAR
========================= */

function cerrarFormulario() {

    document.getElementById(
        "modalMedico"
    ).classList.remove("show");


    medicoEditando = null;

}


/* =========================
   GUARDAR
========================= */

document.getElementById("formMedico")
    .addEventListener(
        "submit",
        function(event) {

            event.preventDefault();


            const nombre =
                document.getElementById(
                    "nombre"
                ).value.trim();


            const apellido =
                document.getElementById(
                    "apellido"
                ).value.trim();


            const colegiado =
                document.getElementById(
                    "colegiado"
                ).value.trim();


            const especialidad =
                document.getElementById(
                    "especialidad"
                ).value;


            const telefono =
                document.getElementById(
                    "telefono"
                ).value.trim();


            const correo =
                document.getElementById(
                    "correo"
                ).value.trim();


            const horario =
                document.getElementById(
                    "horario"
                ).value;


            const estado =
                document.getElementById(
                    "estado"
                ).value;


            /* EDITAR */

            if (medicoEditando !== null) {

                const medico =
                    medicos.find(
                        m => m.id === medicoEditando
                    );


                medico.nombre = nombre;

                medico.apellido = apellido;

                medico.colegiado = colegiado;

                medico.especialidad =
                    especialidad;

                medico.telefono =
                    telefono;

                medico.correo =
                    correo;

                medico.horario =
                    horario;

                medico.estado =
                    estado;


                alert(
                    "Médico actualizado correctamente."
                );

            }


            /* NUEVO */

            else {

                const nuevoMedico = {

                    id:
                        medicos.length > 0
                            ? Math.max(
                                ...medicos.map(
                                    m => m.id
                                )
                            ) + 1
                            : 1,

                    nombre:
                        nombre,

                    apellido:
                        apellido,

                    colegiado:
                        colegiado,

                    especialidad:
                        especialidad,

                    telefono:
                        telefono,

                    correo:
                        correo,

                    horario:
                        horario,

                    estado:
                        estado

                };


                medicos.push(
                    nuevoMedico
                );


                alert(
                    "Médico registrado correctamente."
                );

            }


            renderizarMedicos();

            cerrarFormulario();

        }
    );


/* =========================
   BUSCAR
========================= */

function buscarMedico() {

    const texto =
        document.getElementById(
            "buscarMedico"
        ).value
        .toLowerCase()
        .trim();


    const resultados =
        medicos.filter(function(medico) {

            const contenido = `

                ${medico.nombre}

                ${medico.apellido}

                ${medico.especialidad}

                ${medico.colegiado}

                ${medico.telefono}

            `.toLowerCase();


            return contenido.includes(
                texto
            );

        });


    renderizarMedicos(
        resultados
    );

}


/* =========================
   EDITAR
========================= */

function editarMedico(id) {

    const medico =
        medicos.find(
            m => m.id === id
        );


    if (!medico) return;


    medicoEditando = id;


    document.getElementById(
        "tituloFormulario"
    ).textContent = "Editar médico";


    document.getElementById("nombre").value =
        medico.nombre;


    document.getElementById("apellido").value =
        medico.apellido;


    document.getElementById("colegiado").value =
        medico.colegiado;


    document.getElementById("especialidad").value =
        medico.especialidad;


    document.getElementById("telefono").value =
        medico.telefono;


    document.getElementById("correo").value =
        medico.correo;


    document.getElementById("horario").value =
        medico.horario;


    document.getElementById("estado").value =
        medico.estado;


    document.getElementById(
        "modalMedico"
    ).classList.add("show");

}


/* =========================
   ELIMINAR
========================= */

function eliminarMedico(id) {

    const medico =
        medicos.find(
            m => m.id === id
        );


    if (!medico) return;


    const confirmar =
        confirm(
            `¿Deseas eliminar al Dr. ${medico.nombre} ${medico.apellido}?`
        );


    if (!confirmar) return;


    medicos =
        medicos.filter(
            m => m.id !== id
        );


    renderizarMedicos();


    alert(
        "Médico eliminado correctamente."
    );

}


/* =========================
   CERRAR AL HACER CLICK
   FUERA DEL MODAL
========================= */

document.getElementById(
    "modalMedico"
).addEventListener(
    "click",
    function(event) {

        if (event.target === this) {

            cerrarFormulario();

        }

    }
);


/* =========================
   CARGAR DATOS
========================= */

renderizarMedicos();