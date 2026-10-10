# SystemSalud móvil con Oracle

Esta rama parte de main (72ac9e1) e integra la interfaz PWA con el login PHP, las sesiones y los permisos existentes.

## Despliegue

1. Usar el servidor PHP donde ya funciona la conexión Oracle del equipo.
2. Respaldar la carpeta actual y conservar BackEnd/Config/config.local.php, que no está en Git.
3. Incorporar esta rama en el servidor y mantener PHP con OCI8 y la conexión Oracle existente. No hace falta restaurar ni reemplazar la base de datos para este cambio.
4. Abrir login/login.html desde la dirección del servidor. Computadora y celular deben acceder a ese mismo servidor. Para instalar la PWA desde el celular se requiere HTTPS válido.
5. Verificar ingreso con usuarios existentes, menú según rol, cierre de sesión y operaciones permitidas.

GitHub Pages no ejecuta PHP: su enlace continúa siendo una demo separada. Esta integración no se debe publicar allí como si fuera el servidor conectado.

## Comportamiento sin conexión

No se guardan respuestas del backend ni registros en la caché PWA. Sin conexión se muestra una pantalla para reconectar. La base de datos compartida es Oracle en el servidor.

## Validación pendiente

Falta probar contra el servidor del equipo. En la Mac de preparación no existe config.local.php y PHP no tiene OCI8. Se conserva la lógica de permisos existente; la autorización de cada operación del backend debe verificarse con las cuentas de distintos roles en el servidor antes de darla por validada.
