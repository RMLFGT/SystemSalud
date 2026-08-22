let expedientes = [

    {
        id: 1,
        paciente: "Juan Pérez",
        medico: "Dr. Carlos Ramírez",
        fecha: "2026-08-20",
        tipo: "Control",
        diagnostico: "Hipertensión arterial",
        sintomas: "Dolor de cabeza ocasional",
        tratamiento: "Control de presión arterial y dieta baja en sodio.",
        observaciones: "Paciente estable.",
        presion: "130/85",
        frecuencia: 74,
        temperatura: 36.5,
        peso: 78,
        estado: "Activo"
    },

    {
        id: 2,
        paciente: "María González",
        medico: "Dra. Ana Gómez",
        fecha: "2026-08-19",
        tipo: "Consulta general",
        diagnostico: "Gripe común",
        sintomas: "Fiebre, tos y congestión.",
        tratamiento: "Reposo e hidratación.",
        observaciones: "Control en una semana.",
        presion: "118/78",
        frecuencia: 80,
        temperatura: 37.4,
        peso: 62,
        estado: "Activo"
    },

    {
        id: 3,
        paciente: "Carlos Ramírez",
        medico: "Dr. Luis Morales",
        fecha: "2026-08-17",
        tipo: "Seguimiento",
        diagnostico: "Dermatitis",
        sintomas: "Irritación y enrojecimiento.",
        tratamiento: "Crema tópica durante 10 días.",
        observaciones: "Mejoría considerable.",
        presion: "120/80",
        frecuencia: 72,
        temperatura: 36.6,
        peso: 75,
        estado: "Activo"
    },

    {
        id: 4,
        paciente: "Laura Sánchez",
        medico: "Dra. Sofía Castillo",
        fecha: "2026-08-15",
        tipo: "Control",
        diagnostico: "Anemia",
        sintomas: "Cansancio y debilidad.",
        tratamiento: "Suplementación y alimentación balanceada.",
        observaciones: "Solicitar examen de seguimiento.",
        presion: "110/70",
        frecuencia: 76,
        temperatura: 36.4,
        peso: 58,
        estado: "Activo"
    },

    {
        id: 5,
        paciente: "Ana López",
        medico: "Dr. Carlos Ramírez",
        fecha: "2026-08-10",
        tipo: "Consulta general",
        diagnostico: "Migraña",
        sintomas: "Dolor de cabeza intenso.",
        tratamiento: "Analgésico según indicación médica.",
        observaciones: "Evitar factores desencadenantes.",
        presion: "115/75",
        frecuencia: 70,
        temperatura: 36.5,
        peso: 64,
        estado: "Activo"
    },

    {
        id: 6,
        paciente: "Pedro García",
        medico: "Dra. Ana Gómez",
        fecha: "2026-08-05",
        tipo: "Emergencia",
        diagnostico: "Gastritis",
        sintomas: "Dolor abdominal y acidez.",
        tratamiento: "Tratamiento gástrico y dieta.",
        observaciones: "Paciente estable.",
        presion: "122/80",
        frecuencia: 78,
        temperatura: 36.7,
        peso: 81,
        estado: "Cerrado"
    }

];


let expedienteEditando = null;


/* =========================
   MOSTRAR EXPEDIENTES
========================= */

function renderizarExpedientes(lista = expedientes) {

    const tabla =
        document.getElementById(
            "tablaExpedientes"
        );

    tabla.innerHTML = "";


    lista.forEach(expediente => {

        const iniciales =
            expediente.paciente
                .split(" ")
                .map(nombre => nombre.charAt(0))
                .slice(0, 2)
                .join("");


        const claseEstado =
            expediente.estado === "Activo"
                ? "active-status"
                : "closed-status";


        const fila =
            document.createElement("tr");


        fila.innerHTML = `

            <td>
                EXP-${String(expediente.id).padStart(3, "0")}
            </td>


            <td>

                <div class="patient">

                    <div class="avatar">
                        ${iniciales}
                    </div>

                    <div>

                        <strong>
                            ${expediente.paciente}
                        </strong>

                        <small>
                            ${expediente.tipo}
                        </small>

                    </div>

                </div>

            </td>


            <td>
                ${formatearFecha(expediente.fecha)}
            </td>


            <td>
                ${expediente.diagnostico}
            </td>


            <td>
                ${expediente.medico}
            </td>


            <td>

                <span class="status ${claseEstado}">
                    ${expediente.estado}
                </span>

            </td>


            <td>

                <button
                    class="action view"
                    onclick="verExpediente(${expediente.id})"
                    title="Ver expediente"
                >
                    👁️
                </button>


                <button
                    class="action edit"
                    onclick="editarExpediente(${expediente.id})"
                    title="Editar"
                >
                    ✏️
                </button>


                <button
                    class="action delete"
                    onclick="eliminarExpediente(${expediente.id})"
                    title="Eliminar"
                >
                    🗑️
                </button>

            </td>

        `;


        tabla.appendChild(fila);

    });


    document.getElementById(
        "totalExpedientes"
    ).textContent = expedientes.length;


    document.querySelector(".total")
        .textContent =
        `${lista.length} expediente${lista.length !== 1 ? "s" : ""}`;

}


/* =========================
   NUEVO
========================= */

function abrirFormulario() {

    expedienteEditando = null;

    document.getElementById(
        "tituloFormulario"
    ).textContent =
        "Nuevo expediente";


    document.getElementById(
        "formExpediente"
    ).reset();


    document.getElementById(
        "modalExpediente"
    ).classList.add("show");

}


function cerrarFormulario() {

    document.getElementById(
        "modalExpediente"
    ).classList.remove("show");


    expedienteEditando = null;

}


/* =========================
   GUARDAR
========================= */

document.getElementById(
    "formExpediente"
).addEventListener(
    "submit",
    function(event) {

        event.preventDefault();


        const datos = {

            paciente:
                document.getElementById("paciente").value,

            medico:
                document.getElementById("medico").value,

            fecha:
                document.getElementById("fecha").value,

            tipo:
                document.getElementById("tipo").value,

            diagnostico:
                document.getElementById("diagnostico").value,

            sintomas:
                document.getElementById("sintomas").value,

            tratamiento:
                document.getElementById("tratamiento").value,

            observaciones:
                document.getElementById("observaciones").value,

            presion:
                document.getElementById("presion").value,

            frecuencia:
                document.getElementById("frecuencia").value,

            temperatura:
                document.getElementById("temperatura").value,

            peso:
                document.getElementById("peso").value

        };


        if (expedienteEditando !== null) {

            const expediente =
                expedientes.find(
                    e => e.id === expedienteEditando
                );


            Object.assign(
                expediente,
                datos
            );


            alert(
                "Expediente actualizado correctamente."
            );

        } else {

            datos.id =
                expedientes.length > 0
                    ? Math.max(
                        ...expedientes.map(
                            e => e.id
                        )
                    ) + 1
                    : 1;


            datos.estado = "Activo";


            expedientes.push(datos);


            alert(
                "Expediente creado correctamente."
            );

        }


        renderizarExpedientes();

        cerrarFormulario();

    }
);


/* =========================
   EDITAR
========================= */

function editarExpediente(id) {

    const expediente =
        expedientes.find(
            e => e.id === id
        );


    if (!expediente) return;


    expedienteEditando = id;


    document.getElementById(
        "tituloFormulario"
    ).textContent =
        "Editar expediente";


    document.getElementById("paciente").value =
        expediente.paciente;

    document.getElementById("medico").value =
        expediente.medico;

    document.getElementById("fecha").value =
        expediente.fecha;

    document.getElementById("tipo").value =
        expediente.tipo;

    document.getElementById("diagnostico").value =
        expediente.diagnostico;

    document.getElementById("sintomas").value =
        expediente.sintomas;

    document.getElementById("tratamiento").value =
        expediente.tratamiento;

    document.getElementById("observaciones").value =
        expediente.observaciones;

    document.getElementById("presion").value =
        expediente.presion;

    document.getElementById("frecuencia").value =
        expediente.frecuencia;

    document.getElementById("temperatura").value =
        expediente.temperatura;

    document.getElementById("peso").value =
        expediente.peso;


    document.getElementById(
        "modalExpediente"
    ).classList.add("show");

}


/* =========================
   VER EXPEDIENTE
========================= */

function verExpediente(id) {

    const expediente =
        expedientes.find(
            e => e.id === id
        );


    if (!expediente) return;


    document.getElementById(
        "detallePaciente"
    ).textContent =
        `${expediente.paciente} • EXP-${String(expediente.id).padStart(3, "0")}`;


    document.getElementById(
        "contenidoDetalle"
    ).innerHTML = `

        <div class="detail-grid">

            <div class="detail-box">

                <h3>
                    👤 Información
                </h3>

                <p>
                    <strong>Paciente:</strong>
                    ${expediente.paciente}
                </p>

                <p>
                    <strong>Médico:</strong>
                    ${expediente.medico}
                </p>

                <p>
                    <strong>Fecha:</strong>
                    ${formatearFecha(expediente.fecha)}
                </p>

                <p>
                    <strong>Consulta:</strong>
                    ${expediente.tipo}
                </p>

            </div>


            <div class="detail-box">

                <h3>
                    ❤️ Signos vitales
                </h3>

                <p>
                    Presión: ${expediente.presion || "No registrado"}
                </p>

                <p>
                    Frecuencia: ${expediente.frecuencia || "No registrado"} BPM
                </p>

                <p>
                    Temperatura: ${expediente.temperatura || "No registrado"} °C
                </p>

                <p>
                    Peso: ${expediente.peso || "No registrado"} kg
                </p>

            </div>


            <div class="detail-box">

                <h3>
                    🩺 Diagnóstico
                </h3>

                <p>
                    ${expediente.diagnostico}
                </p>

            </div>


            <div class="detail-box">

                <h3>
                    🤒 Síntomas
                </h3>

                <p>
                    ${expediente.sintomas || "Sin información registrada."}
                </p>

            </div>


            <div class="detail-box">

                <h3>
                    💊 Tratamiento
                </h3>

                <p>
                    ${expediente.tratamiento || "Sin tratamiento registrado."}
                </p>

            </div>


            <div class="detail-box">

                <h3>
                    📝 Observaciones
                </h3>

                <p>
                    ${expediente.observaciones || "Sin observaciones."}
                </p>

            </div>

        </div>

    `;


    document.getElementById(
        "modalDetalle"
    ).classList.add("show");

}


function cerrarDetalle() {

    document.getElementById(
        "modalDetalle"
    ).classList.remove("show");

}


/* =========================
   BUSCAR
========================= */

function buscarExpediente() {

    const texto =
        document.getElementById(
            "buscarExpediente"
        ).value
        .toLowerCase()
        .trim();


    const resultados =
        expedientes.filter(expediente => {

            const contenido = `

                ${expediente.paciente}

                ${expediente.diagnostico}

                ${expediente.medico}

                ${expediente.tipo}

            `.toLowerCase();


            return contenido.includes(texto);

        });


    renderizarExpedientes(
        resultados
    );

}


/* =========================
   ELIMINAR
========================= */

function eliminarExpediente(id) {

    const expediente =
        expedientes.find(
            e => e.id === id
        );


    if (!expediente) return;


    const confirmar =
        confirm(
            `¿Deseas eliminar el expediente de ${expediente.paciente}?`
        );


    if (!confirmar) return;


    expedientes =
        expedientes.filter(
            e => e.id !== id
        );


    renderizarExpedientes();


    alert(
        "Expediente eliminado correctamente."
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
   CERRAR MODALES
========================= */

document.getElementById(
    "modalExpediente"
).addEventListener(
    "click",
    function(event) {

        if (event.target === this) {
            cerrarFormulario();
        }

    }
);


document.getElementById(
    "modalDetalle"
).addEventListener(
    "click",
    function(event) {

        if (event.target === this) {
            cerrarDetalle();
        }

    }
);


/* =========================
   INICIAR
========================= */

renderizarExpedientes();