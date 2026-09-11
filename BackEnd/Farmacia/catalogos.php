<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderCatalogosFarmacia(
    int $codigo,
    bool $correcto,
    string $mensaje,
    array $categorias = []
): never {
    http_response_code($codigo);

    echo json_encode([
        'correcto' => $correcto,
        'mensaje' => $mensaje,
        'categorias' => $categorias
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    responderCatalogosFarmacia(405, false, 'Método no permitido.');
}

$conexion = null;
$consulta = null;

try {
    $conexion = conectarOracle();

    $sql = "SELECT id_categoria,
                   nombre,
                   descripcion
            FROM categoria_medicamento
            WHERE estado = 'ACTIVO'
            ORDER BY nombre";

    $consulta = oci_parse($conexion, $sql);

    if (!@oci_execute($consulta)) {
        $error = oci_error($consulta);
        throw new RuntimeException($error['message']);
    }

    $categorias = [];

    while ($fila = oci_fetch_assoc($consulta)) {
        $categorias[] = [
            'id' => (int)$fila['ID_CATEGORIA'],
            'nombre' => $fila['NOMBRE'],
            'descripcion' => $fila['DESCRIPCION'] ?? ''
        ];
    }

    responderCatalogosFarmacia(
        200,
        true,
        'Categorías obtenidas correctamente.',
        $categorias
    );
} catch (Throwable $error) {
    responderCatalogosFarmacia(
        500,
        false,
        'Error al obtener las categorías: ' . $error->getMessage()
    );
} finally {
    if ($consulta) {
        oci_free_statement($consulta);
    }

    if ($conexion) {
        oci_close($conexion);
    }
}
