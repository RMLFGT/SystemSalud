"use strict";

/* =====================================
   SEGURIDAD CENTRAL - SALUDSYSTEM
===================================== */

const SALUDSYSTEM_RAIZ = obtenerRaizProyecto();

const API_SESION =
    `${SALUDSYSTEM_RAIZ}BackEnd/Usuarios/sesion_actual.php`;

const API_CERRAR_SESION =
    `${SALUDSYSTEM_RAIZ}BackEnd/Usuarios/cerrar_sesion.php`;

const URL_LOGIN =
    `${SALUDSYSTEM_RAIZ}login/login.html`;

let saludSystemSesion = null;


/* =====================================
   INICIALIZACIÓN
===================================== */

document.addEventListener(
    "DOMContentLoaded",
    iniciarSeguridad
);

/*
   Se registra inmediatamente y en fase de captura.
   Así evita que los controladores antiguos de otros
   módulos intenten cerrar la sesión solamente
   redirigiendo al login.
*/
document.addEventListener(
    "click",
    manejarCierreSesion,
    true
);


/* =====================================
   COMPROBAR SESIÓN
===================================== */

async function iniciarSeguridad() {
    try {
        const respuesta = await fetch(API_SESION, {
            method: "GET",
            credentials: "same-origin",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store"
        });

        const resultado = await leerJson(respuesta);

        if (
            !respuesta.ok ||
            resultado.correcto !== true
        ) {
            redirigirAlLogin();
            return;
        }

        saludSystemSesion = resultado;

        if (!tieneAccesoAPagina(resultado.permisos)) {
            mostrarAccesoDenegado(resultado.permisos);
            return;
        }

        mostrarUsuario(resultado.usuario);
        aplicarPermisosMenu(resultado.permisos);

        window.saludSystemSesion = resultado;

        document.dispatchEvent(
            new CustomEvent(
                "saludsystem:sesion-lista",
                {
                    detail: resultado
                }
            )
        );
    } catch (error) {
        console.error(
            "No fue posible comprobar la sesión:",
            error
        );

        redirigirAlLogin();
    }
}


/* =====================================
   RAÍZ DEL PROYECTO
===================================== */

function obtenerRaizProyecto() {
    const script = document.querySelector('script[src$="seguridad.js"]');
    return new URL('./', script.src).pathname;
}


/* =====================================
   IDENTIFICAR MÓDULO ACTUAL
===================================== */

function obtenerModuloDesdeRuta(ruta) {
    const rutaProyecto =
        SALUDSYSTEM_RAIZ.toLowerCase();

    let rutaLimpia =
        decodeURIComponent(ruta).toLowerCase();

    const posicion =
        rutaLimpia.indexOf(rutaProyecto);

    if (posicion !== -1) {
        rutaLimpia = rutaLimpia.substring(
            posicion + rutaProyecto.length
        );
    }

    rutaLimpia = rutaLimpia.replace(/^\/+/, "");

    if (
        rutaLimpia === "" ||
        rutaLimpia === "index.html"
    ) {
        return "INICIO";
    }

    const carpeta = rutaLimpia.split("/")[0];

    const modulos = {
        pacientes: "PACIENTES",
        medicos: "MEDICOS",
        citas: "CITAS",
        expedientes: "EXPEDIENTES",
        laboratorio: "LABORATORIO",
        farmacia: "FARMACIA",
        reportes: "REPORTES",
        configuracion: "CONFIGURACION"
    };

    return modulos[carpeta] || null;
}


/* =====================================
   VALIDAR ACCESO A LA PÁGINA
===================================== */

function tieneAccesoAPagina(permisos) {
    const moduloActual =
        obtenerModuloDesdeRuta(
            window.location.pathname
        );

    if (!moduloActual) {
        return false;
    }

    return permisos?.[moduloActual]?.ver === true;
}


/* =====================================
   MENÚ SEGÚN PERMISOS
===================================== */

function aplicarPermisosMenu(permisos) {
    document
        .querySelectorAll(".sidebar a[href]")
        .forEach((enlace) => {
            if (esEnlaceCerrarSesion(enlace)) {
                return;
            }

            const ruta = new URL(
                enlace.href,
                window.location.href
            ).pathname;

            const modulo =
                obtenerModuloDesdeRuta(ruta);

            if (
                modulo &&
                permisos?.[modulo]?.ver !== true
            ) {
                enlace.hidden = true;
                enlace.setAttribute(
                    "aria-hidden",
                    "true"
                );
                enlace.setAttribute(
                    "tabindex",
                    "-1"
                );
            } else {
                enlace.hidden = false;
                enlace.removeAttribute("aria-hidden");
                enlace.removeAttribute("tabindex");
            }
        });
}


/* =====================================
   MOSTRAR USUARIO
===================================== */

function mostrarUsuario(usuarioActual) {
    if (!usuarioActual) {
        return;
    }

    const nombreCompleto = [
        usuarioActual.nombre,
        usuarioActual.apellido
    ]
        .filter(Boolean)
        .join(" ");

    document
        .querySelectorAll(".user strong")
        .forEach((elemento) => {
            elemento.textContent =
                nombreCompleto ||
                usuarioActual.nombreUsuario;
        });

    document
        .querySelectorAll(".user small")
        .forEach((elemento) => {
            elemento.textContent =
                usuarioActual.rol || "";
        });
}


/* =====================================
   CERRAR SESIÓN
===================================== */

function esEnlaceCerrarSesion(enlace) {
    if (!(enlace instanceof Element)) {
        return false;
    }

    const identificador =
        (enlace.id || "").toLowerCase();

    const accion =
        (enlace.dataset.accion || "").toLowerCase();

    const texto =
        (enlace.textContent || "")
            .trim()
            .toLowerCase();

    return (
        identificador === "cerrarsesion" ||
        accion === "cerrar-sesion" ||
        texto.includes("cerrar sesión") ||
        texto.includes("cerrar sesion")
    );
}

async function manejarCierreSesion(event) {
    const enlace =
        event.target.closest("a, button");

    if (!enlace || !esEnlaceCerrarSesion(enlace)) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const confirmar = window.confirm(
        "¿Seguro que deseas cerrar sesión?"
    );

    if (!confirmar) {
        return;
    }

    enlace.setAttribute("aria-disabled", "true");

    try {
        const respuesta = await fetch(
            API_CERRAR_SESION,
            {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Accept": "application/json"
                },
                cache: "no-store"
            }
        );

        const resultado = await leerJson(respuesta);

        if (
            !respuesta.ok ||
            resultado.correcto !== true
        ) {
            throw new Error(
                resultado.mensaje ||
                "No fue posible cerrar la sesión."
            );
        }
    } catch (error) {
        console.error(
            "Error al cerrar la sesión:",
            error
        );
    } finally {
        window.location.replace(URL_LOGIN);
    }
}

function mostrarAccesoDenegado(permisos) {
    const estilo = document.createElement("style");
    estilo.textContent = `
        .acceso-denegado-fondo {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(15, 23, 42, .65);
        }

        .acceso-denegado {
            position: relative;
            width: 420px;
            max-width: 100%;
            padding: 32px;
            border-radius: 14px;
            background: #fff;
            box-shadow: 0 20px 50px rgba(0, 0, 0, .25);
            text-align: center;
        }

        .acceso-denegado-icono {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 58px;
            height: 58px;
            margin: 0 auto 18px;
            border-radius: 50%;
            background: #fee2e2;
            color: #dc2626;
        }

        .acceso-denegado-icono svg {
            width: 29px;
            height: 29px;
            fill: none;
            stroke: currentColor;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        .acceso-denegado h2 {
            margin-bottom: 10px;
            color: #0f172a;
            font-size: 21px;
        }

        .acceso-denegado p {
            color: #64748b;
            font-size: 14px;
            line-height: 1.5;
        }

        .acceso-denegado-cerrar {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 36px;
            height: 36px;
            border: 0;
            border-radius: 50%;
            background: #f1f5f9;
            color: #475569;
            font-size: 22px;
            cursor: pointer;
        }

        .acceso-denegado-cerrar:hover {
            background: #fee2e2;
            color: #dc2626;
        }

        .acceso-denegado-boton {
            margin-top: 22px;
            padding: 11px 18px;
            border: 0;
            border-radius: 7px;
            background: #0284c7;
            color: #fff;
            font-weight: 700;
            cursor: pointer;
        }

        .acceso-denegado-boton:hover {
            background: #0369a1;
        }
    `;

    const fondo = document.createElement("div");
    fondo.className = "acceso-denegado-fondo";
    fondo.innerHTML = `
        <section class="acceso-denegado" role="alertdialog" aria-modal="true" aria-labelledby="tituloAccesoDenegado">
            <button class="acceso-denegado-cerrar" type="button" aria-label="Cerrar">×</button>
            <div class="acceso-denegado-icono">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3 3 7v5c0 5 3.8 8.3 9 9 5.2-.7 9-4 9-9V7l-9-4Z"></path>
                    <path d="m9.5 9.5 5 5"></path>
                    <path d="m14.5 9.5-5 5"></path>
                </svg>
            </div>
            <h2 id="tituloAccesoDenegado">Acceso restringido</h2>
            <p>Usted no tiene acceso a este módulo.</p>
            <button class="acceso-denegado-boton" type="button">Volver al inicio</button>
        </section>
    `;

    const cerrar = () => redirigirAPrimerModulo(permisos);

    fondo.querySelector(".acceso-denegado-cerrar").addEventListener("click", cerrar);
    fondo.querySelector(".acceso-denegado-boton").addEventListener("click", cerrar);

    document.addEventListener("keydown", function manejarEscape(event) {
        if (event.key === "Escape") {
            document.removeEventListener("keydown", manejarEscape);
            cerrar();
        }
    });

    document.head.appendChild(estilo);
    document.body.appendChild(fondo);
    fondo.querySelector(".acceso-denegado-cerrar").focus();
}

/* =====================================
   REDIRECCIONES
===================================== */

function redirigirAlLogin() {
    const destino =
        `${URL_LOGIN}?sesion=necesaria`;

    if (
        window.location.pathname.toLowerCase() !==
        new URL(URL_LOGIN, window.location.origin)
            .pathname
            .toLowerCase()
    ) {
        window.location.replace(destino);
    }
}

function redirigirAPrimerModulo(permisos) {
    const primerPermiso = Object.values(
        permisos || {}
    ).find((permiso) => {
        return (
            permiso.ver === true &&
            typeof permiso.ruta === "string" &&
            permiso.ruta.trim() !== ""
        );
    });

    if (!primerPermiso) {
        cerrarSesionSinPermisos();
        return;
    }

    const ruta = primerPermiso.ruta
        .trim()
        .replace(/^\/+/, "");

    window.location.replace(
        `${SALUDSYSTEM_RAIZ}${ruta}`
    );
}

async function cerrarSesionSinPermisos() {
    try {
        await fetch(API_CERRAR_SESION, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store"
        });
    } catch (error) {
        console.error(
            "No fue posible finalizar la sesión:",
            error
        );
    } finally {
        window.location.replace(
            `${URL_LOGIN}?error=sin-permisos`
        );
    }
}


/* =====================================
   LEER RESPUESTAS JSON
===================================== */

async function leerJson(respuesta) {
    const texto = await respuesta.text();

    if (!texto.trim()) {
        throw new Error(
            "El servidor devolvió una respuesta vacía."
        );
    }

    try {
        return JSON.parse(texto);
    } catch {
        throw new Error(
            "El servidor no devolvió una respuesta JSON válida."
        );
    }
}


/* =====================================
   API PARA LOS MÓDULOS
===================================== */

window.SaludSystemSeguridad = {
    obtenerSesion() {
        return saludSystemSesion;
    },

    tienePermiso(accion, modulo = null) {
        const moduloConsultado =
            modulo ||
            obtenerModuloDesdeRuta(
                window.location.pathname
            );

        return (
            saludSystemSesion
                ?.permisos
                ?.[moduloConsultado]
                ?.[accion] === true
        );
    }
};