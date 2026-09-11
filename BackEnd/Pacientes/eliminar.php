<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responder(int $codigo, bool $correcto, string $mensaje): never {
    http_response_code($codigo);
    echo json_encode(['correcto' => $correcto, 'mensaje' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') responder(405, false, 'Método no permitido.');

$entrada = json_decode(file_get_contents('php://input'), true);
$id = filter_var($entrada['id'] ?? null, FILTER_VALIDATE_INT);
if (!$id || $id < 1) responder(400, false, 'El identificador del paciente no es válido.');

$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $sql = "UPDATE paciente SET estado = 'INACTIVO' WHERE id_paciente = :id AND estado <> 'INACTIVO'";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':id', $id);
    if (!oci_execute($consulta, OCI_NO_AUTO_COMMIT)) {
        $error = oci_error($consulta);
        throw new RuntimeException($error['message'] ?? 'No fue posible actualizar al paciente.');
    }
    if (oci_num_rows($consulta) === 0) {
        oci_rollback($conexion);
        responder(404, false, 'El paciente no existe o ya está inactivo.');
    }
    oci_commit($conexion);
    responder(200, true, 'Paciente desactivado correctamente.');
} catch (Throwable $error) {
    if ($conexion) oci_rollback($conexion);
    responder(500, false, 'Error al desactivar el paciente: ' . $error->getMessage());
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
