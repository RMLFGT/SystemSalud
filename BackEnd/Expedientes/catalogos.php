<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderCatalogos(int $codigo, bool $correcto, string $mensaje, array $datos = []): never {
    http_response_code($codigo);
    echo json_encode(['correcto' => $correcto, 'mensaje' => $mensaje, 'datos' => $datos], JSON_UNESCAPED_UNICODE);
    exit;
}

function consultarCatalogo($conexion, string $sql): array {
    $consulta = oci_parse($conexion, $sql);
    if (!oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    $filas = [];
    while ($fila = oci_fetch_assoc($consulta)) $filas[] = $fila;
    oci_free_statement($consulta);
    return $filas;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') responderCatalogos(405, false, 'Método no permitido.');
$conexion = null;
try {
    $conexion = conectarOracle();
    $pacientes = array_map(fn($fila) => [
        'id' => (int)$fila['ID_PACIENTE'],
        'idExpediente' => (int)$fila['ID_EXPEDIENTE'],
        'nombre' => trim($fila['NOMBRE'] . ' ' . $fila['APELLIDO']),
        'dpi' => $fila['DPI']
    ], consultarCatalogo($conexion, "SELECT p.id_paciente, e.id_expediente, p.nombre, p.apellido, p.dpi
                                     FROM paciente p JOIN expediente e ON e.id_paciente = p.id_paciente
                                     WHERE p.estado = 'ACTIVO' AND e.estado = 'ACTIVO'
                                     ORDER BY p.nombre, p.apellido"));
    $medicos = array_map(fn($fila) => [
        'id' => (int)$fila['ID_MEDICO'],
        'nombre' => trim($fila['NOMBRE'] . ' ' . $fila['APELLIDO']),
        'especialidad' => $fila['ESPECIALIDAD']
    ], consultarCatalogo($conexion, "SELECT m.id_medico, m.nombre, m.apellido, e.nombre especialidad
                                     FROM medico m JOIN especialidad e ON e.id_especialidad = m.id_especialidad
                                     WHERE m.estado = 'ACTIVO' ORDER BY m.nombre, m.apellido"));
    $tipos = array_map(fn($fila) => [
        'id' => (int)$fila['ID_TIPO_CONSULTA'],
        'nombre' => $fila['NOMBRE']
    ], consultarCatalogo($conexion, "SELECT id_tipo_consulta, nombre FROM tipo_consulta
                                     WHERE estado = 'ACTIVO' ORDER BY id_tipo_consulta"));
    $citas = array_map(fn($fila) => [
        'id' => (int)$fila['ID_CITA'],
        'idPaciente' => (int)$fila['ID_PACIENTE'],
        'idMedico' => (int)$fila['ID_MEDICO'],
        'paciente' => trim($fila['PACIENTE']),
        'medico' => trim($fila['MEDICO']),
        'fecha' => $fila['FECHA'],
        'hora' => $fila['HORA']
    ], consultarCatalogo($conexion, "SELECT c.id_cita, c.id_paciente, c.id_medico,
                                            TRIM(p.nombre || ' ' || p.apellido) paciente,
                                            TRIM(m.nombre || ' ' || m.apellido) medico,
                                            TO_CHAR(c.fecha_hora, 'YYYY-MM-DD') fecha,
                                            TO_CHAR(c.fecha_hora, 'HH24:MI') hora
                                     FROM cita c JOIN paciente p ON p.id_paciente = c.id_paciente
                                     JOIN medico m ON m.id_medico = c.id_medico
                                     WHERE c.estado = 'CONFIRMADA'
                                     AND NOT EXISTS (SELECT 1 FROM consulta_medica cm WHERE cm.id_cita = c.id_cita)
                                     ORDER BY c.fecha_hora"));
    responderCatalogos(200, true, 'Catálogos obtenidos correctamente.', [
        'pacientes' => $pacientes, 'medicos' => $medicos,
        'tiposConsulta' => $tipos, 'citasConfirmadas' => $citas
    ]);
} catch (Throwable $error) {
    responderCatalogos(500, false, 'Error al obtener catálogos: ' . $error->getMessage());
} finally {
    if ($conexion) oci_close($conexion);
}
