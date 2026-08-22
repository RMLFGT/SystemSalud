/* =========================
   GENERAR REPORTE
========================= */

function generarReporte() {

    const inicio =
        document.getElementById(
            "fechaInicio"
        ).value;

    const fin =
        document.getElementById(
            "fechaFin"
        ).value;

    const tipo =
        document.getElementById(
            "tipoReporte"
        ).value;


    if (!inicio || !fin) {

        alert(
            "Selecciona las fechas del reporte."
        );

        return;
    }


    if (inicio > fin) {

        alert(
            "La fecha inicial no puede ser mayor que la fecha final."
        );

        return;
    }


    const nombres = {

        general:
            "Resumen general",

        pacientes:
            "Pacientes",

        citas:
            "Citas",

        laboratorio:
            "Laboratorio",

        farmacia:
            "Farmacia"

    };


    alert(
        `Reporte generado correctamente.\n\nTipo: ${nombres[tipo]}\nDesde: ${formatearFecha(inicio)}\nHasta: ${formatearFecha(fin)}`
    );


    actualizarReporte(tipo);

}


/* =========================
   ACTUALIZAR REPORTE
========================= */

function actualizarReporte(tipo) {

    const tabla =
        document.getElementById(
            "tablaReportes"
        );


    if (tipo === "pacientes") {

        tabla.innerHTML = `

            <tr>

                <td>21/08/2026</td>

                <td>Registro general</td>

                <td>Pacientes</td>

                <td>1,248</td>

                <td>1,180</td>

                <td>68</td>

                <td>
                    <span class="percentage">
                        95%
                    </span>
                </td>

            </tr>

        `;

        return;

    }


    if (tipo === "laboratorio") {

        tabla.innerHTML = `

            <tr>

                <td>21/08/2026</td>

                <td>Laboratorio central</td>

                <td>Estudios clínicos</td>

                <td>184</td>

                <td>171</td>

                <td>13</td>

                <td>
                    <span class="percentage">
                        93%
                    </span>
                </td>

            </tr>

        `;

        return;

    }


    if (tipo === "farmacia") {

        tabla.innerHTML = `

            <tr>

                <td>21/08/2026</td>

                <td>Farmacia central</td>

                <td>Medicamentos</td>

                <td>1,482</td>

                <td>1,420</td>

                <td>62</td>

                <td>
                    <span class="percentage">
                        96%
                    </span>
                </td>

            </tr>

        `;

        return;

    }


    if (tipo === "citas") {

        tabla.innerHTML = `

            <tr>

                <td>21/08/2026</td>

                <td>Dr. Carlos Ramírez</td>

                <td>Medicina General</td>

                <td>41</td>

                <td>38</td>

                <td>3</td>

                <td>
                    <span class="percentage">
                        93%
                    </span>
                </td>

            </tr>


            <tr>

                <td>20/08/2026</td>

                <td>Dra. Ana Gómez</td>

                <td>Pediatría</td>

                <td>35</td>

                <td>33</td>

                <td>2</td>

                <td>
                    <span class="percentage">
                        94%
                    </span>
                </td>

            </tr>

        `;

        return;

    }


    /* REPORTE GENERAL */

    tabla.innerHTML = `

        <tr>

            <td>21/08/2026</td>

            <td>Dr. Carlos Ramírez</td>

            <td>Medicina General</td>

            <td>41</td>

            <td>38</td>

            <td>3</td>

            <td>
                <span class="percentage">
                    93%
                </span>
            </td>

        </tr>


        <tr>

            <td>20/08/2026</td>

            <td>Dra. Ana Gómez</td>

            <td>Pediatría</td>

            <td>35</td>

            <td>33</td>

            <td>2</td>

            <td>
                <span class="percentage">
                    94%
                </span>
            </td>

        </tr>


        <tr>

            <td>15/08/2026</td>

            <td>Dra. Sofía Castillo</td>

            <td>Ginecología</td>

            <td>35</td>

            <td>33</td>

            <td>2</td>

            <td>
                <span class="percentage">
                    94%
                </span>
            </td>

        </tr>

    `;

}


/* =========================
   EXPORTAR
========================= */

function exportarReporte() {

    const tabla =
        document.getElementById(
            "tablaReportes"
        );


    const filas =
        tabla.querySelectorAll(
            "tr"
        );


    let contenido =
        "Fecha,Médico,Especialidad,Citas,Completadas,Canceladas,Cumplimiento\n";


    filas.forEach(fila => {

        const columnas =
            fila.querySelectorAll(
                "td"
            );


        const datos =
            Array.from(columnas).map(
                columna =>
                    columna.innerText
                        .replace(/,/g, "")
                        .trim()
            );


        contenido +=
            datos.join(",") + "\n";

    });


    const archivo =
        new Blob(
            [contenido],
            {
                type: "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            archivo
        );


    const enlace =
        document.createElement(
            "a"
        );


    enlace.href = url;

    enlace.download =
        "reporte_saludsystem.csv";


    document.body.appendChild(
        enlace
    );


    enlace.click();


    document.body.removeChild(
        enlace
    );


    URL.revokeObjectURL(url);


    alert(
        "Reporte exportado correctamente."
    );

}


/* =========================
   IMPRIMIR
========================= */

function imprimirReporte() {

    window.print();

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