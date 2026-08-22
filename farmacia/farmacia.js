let medicamentos = [

    {
        id: 1,
        nombre: "Paracetamol",
        categoria: "Analgésicos",
        presentacion: "Caja x 20 tabletas",
        laboratorio: "Genfar",
        stock: 250,
        stockMinimo: 30,
        precio: 18.50,
        vencimiento: "2027-05-20",
        descripcion: "Analgésico y antipirético."
    },

    {
        id: 2,
        nombre: "Amoxicilina",
        categoria: "Antibióticos",
        presentacion: "Caja x 21 cápsulas",
        laboratorio: "MK",
        stock: 180,
        stockMinimo: 30,
        precio: 45.00,
        vencimiento: "2027-02-15",
        descripcion: "Antibiótico de amplio espectro."
    },

    {
        id: 3,
        nombre: "Ibuprofeno",
        categoria: "Antiinflamatorios",
        presentacion: "Caja x 20 tabletas",
        laboratorio: "Pfizer",
        stock: 15,
        stockMinimo: 30,
        precio: 25.00,
        vencimiento: "2026-12-10",
        descripcion: "Antiinflamatorio y analgésico."
    },

    {
        id: 4,
        nombre: "Loratadina",
        categoria: "Antihistamínicos",
        presentacion: "Caja x 10 tabletas",
        laboratorio: "Bayer",
        stock: 95,
        stockMinimo: 20,
        precio: 22.50,
        vencimiento: "2027-08-11",
        descripcion: "Tratamiento de síntomas alérgicos."
    },

    {
        id: 5,
        nombre: "Omeprazol",
        categoria: "Gastrointestinales",
        presentacion: "Caja x 14 cápsulas",
        laboratorio: "Medifarma",
        stock: 220,
        stockMinimo: 30,
        precio: 32.00,
        vencimiento: "2027-03-25",
        descripcion: "Protector gástrico."
    },

    {
        id: 6,
        nombre: "Vitamina C",
        categoria: "Vitaminas",
        presentacion: "Frasco x 100 tabletas",
        laboratorio: "Nature's",
        stock: 40,
        stockMinimo: 50,
        precio: 38.00,
        vencimiento: "2027-11-01",
        descripcion: "Suplemento de vitamina C."
    },

    {
        id: 7,
        nombre: "Losartán",
        categoria: "Cardiovasculares",
        presentacion: "Caja x 30 tabletas",
        laboratorio: "Novartis",
        stock: 300,
        stockMinimo: 40,
        precio: 55.00,
        vencimiento: "2028-01-15",
        descripcion: "Medicamento para control de presión arterial."
    },

    {
        id: 8,
        nombre: "Metformina",
        categoria: "Cardiovasculares",
        presentacion: "Caja x 30 tabletas",
        laboratorio: "Merck",
        stock: 275,
        stockMinimo: 40,
        precio: 42.00,
        vencimiento: "2027-07-20",
        descripcion: "Medicamento utilizado para controlar la glucosa."
    },

    {
        id: 9,
        nombre: "Diclofenaco",
        categoria: "Antiinflamatorios",
        presentacion: "Caja x 20 tabletas",
        laboratorio: "Voltaren",
        stock: 12,
        stockMinimo: 25,
        precio: 29.50,
        vencimiento: "2026-11-30",
        descripcion: "Antiinflamatorio y analgésico."
    },

    {
        id: 10,
        nombre: "Salbutamol",
        categoria: "Antiinflamatorios",
        presentacion: "Inhalador",
        laboratorio: "GSK",
        stock: 8,
        stockMinimo: 15,
        precio: 65.00,
        vencimiento: "2027-06-12",
        descripcion: "Broncodilatador."
    }

];


let medicamentoEditando = null;


/* =========================
   MOSTRAR INVENTARIO
========================= */

function renderizarMedicamentos(lista = medicamentos) {

    const tabla =
        document.getElementById(
            "tablaFarmacia"
        );

    tabla.innerHTML = "";


    lista.forEach(medicamento => {

        let estado = "Disponible";

        let claseEstado = "available";

        let claseStock = "stock-normal";


        if (medicamento.stock === 0) {

            estado = "Agotado";

            claseEstado = "out";

            claseStock = "stock-low";

        } else if (
            medicamento.stock <=
            medicamento.stockMinimo
        ) {

            estado = "Stock bajo";

            claseEstado = "low";

            claseStock = "stock-low";

        }


        const fila =
            document.createElement("tr");


        fila.innerHTML = `

            <td>
                MED-${String(medicamento.id).padStart(3, "0")}
            </td>


            <td>

                <div class="medicine">

                    <div class="medicine-icon">
                        💊
                    </div>

                    <div>

                        <strong>
                            ${medicamento.nombre}
                        </strong>

                        <small>
                            ${medicamento.laboratorio}
                        </small>

                    </div>

                </div>

            </td>


            <td>
                ${medicamento.categoria}
            </td>


            <td>
                ${medicamento.presentacion}
            </td>


            <td>

                <span class="stock ${claseStock}">
                    ${medicamento.stock}
                </span>

            </td>


            <td>
                Q ${medicamento.precio.toFixed(2)}
            </td>


            <td>
                ${formatearFecha(
                    medicamento.vencimiento
                )}
            </td>


            <td>

                <span class="status ${claseEstado}">
                    ${estado}
                </span>

            </td>


            <td>

                <button
                    class="action edit"
                    onclick="editarMedicamento(${medicamento.id})"
                    title="Editar"
                >
                    ✏️
                </button>


                <button
                    class="action delete"
                    onclick="eliminarMedicamento(${medicamento.id})"
                    title="Eliminar"
                >
                    🗑️
                </button>

            </td>

        `;


        tabla.appendChild(fila);

    });


    actualizarEstadisticas();

}


/* =========================
   ESTADÍSTICAS
========================= */

function actualizarEstadisticas() {

    document.getElementById(
        "totalMedicamentos"
    ).textContent =
        medicamentos.length;


    const stock =
        medicamentos.reduce(
            (total, medicamento) =>
                total + Number(medicamento.stock),
            0
        );


    document.getElementById(
        "stockTotal"
    ).textContent =
        stock.toLocaleString();


    const bajos =
        medicamentos.filter(
            medicamento =>
                medicamento.stock <=
                medicamento.stockMinimo
        ).length;


    document.getElementById(
        "stockBajo"
    ).textContent =
        bajos;


    const valor =
        medicamentos.reduce(
            (total, medicamento) =>
                total +
                (
                    Number(medicamento.stock) *
                    Number(medicamento.precio)
                ),
            0
        );


    document.getElementById(
        "valorInventario"
    ).textContent =
        `Q ${valor.toLocaleString(
            "es-GT",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        )}`;


    document.getElementById(
        "contador"
    ).textContent =
        `${medicamentos.length} medicamentos`;

}


/* =========================
   ABRIR FORMULARIO
========================= */

function abrirFormulario() {

    medicamentoEditando = null;


    document.getElementById(
        "tituloFormulario"
    ).textContent =
        "Nuevo medicamento";


    document.getElementById(
        "formFarmacia"
    ).reset();


    document.getElementById(
        "stockMinimo"
    ).value = 20;


    document.getElementById(
        "modalFarmacia"
    ).classList.add("show");

}


function cerrarFormulario() {

    document.getElementById(
        "modalFarmacia"
    ).classList.remove("show");


    medicamentoEditando = null;

}


/* =========================
   GUARDAR
========================= */

document.getElementById(
    "formFarmacia"
).addEventListener(
    "submit",
    function(event) {

        event.preventDefault();


        const datos = {

            nombre:
                document.getElementById(
                    "nombre"
                ).value,

            categoria:
                document.getElementById(
                    "categoria"
                ).value,

            presentacion:
                document.getElementById(
                    "presentacion"
                ).value,

            laboratorio:
                document.getElementById(
                    "laboratorio"
                ).value,

            stock:
                Number(
                    document.getElementById(
                        "stock"
                    ).value
                ),

            stockMinimo:
                Number(
                    document.getElementById(
                        "stockMinimo"
                    ).value
                ),

            precio:
                Number(
                    document.getElementById(
                        "precio"
                    ).value
                ),

            vencimiento:
                document.getElementById(
                    "vencimiento"
                ).value,

            descripcion:
                document.getElementById(
                    "descripcion"
                ).value

        };


        if (
            medicamentoEditando !== null
        ) {

            const medicamento =
                medicamentos.find(
                    medicamento =>
                        medicamento.id ===
                        medicamentoEditando
                );


            Object.assign(
                medicamento,
                datos
            );


            alert(
                "Medicamento actualizado correctamente."
            );

        } else {

            datos.id =
                medicamentos.length > 0
                    ? Math.max(
                        ...medicamentos.map(
                            medicamento =>
                                medicamento.id
                        )
                    ) + 1
                    : 1;


            medicamentos.push(datos);


            alert(
                "Medicamento registrado correctamente."
            );

        }


        renderizarMedicamentos();

        cerrarFormulario();

    }
);


/* =========================
   EDITAR
========================= */

function editarMedicamento(id) {

    const medicamento =
        medicamentos.find(
            medicamento =>
                medicamento.id === id
        );


    if (!medicamento) return;


    medicamentoEditando = id;


    document.getElementById(
        "tituloFormulario"
    ).textContent =
        "Editar medicamento";


    document.getElementById(
        "nombre"
    ).value =
        medicamento.nombre;


    document.getElementById(
        "categoria"
    ).value =
        medicamento.categoria;


    document.getElementById(
        "presentacion"
    ).value =
        medicamento.presentacion;


    document.getElementById(
        "laboratorio"
    ).value =
        medicamento.laboratorio;


    document.getElementById(
        "stock"
    ).value =
        medicamento.stock;


    document.getElementById(
        "stockMinimo"
    ).value =
        medicamento.stockMinimo;


    document.getElementById(
        "precio"
    ).value =
        medicamento.precio;


    document.getElementById(
        "vencimiento"
    ).value =
        medicamento.vencimiento;


    document.getElementById(
        "descripcion"
    ).value =
        medicamento.descripcion;


    document.getElementById(
        "modalFarmacia"
    ).classList.add("show");

}


/* =========================
   ELIMINAR
========================= */

function eliminarMedicamento(id) {

    const medicamento =
        medicamentos.find(
            medicamento =>
                medicamento.id === id
        );


    if (!medicamento) return;


    const confirmar =
        confirm(
            `¿Deseas eliminar "${medicamento.nombre}" del inventario?`
        );


    if (!confirmar) return;


    medicamentos =
        medicamentos.filter(
            medicamento =>
                medicamento.id !== id
        );


    renderizarMedicamentos();


    alert(
        "Medicamento eliminado correctamente."
    );

}


/* =========================
   BUSCAR
========================= */

function buscarMedicamento() {

    const texto =
        document.getElementById(
            "buscarMedicamento"
        ).value
        .toLowerCase()
        .trim();


    const resultados =
        medicamentos.filter(
            medicamento => {

                const contenido = `

                    ${medicamento.nombre}

                    ${medicamento.categoria}

                    ${medicamento.presentacion}

                    ${medicamento.laboratorio}

                `.toLowerCase();


                return contenido.includes(
                    texto
                );

            }
        );


    renderizarMedicamentos(
        resultados
    );

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
   CERRAR MODAL
========================= */

document.getElementById(
    "modalFarmacia"
).addEventListener(
    "click",
    function(event) {

        if (
            event.target === this
        ) {

            cerrarFormulario();

        }

    }
);


/* =========================
   INICIO
========================= */

renderizarMedicamentos();