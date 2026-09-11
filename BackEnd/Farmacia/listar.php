<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderFarmacia(
    int $codigo,
    bool $correcto,
    string $mensaje,
    array $datos = [],
    array $resumen = []
): never {
    http_response_code($codigo);

    echo json_encode([
        'correcto' => $correcto,
        'mensaje' => $mensaje,
        'datos' => $datos,
        'resumen' => $resumen
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    responderFarmacia(405, false, 'Método no permitido.');
}

$estadoFiltro = strtoupper(trim((string)($_GET['estado'] ?? 'ACTIVO')));
if (!in_array($estadoFiltro, ['ACTIVO', 'INACTIVO'], true)) {
    responderFarmacia(400, false, 'El estado solicitado no es válido.');
}

$conexion = null;
$consulta = null;

try {
    $conexion = conectarOracle();

    $sql = "SELECT m.id_medicamento,
                   m.id_categoria,
                   m.nombre,
                   m.presentacion,
                   m.laboratorio_fabricante,
                   m.stock,
                   m.stock_minimo,
                   TO_CHAR(
                       m.precio,
                       'FM9999999990D00',
                       'NLS_NUMERIC_CHARACTERS=''.,'''
                   ) AS precio,
                   TO_CHAR(m.fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
                   m.descripcion,
                   m.estado,
                   TO_CHAR(m.fecha_registro, 'YYYY-MM-DD HH24:MI') AS fecha_registro,
                   c.nombre AS categoria
            FROM medicamento m
            JOIN categoria_medicamento c
              ON c.id_categoria = m.id_categoria
            WHERE m.estado = :estado
            ORDER BY m.nombre, m.id_medicamento";

    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':estado', $estadoFiltro);

    if (!@oci_execute($consulta)) {
        $error = oci_error($consulta);
        throw new RuntimeException($error['message']);
    }

    $medicamentos = [];
    $resumen = [
        'total' => 0,
        'stockTotal' => 0,
        'stockBajo' => 0,
        'agotados' => 0,
        'valorInventario' => 0.0
    ];

    while ($fila = oci_fetch_assoc($consulta)) {
        $stock = (int)$fila['STOCK'];
        $stockMinimo = (int)$fila['STOCK_MINIMO'];
        $precioTexto = str_replace(
            ',',
            '.',
            trim((string)$fila['PRECIO'])
        );
        $precio = (float)$precioTexto;

        if ($stock === 0) {
            $disponibilidad = 'AGOTADO';
            $resumen['agotados']++;
        } elseif ($stock <= $stockMinimo) {
            $disponibilidad = 'STOCK_BAJO';
            $resumen['stockBajo']++;
        } else {
            $disponibilidad = 'DISPONIBLE';
        }

        $medicamentos[] = [
            'id' => (int)$fila['ID_MEDICAMENTO'],
            'idCategoria' => (int)$fila['ID_CATEGORIA'],
            'nombre' => $fila['NOMBRE'],
            'categoria' => $fila['CATEGORIA'],
            'presentacion' => $fila['PRESENTACION'],
            'laboratorio' => $fila['LABORATORIO_FABRICANTE'] ?? '',
            'stock' => $stock,
            'stockMinimo' => $stockMinimo,
            'precio' => $precio,
            'fechaVencimiento' => $fila['FECHA_VENCIMIENTO'],
            'descripcion' => $fila['DESCRIPCION'] ?? '',
            'estado' => $fila['ESTADO'],
            'disponibilidad' => $disponibilidad,
            'fechaRegistro' => $fila['FECHA_REGISTRO']
        ];

        $resumen['total']++;
        $resumen['stockTotal'] += $stock;
        $resumen['valorInventario'] += $stock * $precio;
    }

    $resumen['valorInventario'] = round($resumen['valorInventario'], 2);

    responderFarmacia(
        200,
        true,
        'Medicamentos obtenidos correctamente.',
        $medicamentos,
        $resumen
    );
} catch (Throwable $error) {
    responderFarmacia(
        500,
        false,
        'Error al obtener los medicamentos: ' . $error->getMessage()
    );
} finally {
    if ($consulta) {
        oci_free_statement($consulta);
    }

    if ($conexion) {
        oci_close($conexion);
    }
}
