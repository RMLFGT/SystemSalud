<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderEstadoExpediente(int $codigo, bool $correcto, string $mensaje): never {
    http_response_code($codigo);
    echo json_encode(['correcto' => $correcto, 'mensaje' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') responderEstadoExpediente(405, false, 'Método no permitido.');
$datos = json_decode(file_get_contents('php://input'), true);
if (!is_array($datos)) responderEstadoExpediente(400, false, 'El contenido enviado no es válido.');
$id = filter_var($datos['id'] ?? null, FILTER_VALIDATE_INT);
$estado = strtoupper(trim((string)($datos['estado'] ?? '')));
if (!$id || !in_array($estado, ['ACTIVO', 'CERRADO'], true)) responderEstadoExpediente(400, false, 'El expediente o el estado no es válido.');

$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $consulta = oci_parse($conexion, 'SELECT estado FROM expediente WHERE id_expediente = :id FOR UPDATE');
    oci_bind_by_name($consulta, ':id', $id);
    if (!@oci_execute($consulta, OCI_NO_AUTO_COMMIT)) throw new RuntimeException(oci_error($consulta)['message']);
    $actual = oci_fetch_assoc($consulta);
    oci_free_statement($consulta);
    $consulta = null;
    if (!$actual) responderEstadoExpediente(404, false, 'El expediente no existe.');
    if ($actual['ESTADO'] === $estado) responderEstadoExpediente(409, false, $estado === 'ACTIVO' ? 'El expediente ya está activo.' : 'El expediente ya está cerrado.');

    if ($estado === 'CERRADO') {
        $consulta = oci_parse($conexion, "SELECT COUNT(*) total FROM consulta_medica WHERE id_expediente = :id AND estado = 'ABIERTA'");
        oci_bind_by_name($consulta, ':id', $id);
        if (!@oci_execute($consulta, OCI_NO_AUTO_COMMIT)) throw new RuntimeException(oci_error($consulta)['message']);
        $abiertas = oci_fetch_assoc($consulta);
        oci_free_statement($consulta);
        $consulta = null;
        if ((int)$abiertas['TOTAL'] > 0) responderEstadoExpediente(409, false, 'No se puede cerrar el expediente porque tiene consultas abiertas. Finalícelas primero.');
    }

    $consulta = oci_parse($conexion, 'UPDATE expediente SET estado = :estado WHERE id_expediente = :id');
    oci_bind_by_name($consulta, ':estado', $estado);
    oci_bind_by_name($consulta, ':id', $id);
    if (!@oci_execute($consulta, OCI_NO_AUTO_COMMIT)) throw new RuntimeException(oci_error($consulta)['message']);
    oci_commit($conexion);
    responderEstadoExpediente(200, true, $estado === 'ACTIVO' ? 'Expediente reabierto correctamente.' : 'Expediente cerrado correctamente.');
} catch (Throwable $error) {
    if ($conexion) oci_rollback($conexion);
    responderEstadoExpediente(500, false, 'Error al cambiar el estado del expediente: ' . $error->getMessage());
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
