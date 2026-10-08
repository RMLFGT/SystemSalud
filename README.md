# SaludSystem

Demostración universitaria de un sistema de gestión de salud. **No está diseñado para datos reales de pacientes ni para uso clínico.** Todos los nombres y registros iniciales son ficticios.

## Ver la demostración

- [Página de presentación](https://rmlfgt.github.io/SystemSalud/presentacion.html)
- [Panel](https://rmlfgt.github.io/SystemSalud/)
- Usuario de demostración: `admin` / contraseña: `1234`

También se puede abrir `presentacion.html` localmente en un navegador moderno.

## Funcionalidad

Los módulos de pacientes, médicos, citas, expedientes, laboratorio y farmacia permiten explorar y modificar registros de ejemplo. Sus datos se guardan en **IndexedDB**, una base de datos local del navegador (`SaludSystemDemo`, versión 1). Al abrir cada módulo por primera vez se cargan los datos ficticios incluidos en el proyecto; los cambios posteriores permanecen al recargar la página, incluso si se borran todos los registros de una colección.

La base de datos es independiente en cada navegador y dispositivo. GitHub Pages no ejecuta un servidor ni una base de datos central, por lo que los registros no se sincronizan entre personas. Borrar los datos del sitio en el navegador elimina los cambios locales y restaura los ejemplos en la siguiente visita.

## Estructura

- `presentacion.html` y `presentacion.css`: página pública promocional.
- `index.html` y `index.css`: panel de administración.
- `data/db.js`: acceso a IndexedDB y carga inicial de datos.
- Carpetas de módulos: interfaz y lógica de cada área.

## Límites de esta entrega

El inicio de sesión es una simulación del lado del cliente y **no protege la información**. Los reportes e indicadores señalados como ilustrativos no se calculan a partir de todas las colecciones. Para convertir este trabajo en un sistema real harían falta backend, autenticación segura, controles de acceso, validación y sanitización completa, auditoría, copias de seguridad y cumplimiento legal aplicable.

## Comprobación rápida

1. Abra Pacientes y registre un ejemplo ficticio.
2. Recargue la página: el registro debe seguir presente.
3. Abra la misma URL en otro navegador: verá una base de datos local distinta.
