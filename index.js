/* =====================================
   SALUDSYSTEM - DASHBOARD
===================================== */


/* =====================================
   ANIMACIÓN DE LAS TARJETAS
===================================== */

document.addEventListener("DOMContentLoaded", () => {

    const cards =
        document.querySelectorAll(".card");


    cards.forEach((card, index) => {

        card.style.opacity = "0";

        card.style.transform =
            "translateY(15px)";


        setTimeout(() => {

            card.style.transition =
                "all 0.4s ease";

            card.style.opacity = "1";

            card.style.transform =
                "translateY(0)";

        }, index * 100);

    });

});


/* =====================================
   BOTÓN VER TODAS LAS CITAS
===================================== */

const botones =
    document.querySelectorAll(
        ".panel-header button"
    );


if (botones.length > 0) {

    botones[0].addEventListener(
        "click",
        () => {

            window.location.href =
                "citas/citas.html";

        }
    );

}


/* =====================================
   CERRAR SESIÓN
===================================== */

const enlaces =
    document.querySelectorAll(
        ".sidebar-bottom a"
    );


if (enlaces.length > 1) {

    const cerrarSesion =
        enlaces[1];


    cerrarSesion.addEventListener(
        "click",
        (event) => {

            event.preventDefault();


            const confirmar =
                confirm(
                    "¿Seguro que deseas cerrar sesión?"
                );


            if (confirmar) {

                alert(
                    "Sesión cerrada correctamente."
                );


                window.location.href =
                    "login/login.html";

            }

        }
    );

}


/* =====================================
   CONFIGURACIÓN
===================================== */

if (enlaces.length > 0) {

    const configuracion =
        enlaces[0];


    configuracion.addEventListener(
        "click",
        (event) => {

            event.preventDefault();


            alert(
                "Módulo de configuración próximamente disponible."
            );

        }
    );

}


/* =====================================
   EFECTO EN LAS CITAS
===================================== */

const citas =
    document.querySelectorAll(
        ".appointment"
    );


citas.forEach(cita => {

    cita.addEventListener(
        "click",
        () => {

            const paciente =
                cita.querySelector(
                    "strong"
                );


            if (paciente) {

                alert(
                    `Cita seleccionada: ${paciente.textContent}`
                );

            }

        }
    );

});


/* =====================================
   HORA ACTUAL
===================================== */

function actualizarHora() {

    const ahora =
        new Date();


    const hora =
        ahora.toLocaleTimeString(
            "es-GT",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );


    document.title =
        `SaludSystem | ${hora}`;

}


actualizarHora();


setInterval(
    actualizarHora,
    1000
);