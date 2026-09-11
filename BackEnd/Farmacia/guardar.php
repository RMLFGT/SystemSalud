<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderGuardarMedicamento(
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderGuardarMedicamento(405, false, 'Método no permitido.');
}

$datos = json_decode(file_get_contents('php://input'), true);

if (!is_array($datos)) {
    responderGuardarMedicamento(400, false, 'El contenido enviado no es válido.');
}

$idCategoria = filter_var(
    $datos['idCategoria'] ?? null,
    FILTER_VALIDATE_INT
);

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

$precioRecibido = $datos['precio'] ?? null;
$precio = filter_var($precioRecibido, FILTER_VALIDATE_FLOAT);

if (!$idCategoria || $nombre === '' || $presentacion === '') {
    responderGuardarMedicamento(
        400,
        false,
        'Categoría, nombre y presentación son obligatorios.'
    );
}

if ($stock === false || $stockMinimo === false) {
    responderGuardarMedicamento(
        400,
        false,
        'Stock y stock mínimo deben ser números enteros mayores o iguales a cero.'
    );
}

if ($precio === false || $precio < 0) {
    responderGuardarMedicamento(
        400,
        false,
        'El precio debe ser un número mayor o igual a cero.'
    );
}

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaVencimiento)) {
    responderGuardarMedicamento(
        400,
        false,
        'La fecha de vencimiento no es válida.'
    );
}

$fechaObjeto = DateTimeImmutable::createFromFormat(
    '!Y-m-d',
    $fechaVencimiento
);

$erroresFecha = DateTimeImmutable::getLastErrors();

if (
    !$fechaObjeto ||
    (
        is_array($erroresFecha) &&
        ($erroresFecha['warning_count'] > 0 || $erroresFecha['error_count'] > 0)
    )
) {
    responderGuardarMedicamento(
        400,
        false,
        'La fecha de vencimiento no es válida.'
    );
}

if (mb_strlen($nombre) > 120 || mb_strlen($presentacion) > 120) {
    responderGuardarMedicamento(
        400,
        false,
        'El nombre o la presentación superan los 120 caracteres.'
    );
}

if (mb_strlen($laboratorio) > 120) {
    responderGuardarMedicamento(
        400,
        false,
        'El laboratorio fabricante supera los 120 caracteres.'
    );
}

if (mb_strlen($descripcion) > 1000) {
    responderGuardarMedicamento(
        400,
        false,
        'La descripción supera los 1000 caracteres.'
    );
}

$conexion = null;
$consulta = null;

try {
    $conexion = conectarOracle();

    $sql = "SELECT COUNT(*) AS total
            FROM categoria_medicamento
            WHERE id_categoria = :id_categoria
              AND estado = 'ACTIVO'";

    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':id_categoria', $idCategoria);

    if (!@oci_execute($consulta)) {
        $error = oci_error($consulta);
        throw new RuntimeException($error['message']);
    }

    $categoria = oci_fetch_assoc($consulta);
    oci_free_statement($consulta);
    $consulta = null;

    if ((int)$categoria['TOTAL'] === 0) {
        responderGuardarMedicamento(
            409,
            false,
            'La categoría seleccionada no existe o está inactiva.'
        );
    }

    $sql = "SELECT COUNT(*) AS total
            FROM medicamento
            WHERE UPPER(nombre) = :nombre
              AND UPPER(presentacion) = :presentacion
              AND NVL(UPPER(laboratorio_fabricante), '#') =
                  NVL(NULLIF(:laboratorio, ''), '#')";

    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':nombre', $nombre);
    oci_bind_by_name($consulta, ':presentacion', $presentacion);
    oci_bind_by_name($consulta, ':laboratorio', $laboratorio);

    if (!@oci_execute($consulta)) {
        $error = oci_error($consulta);
        throw new RuntimeException($error['message']);
    }

    $duplicado = oci_fetch_assoc($consulta);
    oci_free_statement($consulta);
    $consulta = null;

    if ((int)$duplicado['TOTAL'] > 0) {
        responderGuardarMedicamento(
            409,
            false,
            'Ya existe un medicamento con el mismo nombre, presentación y laboratorio.'
        );
    }

    $sql = "INSERT INTO medicamento (
                id_categoria,
                nombre,
                presentacion,
                laboratorio_fabricante,
                stock,
                stock_minimo,
                precio,
                fecha_vencimiento,
                descripcion,
                estado,
                fecha_registro
            ) VALUES (
                :id_categoria,
                :nombre,
                :presentacion,
                NULLIF(:laboratorio, ''),
                :stock,
                :stock_minimo,
                TO_NUMBER(
                    :precio,
                    'FM9999999990D00',
                    'NLS_NUMERIC_CHARACTERS=''.,'''
                ),
                TO_DATE(:fecha_vencimiento, 'YYYY-MM-DD'),
                NULLIF(:descripcion, ''),
                'ACTIVO',
                SYSTIMESTAMP
            )";

    $precioOracle = number_format((float)$precio, 2, '.', '');

    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':id_categoria', $idCategoria);
    oci_bind_by_name($consulta, ':nombre', $nombre);
    oci_bind_by_name($consulta, ':presentacion', $presentacion);
    oci_bind_by_name($consulta, ':laboratorio', $laboratorio);
    oci_bind_by_name($consulta, ':stock', $stock);
    oci_bind_by_name($consulta, ':stock_minimo', $stockMinimo);
    oci_bind_by_name($consulta, ':precio', $precioOracle);
    oci_bind_by_name($consulta, ':fecha_vencimiento', $fechaVencimiento);
    oci_bind_by_name($consulta, ':descripcion', $descripcion);

    if (!@oci_execute($consulta, OCI_NO_AUTO_COMMIT)) {
        $error = oci_error($consulta);
        throw new RuntimeException($error['message']);
    }

    oci_commit($conexion);

    responderGuardarMedicamento(
        201,
        true,
        'Medicamento registrado correctamente.'
    );
} catch (Throwable $error) {
    if ($conexion) {
        oci_rollback($conexion);
    }

    responderGuardarMedicamento(
        500,
        false,
        'Error al registrar el medicamento: ' . $error->getMessage()
    );
} finally {
    if ($consulta) {
        oci_free_statement($consulta);
    }

    if ($conexion) {
        oci_close($conexion);
    }
}
