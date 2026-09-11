<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderEstado(int $codigo, bool $correcto, string $mensaje): never {
    http_response_code($codigo);
    echo json_encode(['correcto' => $correcto, 'mensaje' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'PATCH') responderEstado(405, false, 'Método no permitido.');
$datos = json_decode(file_get_contents('php://input'), true);
$id = filter_var($datos['id'] ?? null, FILTER_VALIDATE_INT);
$estado = strtoupper(trim($datos['estado'] ?? ''));
if (!$id || !in_array($estado, ['ACTIVO', 'INACTIVO'], true)) responderEstado(400, false, 'El médico o el estado no son válidos.');

$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $consulta = oci_parse($conexion, "UPDATE medico SET estado = :estado WHERE id_medico = :id AND estado <> :estado");
    oci_bind_by_name($consulta, ':estado', $estado, 10);
    oci_bind_by_name($consulta, ':id', $id);
    if (!@oci_execute($consulta, OCI_NO_AUTO_COMMIT)) throw new RuntimeException(oci_error($consulta)['message']);
    if (oci_num_rows($consulta) === 0) throw new RuntimeException('El médico no existe o ya tiene ese estado.');
    oci_free_statement($consulta);
    $consulta = oci_parse($conexion, "UPDATE horario_medico SET estado = :estado WHERE id_medico = :id");
    oci_bind_by_name($consulta, ':estado', $estado, 10);
    oci_bind_by_name($consulta, ':id', $id);
    if (!@oci_execute($consulta, OCI_NO_AUTO_COMMIT)) throw new RuntimeException(oci_error($consulta)['message']);
    oci_commit($conexion);
    $accion = $estado === 'ACTIVO' ? 'reactivado' : 'desactivado';
    responderEstado(200, true, "Médico $accion correctamente.");
} catch (Throwable $error) {
    if ($conexion) oci_rollback($conexion);
    responderEstado(500, false, 'Error al cambiar el estado: ' . $error->getMessage());
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
