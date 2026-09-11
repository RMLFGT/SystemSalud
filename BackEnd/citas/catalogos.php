<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $datos = ['pacientes' => [], 'medicos' => []];
    $consulta = oci_parse($conexion, "SELECT id_paciente, nombre || ' ' || apellido AS nombre FROM paciente WHERE estado = 'ACTIVO' ORDER BY nombre, apellido");
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    while ($fila = oci_fetch_assoc($consulta)) $datos['pacientes'][] = ['id' => (int)$fila['ID_PACIENTE'], 'nombre' => $fila['NOMBRE']];
    oci_free_statement($consulta);
    $consulta = oci_parse($conexion, "SELECT m.id_medico, m.nombre || ' ' || m.apellido AS nombre, e.nombre AS especialidad FROM medico m JOIN especialidad e ON e.id_especialidad = m.id_especialidad WHERE m.estado = 'ACTIVO' ORDER BY m.nombre, m.apellido");
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    while ($fila = oci_fetch_assoc($consulta)) $datos['medicos'][] = ['id' => (int)$fila['ID_MEDICO'], 'nombre' => $fila['NOMBRE'], 'especialidad' => $fila['ESPECIALIDAD']];
    echo json_encode(['correcto' => true, 'datos' => $datos], JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['correcto' => false, 'mensaje' => 'Error al cargar catálogos: ' . $error->getMessage()], JSON_UNESCAPED_UNICODE);
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
