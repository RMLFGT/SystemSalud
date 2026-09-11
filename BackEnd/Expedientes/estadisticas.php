<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderEstadisticas(int $codigo, bool $correcto, string $mensaje, array $datos = []): never {
    http_response_code($codigo);
    echo json_encode(['correcto' => $correcto, 'mensaje' => $mensaje, 'datos' => $datos], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') responderEstadisticas(405, false, 'Método no permitido.');
$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $sql = "SELECT
                (SELECT COUNT(*) FROM consulta_medica
                 WHERE estado = 'ABIERTA' AND TRIM(tratamiento) IS NOT NULL) tratamientos_activos,
                (SELECT COUNT(*) FROM estudio_laboratorio) estudios_registrados,
                (SELECT COUNT(*) FROM estudio_laboratorio WHERE estado = 'PENDIENTE') estudios_pendientes,
                (SELECT COUNT(*) FROM estudio_laboratorio WHERE estado = 'EN_PROCESO') estudios_proceso,
                (SELECT COUNT(*) FROM estudio_laboratorio WHERE estado = 'COMPLETADO') estudios_completados
            FROM dual";
    $consulta = oci_parse($conexion, $sql);
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    $fila = oci_fetch_assoc($consulta);
    responderEstadisticas(200, true, 'Estadísticas obtenidas correctamente.', [
        'tratamientosActivos' => (int)$fila['TRATAMIENTOS_ACTIVOS'],
        'estudiosRegistrados' => (int)$fila['ESTUDIOS_REGISTRADOS'],
        'estudiosPendientes' => (int)$fila['ESTUDIOS_PENDIENTES'],
        'estudiosProceso' => (int)$fila['ESTUDIOS_PROCESO'],
        'estudiosCompletados' => (int)$fila['ESTUDIOS_COMPLETADOS']
    ]);
} catch (Throwable $error) {
    responderEstadisticas(500, false, 'Error al obtener las estadísticas: ' . $error->getMessage());
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
