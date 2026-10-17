"use strict";

// Loading, empty responses and failed queries are different UI states.
window.SaludDatos = (() => {
    const errores = new Map();
    function actualizarAviso() {
        let aviso = document.getElementById('estadoDatos');
        if (!aviso) {
            aviso = document.createElement('p');
            aviso.id = 'estadoDatos';
            aviso.setAttribute('role', 'alert');
            aviso.style.cssText = 'padding:14px;margin:16px 0;border:1px solid #dc2626;border-radius:8px;color:#991b1b;background:#fef2f2';
            (document.querySelector('main') || document.body).prepend(aviso);
        }
        aviso.hidden = errores.size === 0;
        aviso.textContent = [...errores.values()].map(x => x.mensaje).join(' ');
    }
    function tablaError(id, mensaje) {
        const tabla = document.getElementById(id);
        if (!tabla) return;
        const celda = document.createElement('td');
        celda.colSpan = tabla.closest('table')?.querySelectorAll('thead th').length || 10;
        celda.textContent = mensaje;
        const fila = document.createElement('tr');
        fila.appendChild(celda);
        tabla.replaceChildren(fila);
    }
    function fallo(clave, error, opciones = {}) {
        console.error('Consulta no disponible:', clave, error);
        const mensaje = opciones.mensaje || 'No se pudieron consultar los datos. Recarga la página para volver a intentar.';
        errores.set(clave, {mensaje});
        if (opciones.tabla) tablaError(opciones.tabla, mensaje);
        for (const selector of opciones.indicadores || []) {
            document.querySelectorAll(selector).forEach(n => n.textContent = '—');
        }
        actualizarAviso();
    }
    function recuperar(clave) {
        errores.delete(clave);
        if (document.getElementById('estadoDatos')) actualizarAviso();
    }
    function bloqueada(clave, id) {
        if (!errores.has(clave)) return false;
        tablaError(id, errores.get(clave).mensaje);
        return true;
    }
    return {fallo, recuperar, bloqueada};
})();
