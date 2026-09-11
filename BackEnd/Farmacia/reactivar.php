<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderReactivar(int $codigo, bool $correcto, string $mensaje): never {
    http_response_code($codigo);
    echo json_encode(['correcto' => $correcto, 'mensaje' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') responderReactivar(405, false, 'Método no permitido.');
$datos = json_decode(file_get_contents('php://input'), true);
$id = filter_var($datos['id'] ?? null, FILTER_VALIDATE_INT);
if (!$id) responderReactivar(400, false, 'El identificador no es válido.');

$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $consulta = oci_parse($conexion, "UPDATE medicamento SET estado = 'ACTIVO'
        WHERE id_medicamento = :id AND estado = 'INACTIVO'");
    oci_bind_by_name($consulta, ':id', $id);
    if (!@oci_execute($consulta, OCI_NO_AUTO_COMMIT)) {
        throw new RuntimeException(oci_error($consulta)['message']);
    }
    if (oci_num_rows($consulta) === 0) {
        oci_rollback($conexion);
        responderReactivar(404, false, 'El medicamento no existe o ya está activo.');
    }
    oci_commit($conexion);
    responderReactivar(200, true, 'Medicamento reactivado correctamente.');
} catch (Throwable $error) {
    if ($conexion) oci_rollback($conexion);
    responderReactivar(500, false, 'Error al reactivar el medicamento: ' . $error->getMessage());
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
