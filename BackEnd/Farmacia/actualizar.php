<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderActualizarMedicamento(
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
    responderActualizarMedicamento(405, false, 'Método no permitido.');
}

$datos = json_decode(file_get_contents('php://input'), true);

if (!is_array($datos)) {
    responderActualizarMedicamento(400, false, 'El contenido enviado no es válido.');
}

$id = filter_var($datos['id'] ?? null, FILTER_VALIDATE_INT);
$idCategoria = filter_var($datos['idCategoria'] ?? null, FILTER_VALIDATE_INT);
$nombre = strtoupper(trim((string)($datos['nombre'] ?? '')));
$presentacion = strtoupper(trim((string)($datos['presentacion'] ?? '')));
$laboratorio = strtoupper(trim((string)($datos['laboratorio'] ?? '')));
$descripcion = trim((string)($datos['descripcion'] ?? ''));
$fechaVencimiento = trim((string)($datos['fechaVencimiento'] ?? ''));
$stock = filter_var(
    $datos['stock'] ?? null,
    FILTER_VALIDATE_INT,
    ['options' => ['min_range' => 0]]
);
$stockMinimo = filter_var(
    $datos['stockMinimo'] ?? null,
    FILTER_VALIDATE_INT,
    ['options' => ['min_range' => 0]]
);
$precio = filter_var($datos['precio'] ?? null, FILTER_VALIDATE_FLOAT);

if (!$id || !$idCategoria || $nombre === '' || $presentacion === '') {
    responderActualizarMedicamento(
        400,
        false,
        'Medicamento, categoría, nombre y presentación son obligatorios.'
    );
}

if ($stock === false || $stockMinimo === false) {
    responderActualizarMedicamento(
        400,
        false,
        'Stock y stock mínimo deben ser enteros mayores o iguales a cero.'
    );
}

if ($precio === false || $precio < 0) {
    responderActualizarMedicamento(
        400,
        false,
        'El precio debe ser un número mayor o igual a cero.'
    );
}

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaVencimiento)) {
    responderActualizarMedicamento(400, false, 'La fecha de vencimiento no es válida.');
}

$fechaObjeto = DateTimeImmutable::createFromFormat('!Y-m-d', $fechaVencimiento);
$erroresFecha = DateTimeImmutable::getLastErrors();

if (
    !$fechaObjeto ||
    (
        is_array($erroresFecha) &&
        ($erroresFecha['warning_count'] > 0 || $erroresFecha['error_count'] > 0)
    )
) {
    responderActualizarMedicamento(400, false, 'La fecha de vencimiento no es válida.');
}

if (mb_strlen($nombre) > 120 || mb_strlen($presentacion) > 120) {
    responderActualizarMedicamento(
        400,
        false,
        'El nombre o la presentación superan los 120 caracteres.'
    );
}

if (mb_strlen($laboratorio) > 120 || mb_strlen($descripcion) > 1000) {
    responderActualizarMedicamento(
        400,
        false,
        'El laboratorio o la descripción superan la longitud permitida.'
    );
}

$conexion = null;
$consulta = null;

try {
    $conexion = conectarOracle();

    $sql = "SELECT COUNT(*) AS total
            FROM medicamento
            WHERE id_medicamento = :id
              AND estado = 'ACTIVO'";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':id', $id);

    if (!@oci_execute($consulta)) {
        throw new RuntimeException(oci_error($consulta)['message']);
    }

    $existencia = oci_fetch_assoc($consulta);
    oci_free_statement($consulta);
    $consulta = null;

    if ((int)$existencia['TOTAL'] === 0) {
        responderActualizarMedicamento(
            404,
            false,
            'El medicamento no existe o está inactivo.'
        );
    }

    $sql = "SELECT COUNT(*) AS total
            FROM categoria_medicamento
            WHERE id_categoria = :categoria
              AND estado = 'ACTIVO'";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':categoria', $idCategoria);

    if (!@oci_execute($consulta)) {
        throw new RuntimeException(oci_error($consulta)['message']);
    }

    $categoria = oci_fetch_assoc($consulta);
    oci_free_statement($consulta);
    $consulta = null;

    if ((int)$categoria['TOTAL'] === 0) {
        responderActualizarMedicamento(
            409,
            false,
            'La categoría seleccionada no existe o está inactiva.'
        );
    }

    $sql = "SELECT COUNT(*) AS total
            FROM medicamento
            WHERE id_medicamento <> :id
              AND UPPER(nombre) = :nombre
              AND UPPER(presentacion) = :presentacion
              AND NVL(UPPER(laboratorio_fabricante), '#') =
                  NVL(NULLIF(:laboratorio, ''), '#')";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':id', $id);
    oci_bind_by_name($consulta, ':nombre', $nombre);
    oci_bind_by_name($consulta, ':presentacion', $presentacion);
    oci_bind_by_name($consulta, ':laboratorio', $laboratorio);

    if (!@oci_execute($consulta)) {
        throw new RuntimeException(oci_error($consulta)['message']);
    }

    $duplicado = oci_fetch_assoc($consulta);
    oci_free_statement($consulta);
    $consulta = null;

    if ((int)$duplicado['TOTAL'] > 0) {
        responderActualizarMedicamento(
            409,
            false,
            'Ya existe otro medicamento con el mismo nombre, presentación y laboratorio.'
        );
    }

    $sql = "UPDATE medicamento
            SET id_categoria = :categoria,
                nombre = :nombre,
                presentacion = :presentacion,
                laboratorio_fabricante = NULLIF(:laboratorio, ''),
                stock = :stock,
                stock_minimo = :stock_minimo,
                precio = TO_NUMBER(
                    :precio,
                    'FM9999999990D00',
                    'NLS_NUMERIC_CHARACTERS=''.,'''
                ),
                fecha_vencimiento = TO_DATE(
                    :fecha_vencimiento,
                    'YYYY-MM-DD'
                ),
                descripcion = NULLIF(:descripcion, '')
            WHERE id_medicamento = :id
              AND estado = 'ACTIVO'";

    $precioOracle = number_format((float)$precio, 2, '.', '');
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':categoria', $idCategoria);
    oci_bind_by_name($consulta, ':nombre', $nombre);
    oci_bind_by_name($consulta, ':presentacion', $presentacion);
    oci_bind_by_name($consulta, ':laboratorio', $laboratorio);
    oci_bind_by_name($consulta, ':stock', $stock);
    oci_bind_by_name($consulta, ':stock_minimo', $stockMinimo);
    oci_bind_by_name($consulta, ':precio', $precioOracle);
    oci_bind_by_name($consulta, ':fecha_vencimiento', $fechaVencimiento);
    oci_bind_by_name($consulta, ':descripcion', $descripcion);
    oci_bind_by_name($consulta, ':id', $id);

    if (!@oci_execute($consulta, OCI_NO_AUTO_COMMIT)) {
        throw new RuntimeException(oci_error($consulta)['message']);
    }

    oci_commit($conexion);
    responderActualizarMedicamento(
        200,
        true,
        'Medicamento actualizado correctamente.'
    );
} catch (Throwable $error) {
    if ($conexion) {
        oci_rollback($conexion);
    }

    responderActualizarMedicamento(
        500,
        false,
        'Error al actualizar el medicamento: ' . $error->getMessage()
    );
} finally {
    if ($consulta) {
        oci_free_statement($consulta);
    }

    if ($conexion) {
        oci_close($conexion);
    }
}
