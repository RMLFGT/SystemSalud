<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderActualizarEstudio(int $codigo, bool $correcto, string $mensaje): never {
    http_response_code($codigo);
    echo json_encode(['correcto' => $correcto, 'mensaje' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') responderActualizarEstudio(405, false, 'Método no permitido.');
$datos = json_decode(file_get_contents('php://input'), true);
if (!is_array($datos)) responderActualizarEstudio(400, false, 'El contenido enviado no es válido.');
$id = filter_var($datos['id'] ?? null, FILTER_VALIDATE_INT);
$resultado = trim((string)($datos['resultado'] ?? ''));
$observaciones = trim((string)($datos['observaciones'] ?? ''));
$estado = strtoupper(trim((string)($datos['estado'] ?? '')));
if (!$id || !in_array($estado, ['PENDIENTE', 'EN_PROCESO', 'COMPLETADO'], true)) responderActualizarEstudio(400, false, 'El estudio o el estado no es válido.');
if (mb_strlen($resultado) > 4000 || mb_strlen($observaciones) > 1000) responderActualizarEstudio(400, false, 'El resultado o las observaciones superan la longitud permitida.');
if ($estado === 'COMPLETADO' && $resultado === '') responderActualizarEstudio(400, false, 'Debe ingresar el resultado antes de completar el estudio.');

$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $consulta = oci_parse($conexion, 'SELECT estado FROM estudio_laboratorio WHERE id_estudio = :id');
    oci_bind_by_name($consulta, ':id', $id);
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    $actual = oci_fetch_assoc($consulta);
    oci_free_statement($consulta);
    $consulta = null;
    if (!$actual) responderActualizarEstudio(404, false, 'El estudio de laboratorio no existe.');

    $sql = "UPDATE estudio_laboratorio
            SET resultado = CASE WHEN :estado = 'PENDIENTE' THEN NULL ELSE :resultado END,
                observaciones = :observaciones,
                estado = :estado,
                fecha_resultado = CASE
                    WHEN :estado = 'COMPLETADO' THEN
                        CASE
                            WHEN fecha_resultado IS NOT NULL
                                 AND fecha_resultado >= fecha_solicitud
                                THEN fecha_resultado
                            WHEN CAST(SYSTIMESTAMP AS TIMESTAMP) >= fecha_solicitud
                                THEN CAST(SYSTIMESTAMP AS TIMESTAMP)
                            ELSE fecha_solicitud
                        END
                    ELSE NULL
                END
            WHERE id_estudio = :id";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':resultado', $resultado);
    oci_bind_by_name($consulta, ':observaciones', $observaciones);
    oci_bind_by_name($consulta, ':estado', $estado);
    oci_bind_by_name($consulta, ':id', $id);
    if (!@oci_execute($consulta, OCI_NO_AUTO_COMMIT)) throw new RuntimeException(oci_error($consulta)['message']);
    oci_commit($conexion);
    responderActualizarEstudio(200, true, 'Estudio de laboratorio actualizado correctamente.');
} catch (Throwable $error) {
    if ($conexion) oci_rollback($conexion);
    responderActualizarEstudio(500, false, 'Error al actualizar el estudio: ' . $error->getMessage());
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
