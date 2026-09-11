<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $datos = ['especialidades' => [], 'clinicas' => []];
    $consulta = oci_parse($conexion, "SELECT id_especialidad, nombre FROM especialidad WHERE estado = 'ACTIVO' ORDER BY nombre");
    oci_execute($consulta);
    while ($fila = oci_fetch_assoc($consulta)) $datos['especialidades'][] = ['id' => (int)$fila['ID_ESPECIALIDAD'], 'nombre' => $fila['NOMBRE']];
    oci_free_statement($consulta);
    $consulta = oci_parse($conexion, "SELECT id_clinica, codigo_clinica, nombre FROM clinica WHERE estado = 'ACTIVO' ORDER BY codigo_clinica");
    oci_execute($consulta);
    while ($fila = oci_fetch_assoc($consulta)) $datos['clinicas'][] = ['id' => (int)$fila['ID_CLINICA'], 'codigo' => $fila['CODIGO_CLINICA'], 'nombre' => $fila['NOMBRE']];
    echo json_encode(['correcto' => true, 'datos' => $datos], JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['correcto' => false, 'mensaje' => 'Error al cargar catálogos: ' . $error->getMessage()], JSON_UNESCAPED_UNICODE);
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
