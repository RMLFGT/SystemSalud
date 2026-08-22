let estudios = [

    {
        id: 1,
        paciente: "Juan Pérez",
        estudio: "Hemograma",
        fecha: "2026-08-20",
        medico: "Dr. Carlos Ramírez",
        resultado: "Hemoglobina: 14.2 g/dL. Valores dentro del rango normal.",
        estado: "Completado",
        observaciones: "Sin alteraciones significativas."
    },

    {
        id: 2,
        paciente: "María González",
        estudio: "Glucosa",
        fecha: "2026-08-19",
        medico: "Dra. Ana Gómez",
        resultado: "Glucosa en ayunas: 92 mg/dL.",
        estado: "Completado",
        observaciones: "Resultado normal."
    },

    {
        id: 3,
        paciente: "Carlos Ramírez",
        estudio: "Perfil lipídico",
        fecha: "2026-08-18",
        medico: "Dr. Luis Morales",
        resultado: "",
        estado: "Pendiente",
        observaciones: ""
    },

    {
        id: 4,
        paciente: "Laura Sánchez",
        estudio: "Examen de orina",
        fecha: "2026-08-17",
        medico: "Dra. Sofía Castillo",
        resultado: "Sin presencia de proteínas ni glucosa.",
        estado: "Completado",
        observaciones: "Resultado dentro de parámetros normales."
    },

    {
        id: 5,
        paciente: "Ana López",
        estudio: "Pruebas hepáticas",
        fecha: "2026-08-16",
        medico: "Dr. Carlos Ramírez",
        resultado: "",
        estado: "En proceso",
        observaciones: "Muestra en análisis."
    },

    {
        id: 6,
        paciente: "Pedro García",
        estudio: "Química sanguínea",
        fecha: "2026-08-15",
        medico: "Dra. Ana Gómez",
        resultado: "",
        estado: "Pendiente",
        observaciones: ""
    },

    {
        id: 7,
        paciente: "Sofía Morales",
        estudio: "Prueba de embarazo",
        fecha: "2026-08-14",
        medico: "Dra. Sofía Castillo",
        resultado: "Resultado negativo.",
        estado: "Completado",
        observaciones: "Resultado confirmado."
    },

    {
        id: 8,
        paciente: "Diego Hernández",
        estudio: "Hemograma",
        fecha: "2026-08-12",
        medico: "Dr. Luis Morales",
        resultado: "",
        estado: "Pendiente",
        observaciones: ""
    }

];


let estudioEditando = null;


/* =========================
   MOSTRAR ESTUDIOS
========================= */

function renderizarEstudios(lista = estudios) {

    const tabla =
        document.getElementById("tablaLaboratorio");

    tabla.innerHTML = "";


    lista.forEach(estudio => {

        const iniciales =
            estudio.paciente
                .split(" ")
                .map(nombre => nombre.charAt(0))
                .slice(0, 2)
                .join("");


        let claseEstado = "pending";

        if (estudio.estado === "En proceso") {
            claseEstado = "process";
        }

        if (estudio.estado === "Completado") {
            claseEstado = "completed";
        }


        const resultado =
            estudio.resultado
                ? "Disponible"
                : "Sin resultado";


        const fila =
            document.createElement("tr");


        fila.innerHTML = `

            <td>
                LAB-${String(estudio.id).padStart(3, "0")}
            </td>


            <td>

                <div class="patient">

                    <div class="avatar">
                        ${iniciales}
                    </div>

                    <div>

                        <strong>
                            ${estudio.paciente}
                        </strong>

                        <small>
                            Paciente
                        </small>

                    </div>

                </div>

            </td>


            <td>
                <strong>
                    ${estudio.estudio}
                </strong>
            </td>


            <td>
                ${formatearFecha(estudio.fecha)}
            </td>


            <td>
                ${estudio.medico}
            </td>


            <td>
                ${resultado}
            </td>


            <td>

                <span class="status ${claseEstado}">
                    ${estudio.estado}
                </span>

            </td>


            <td>

                <button
                    class="action view"
                    onclick="verResultado(${estudio.id})"
                    title="Ver resultado"
                >
                    👁️
                </button>


                <button
                    class="action edit"
                    onclick="editarEstudio(${estudio.id})"
                    title="Editar"
                >
                    ✏️
                </button>


                <button
                    class="action delete"
                    onclick="eliminarEstudio(${estudio.id})"
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

function actualizarEstadisticas() {

    document.getElementById(
        "totalEstudios"
    ).textContent =
        estudios.length;


    document.getElementById(
        "pendientes"
    ).textContent =
        estudios.filter(
            e => e.estado === "Pendiente"
        ).length;


    document.getElementById(
        "completados"
    ).textContent =
        estudios.filter(
            e => e.estado === "Completado"
        ).length;


    document.getElementById(
        "contador"
    ).textContent =
        `${estudios.length} estudios`;

}


/* =========================
   NUEVO ESTUDIO
========================= */

function abrirFormulario() {

    estudioEditando = null;


    document.getElementById(
        "tituloFormulario"
    ).textContent =
        "Nuevo estudio";


    document.getElementById(
        "formLaboratorio"
    ).reset();


    document.getElementById(
        "modalLaboratorio"
    ).classList.add("show");

}


function cerrarFormulario() {

    document.getElementById(
        "modalLaboratorio"
    ).classList.remove("show");


    estudioEditando = null;

}


/* =========================
   GUARDAR
========================= */

document.getElementById(
    "formLaboratorio"
).addEventListener(
    "submit",
    function(event) {

        event.preventDefault();


        const datos = {

            paciente:
                document.getElementById(
                    "paciente"
                ).value,

            estudio:
                document.getElementById(
                    "estudio"
                ).value,

            fecha:
                document.getElementById(
                    "fecha"
                ).value,

            medico:
                document.getElementById(
                    "medico"
                ).value,

            resultado:
                document.getElementById(
                    "resultado"
                ).value,

            estado:
                document.getElementById(
                    "estado"
                ).value,

            observaciones:
                document.getElementById(
                    "observaciones"
                ).value

        };


        if (estudioEditando !== null) {

            const estudio =
                estudios.find(
                    e => e.id === estudioEditando
                );


            Object.assign(
                estudio,
                datos
            );


            alert(
                "Estudio actualizado correctamente."
            );

        } else {

            datos.id =
                estudios.length > 0
                    ? Math.max(
                        ...estudios.map(
                            e => e.id
                        )
                    ) + 1
                    : 1;


            estudios.push(datos);


            alert(
                "Estudio registrado correctamente."
            );

        }


        renderizarEstudios();

        cerrarFormulario();

    }
);


/* =========================
   EDITAR
========================= */

function editarEstudio(id) {

    const estudio =
        estudios.find(
            e => e.id === id
        );


    if (!estudio) return;


    estudioEditando = id;


    document.getElementById(
        "tituloFormulario"
    ).textContent =
        "Editar estudio";


    document.getElementById(
        "paciente"
    ).value =
        estudio.paciente;


    document.getElementById(
        "estudio"
    ).value =
        estudio.estudio;


    document.getElementById(
        "fecha"
    ).value =
        estudio.fecha;


    document.getElementById(
        "medico"
    ).value =
        estudio.medico;


    document.getElementById(
        "resultado"
    ).value =
        estudio.resultado;


    document.getElementById(
        "estado"
    ).value =
        estudio.estado;


    document.getElementById(
        "observaciones"
    ).value =
        estudio.observaciones;


    document.getElementById(
        "modalLaboratorio"
    ).classList.add("show");

}


/* =========================
   VER RESULTADO
========================= */

function verResultado(id) {

    const estudio =
        estudios.find(
            e => e.id === id
        );


    if (!estudio) return;


    document.getElementById(
        "resultadoPaciente"
    ).textContent =
        `${estudio.paciente} • LAB-${String(estudio.id).padStart(3, "0")}`;


    document.getElementById(
        "contenidoResultado"
    ).innerHTML = `

        <div class="result-header">

            <div>

                <h3>
                    ${estudio.estudio}
                </h3>

                <p>
                    Fecha:
                    ${formatearFecha(estudio.fecha)}
                </p>

            </div>

            <span class="result-status">
                ${estudio.estado}
            </span>

        </div>


        <div class="result-box">

            <h3>
                🧪 Resultado
            </h3>

            <p>
                ${
                    estudio.resultado ||
                    "El resultado todavía no está disponible."
                }
            </p>

        </div>


        <div class="result-box">

            <h3>
                👨‍⚕️ Médico solicitante
            </h3>

            <p>
                ${estudio.medico}
            </p>

        </div>


        <div class="result-box">

            <h3>
                📝 Observaciones
            </h3>

            <p>
                ${
                    estudio.observaciones ||
                    "Sin observaciones registradas."
                }
            </p>

        </div>

    `;


    document.getElementById(
        "modalResultado"
    ).classList.add("show");

}


function cerrarResultado() {

    document.getElementById(
        "modalResultado"
    ).classList.remove("show");

}


/* =========================
   BUSCAR
========================= */

function buscarEstudio() {

    const texto =
        document.getElementById(
            "buscarEstudio"
        ).value
        .toLowerCase()
        .trim();


    const resultados =
        estudios.filter(estudio => {

            const contenido = `

                ${estudio.paciente}

                ${estudio.estudio}

                ${estudio.medico}

                ${estudio.estado}

            `.toLowerCase();


            return contenido.includes(texto);

        });


    renderizarEstudios(resultados);

}


/* =========================
   ELIMINAR
========================= */

function eliminarEstudio(id) {

    const estudio =
        estudios.find(
            e => e.id === id
        );


    if (!estudio) return;


    const confirmar =
        confirm(
            `¿Deseas eliminar el estudio "${estudio.estudio}" de ${estudio.paciente}?`
        );


    if (!confirmar) return;


    estudios =
        estudios.filter(
            e => e.id !== id
        );


    renderizarEstudios();


    alert(
        "Estudio eliminado correctamente."
    );

}


/* =========================
   IMPRIMIR
========================= */

function imprimirResultado() {

    window.print();

}


/* =========================
   FECHA
========================= */

function formatearFecha(fecha) {

    if (!fecha) return "";

    const partes =
        fecha.split("-");

    return `${partes[2]}/${partes[1]}/${partes[0]}`;

}


/* =========================
   CERRAR AL HACER CLICK FUERA
========================= */

document.getElementById(
    "modalLaboratorio"
).addEventListener(
    "click",
    function(event) {

        if (event.target === this) {
            cerrarFormulario();
        }

    }
);


document.getElementById(
    "modalResultado"
).addEventListener(
    "click",
    function(event) {

        if (event.target === this) {
            cerrarResultado();
        }

    }
);


/* =========================
   INICIAR
========================= */

renderizarEstudios();