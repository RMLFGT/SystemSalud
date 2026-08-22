const loginForm =
    document.getElementById(
        "loginForm"
    );


const usuario =
    document.getElementById(
        "usuario"
    );


const password =
    document.getElementById(
        "password"
    );


const mensaje =
    document.getElementById(
        "loginMessage"
    );


const mostrarPassword =
    document.getElementById(
        "mostrarPassword"
    );


/* =========================
   MOSTRAR / OCULTAR PASSWORD
========================= */

mostrarPassword.addEventListener(
    "click",
    () => {

        if (
            password.type ===
            "password"
        ) {

            password.type =
                "text";

            mostrarPassword.textContent =
                "🙈";

        } else {

            password.type =
                "password";

            mostrarPassword.textContent =
                "👁️";

        }

    }
);


/* =========================
   LOGIN
========================= */

loginForm.addEventListener(
    "submit",
    (event) => {

        event.preventDefault();


        const user =
            usuario.value.trim();


        const pass =
            password.value.trim();


        mensaje.className =
            "login-message";


        mensaje.textContent =
            "";


        if (!user || !pass) {

            mensaje.classList.add(
                "error"
            );

            mensaje.textContent =
                "Completa todos los campos.";

            return;

        }


        /*
            CREDENCIALES DE DEMOSTRACIÓN

            Usuario: admin
            Contraseña: 1234
        */


        if (
            user === "admin" &&
            pass === "1234"
        ) {

            mensaje.classList.add(
                "success"
            );

            mensaje.textContent =
                "Inicio de sesión correcto. Entrando al sistema...";


            /*
                Guardamos una marca
                para simular una sesión.
            */

            sessionStorage.setItem(
                "saludSystemSesion",
                "activa"
            );


            setTimeout(
                () => {

                    window.location.href =
                        "../index.html";

                },
                1000
            );


        } else {

            mensaje.classList.add(
                "error"
            );

            mensaje.textContent =
                "Usuario o contraseña incorrectos.";

        }

    }
);


/* =========================
   RECUPERAR CONTRASEÑA
========================= */

document
    .getElementById("recuperar")
    .addEventListener(
        "click",
        (event) => {

            event.preventDefault();


            alert(
                "Para esta versión frontend, la recuperación de contraseña no está conectada a un servidor."
            );

        }
    );