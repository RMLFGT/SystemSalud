<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderDesactivarMedicamento(
    int $codigo,
    bool $correcto,
    string $mensaje
): never {
    http_response_code($codigo);
    echo json_encode([
        'correcto' => $correcto,
        'mensaje' => $mensaje
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    responderDesactivarMedicamento(405, false, 'Método no permitido.');
}

$datos = json_decode(file_get_contents('php://input'), true);

if (!is_array($datos)) {
    responderDesactivarMedicamento(
        400,
        false,
        'El contenido enviado no es válido.'
    );
}

$id = filter_var($datos['id'] ?? null, FILTER_VALIDATE_INT);

if (!$id) {
    responderDesactivarMedicamento(
        400,
        false,
        'El identificador del medicamento no es válido.'
    );
}

$conexion = null;
$consulta = null;

try {
    $conexion = conectarOracle();

    $sql = "UPDATE medicamento
            SET estado = 'INACTIVO'
            WHERE id_medicamento = :id
              AND estado = 'ACTIVO'";

    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':id', $id);

    if (!@oci_execute($consulta, OCI_NO_AUTO_COMMIT)) {
        $error = oci_error($consulta);
        throw new RuntimeException($error['message']);
    }

    if (oci_num_rows($consulta) === 0) {
        oci_rollback($conexion);
        responderDesactivarMedicamento(
            404,
            false,
            'El medicamento no existe o ya está inactivo.'
        );
    }

    oci_commit($conexion);

    responderDesactivarMedicamento(
        200,
        true,
        'Medicamento desactivado correctamente.'
    );
} catch (Throwable $error) {
    if ($conexion) {
        oci_rollback($conexion);
    }

    responderDesactivarMedicamento(
        500,
        false,
        'Error al desactivar el medicamento: ' . $error->getMessage()
    );
} finally {
    if ($consulta) {
        oci_free_statement($consulta);
    }

    if ($conexion) {
        oci_close($conexion);
    }
}
