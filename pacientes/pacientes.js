let pacientes = [
    {
        id: 1,
        nombre: "Juan",
        apellido: "Pérez",
        dpi: "1234 56789 0101",
        telefono: "5555-1234",
        edad: 35,
        sexo: "Masculino",
        correo: "juan@email.com",
        fechaNacimiento: "1991-05-15",
        tipoSangre: "O+",
        direccion: "Ciudad de Guatemala",
        contactoEmergencia: "Pedro Pérez",
        telefonoEmergencia: "5555-1111",
        estado: "Activo"
    },
    {
        id: 2,
        nombre: "María",
        apellido: "González",
        dpi: "2345 67890 0101",
        telefono: "5555-2345",
        edad: 28,
        sexo: "Femenino",
        correo: "maria@email.com",
        fechaNacimiento: "1998-02-20",
        tipoSangre: "A+",
        direccion: "Mixco",
        contactoEmergencia: "Ana González",
        telefonoEmergencia: "5555-2222",
        estado: "Activo"
    },
    {
        id: 3,
        nombre: "Carlos",
        apellido: "Ramírez",
        dpi: "3456 78901 0101",
        telefono: "5555-3456",
        edad: 42,
        sexo: "Masculino",
        correo: "carlos@email.com",
        fechaNacimiento: "1984-01-10",
        tipoSangre: "B+",
        direccion: "Villa Nueva",
        contactoEmergencia: "Luis Ramírez",
        telefonoEmergencia: "5555-3333",
        estado: "Activo"
    },
    {
        id: 4,
        nombre: "Laura",
        apellido: "Sánchez",
        dpi: "4567 89012 0101",
        telefono: "5555-4567",
        edad: 31,
        sexo: "Femenino",
        correo: "laura@email.com",
        fechaNacimiento: "1995-08-12",
        tipoSangre: "O-",
        direccion: "Amatitlán",
        contactoEmergencia: "Sofía Sánchez",
        telefonoEmergencia: "5555-4444",
        estado: "Inactivo"
    }
];

let pacienteEditando = null;


/* =========================
   ABRIR FORMULARIO
========================= */

function abrirFormulario() {

    pacienteEditando = null;

    document.getElementById("tituloFormulario").textContent =
        "Nuevo paciente";

    document.getElementById("formPaciente").reset();

    document.getElementById("modalPaciente")
        .classList.add("show");
}


/* =========================
   CERRAR FORMULARIO
========================= */

function cerrarFormulario() {

    document.getElementById("modalPaciente")
        .classList.remove("show");

    pacienteEditando = null;
}


/* =========================
   GUARDAR PACIENTE
========================= */

document.getElementById("formPaciente")
    .addEventListener("submit", function(event) {

        event.preventDefault();

        const nombre =
            document.getElementById("nombre").value.trim();

        const apellido =
            document.getElementById("apellido").value.trim();

        const dpi =
            document.getElementById("dpi").value.trim();

        const fechaNacimiento =
            document.getElementById("fechaNacimiento").value;

        const sexo =
            document.getElementById("sexo").value;

        const tipoSangre =
            document.getElementById("tipoSangre").value;

        const telefono =
            document.getElementById("telefono").value.trim();

        const correo =
            document.getElementById("correo").value.trim();

        const direccion =
            document.getElementById("direccion").value.trim();

        const contactoEmergencia =
            document.getElementById("contactoEmergencia").value.trim();

        const telefonoEmergencia =
            document.getElementById("telefonoEmergencia").value.trim();

        const edad = calcularEdad(fechaNacimiento);


        /* EDITAR */

        if (pacienteEditando !== null) {

            const paciente =
                pacientes.find(
                    p => p.id === pacienteEditando
                );

            paciente.nombre = nombre;
            paciente.apellido = apellido;
            paciente.dpi = dpi;
            paciente.fechaNacimiento = fechaNacimiento;
            paciente.edad = edad;
            paciente.sexo = sexo;
            paciente.tipoSangre = tipoSangre;
            paciente.telefono = telefono;
            paciente.correo = correo;
            paciente.direccion = direccion;
            paciente.contactoEmergencia =
                contactoEmergencia;
            paciente.telefonoEmergencia =
                telefonoEmergencia;

            alert(
                "Paciente actualizado correctamente."
            );

        }

        /* NUEVO */

        else {

            const nuevoPaciente = {

                id:
                    pacientes.length > 0
                        ? Math.max(...pacientes.map(p => p.id)) + 1
                        : 1,

                nombre: nombre,

                apellido: apellido,

                dpi: dpi,

                fechaNacimiento:
                    fechaNacimiento,

                edad: edad,

                sexo: sexo,

                tipoSangre:
                    tipoSangre,

                telefono:
                    telefono,

                correo:
                    correo,

                direccion:
                    direccion,

                contactoEmergencia:
                    contactoEmergencia,

                telefonoEmergencia:
                    telefonoEmergencia,

                estado:
                    "Activo"

            };


            pacientes.push(nuevoPaciente);


            alert(
                "Paciente registrado correctamente."
            );

        }


        renderizarPacientes();

        cerrarFormulario();

    });


/* =========================
   MOSTRAR PACIENTES
========================= */

function renderizarPacientes(lista = pacientes) {
    SaludDB.persist("pacientes", pacientes);

    const tabla =
        document.getElementById("tablaPacientes");

    tabla.innerHTML = "";


    lista.forEach(function(paciente) {

        const iniciales =
            paciente.nombre.charAt(0) +
            paciente.apellido.charAt(0);


        const fila =
            document.createElement("tr");


        fila.innerHTML = `

            <td>
                ${String(paciente.id).padStart(3, "0")}
            </td>


            <td>

                <div class="patient">

                    <div class="avatar">
                        ${iniciales.toUpperCase()}
                    </div>

                    <div>

                        <strong>
                            ${paciente.nombre}
                            ${paciente.apellido}
                        </strong>

                        <small>
                            ${paciente.correo || "Sin correo"}
                        </small>

                    </div>

                </div>

            </td>


            <td>
                ${paciente.dpi}
            </td>


            <td>
                ${paciente.telefono}
            </td>


            <td>
                ${paciente.edad}
            </td>


            <td>
                ${paciente.sexo}
            </td>


            <td>

                <span class="status ${
                    paciente.estado === "Activo"
                        ? "active-status"
                        : "inactive-status"
                }">

                    ${paciente.estado}

                </span>

            </td>


            <td>

                <button
                    class="action edit"
                    onclick="editarPaciente(${paciente.id})"
                    title="Editar"
                >
                    ✏️
                </button>


                <button
                    class="action delete"
                    onclick="eliminarPaciente(${paciente.id})"
                    title="Eliminar"
                >
                    🗑️
                </button>

            </td>

        `;


        tabla.appendChild(fila);

    });


    actualizarTotal(lista.length);
}


/* =========================
   TOTAL
========================= */

function actualizarTotal(cantidad) {

    const total =
        document.querySelector(".total");

    total.textContent =
        `${cantidad} paciente${cantidad !== 1 ? "s" : ""}`;

}


/* =========================
   BUSCAR
========================= */

function buscarPaciente() {

    const texto =
        document
            .getElementById("buscarPaciente")
            .value
            .toLowerCase()
            .trim();


    const resultados =
        pacientes.filter(function(paciente) {

            const contenido = `

                ${paciente.nombre}
                ${paciente.apellido}
                ${paciente.dpi}
                ${paciente.telefono}
                ${paciente.correo}

            `.toLowerCase();


            return contenido.includes(texto);

        });


    renderizarPacientes(resultados);

}


/* =========================
   EDITAR
========================= */

function editarPaciente(id) {

    const paciente =
        pacientes.find(
            p => p.id === id
        );


    if (!paciente) return;


    pacienteEditando = id;


    document.getElementById(
        "tituloFormulario"
    ).textContent = "Editar paciente";


    document.getElementById("nombre").value =
        paciente.nombre;

    document.getElementById("apellido").value =
        paciente.apellido;

    document.getElementById("dpi").value =
        paciente.dpi;

    document.getElementById("fechaNacimiento").value =
        paciente.fechaNacimiento;

    document.getElementById("sexo").value =
        paciente.sexo;

    document.getElementById("tipoSangre").value =
        paciente.tipoSangre;

    document.getElementById("telefono").value =
        paciente.telefono;

    document.getElementById("correo").value =
        paciente.correo;

    document.getElementById("direccion").value =
        paciente.direccion;

    document.getElementById("contactoEmergencia").value =
        paciente.contactoEmergencia;

    document.getElementById("telefonoEmergencia").value =
        paciente.telefonoEmergencia;


    document.getElementById("modalPaciente")
        .classList.add("show");

}


/* =========================
   ELIMINAR
========================= */

function eliminarPaciente(id) {

    const paciente =
        pacientes.find(
            p => p.id === id
        );


    if (!paciente) return;


    const confirmar =
        confirm(
            `¿Deseas eliminar a ${paciente.nombre} ${paciente.apellido}?`
        );


    if (!confirmar) return;


    pacientes =
        pacientes.filter(
            p => p.id !== id
        );


    renderizarPacientes();


    alert(
        "Paciente eliminado correctamente."
    );

}


/* =========================
   CALCULAR EDAD
========================= */

function calcularEdad(fecha) {

    if (!fecha) return "";


    const nacimiento =
        new Date(fecha);

    const hoy =
        new Date();


    let edad =
        hoy.getFullYear() -
        nacimiento.getFullYear();


    const diferenciaMes =
        hoy.getMonth() -
        nacimiento.getMonth();


    if (
        diferenciaMes < 0 ||
        (
            diferenciaMes === 0 &&
            hoy.getDate() < nacimiento.getDate()
        )
    ) {

        edad--;

    }


    return edad;

}


/* =========================
   CERRAR MODAL AL HACER
   CLICK FUERA
========================= */

document.getElementById("modalPaciente")
    .addEventListener("click", function(event) {

        if (event.target === this) {

            cerrarFormulario();

        }

    });


/* =========================
   CARGAR TABLA
========================= */

SaludDB.load("pacientes", pacientes).then(datos => {
    pacientes = datos;
    renderizarPacientes();
}).catch(error => { console.error(error); renderizarPacientes(); });
