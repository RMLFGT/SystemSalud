<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderCatalogosLaboratorio(int $codigo, bool $correcto, string $mensaje, array $datos = []): never {
    http_response_code($codigo);
    echo json_encode(['correcto' => $correcto, 'mensaje' => $mensaje, 'datos' => $datos], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') responderCatalogosLaboratorio(405, false, 'Método no permitido.');
$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $datos = ['pacientes' => [], 'medicos' => [], 'tiposEstudio' => [], 'consultas' => []];

    $sql = "SELECT p.id_paciente, p.dpi, TRIM(p.nombre || ' ' || p.apellido) nombre
            FROM paciente p JOIN expediente e ON e.id_paciente = p.id_paciente
            WHERE p.estado = 'ACTIVO' AND e.estado = 'ACTIVO'
            ORDER BY p.nombre, p.apellido";
    $consulta = oci_parse($conexion, $sql);
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    while ($fila = oci_fetch_assoc($consulta)) {
        $datos['pacientes'][] = ['id' => (int)$fila['ID_PACIENTE'], 'dpi' => $fila['DPI'], 'nombre' => $fila['NOMBRE']];
    }
    oci_free_statement($consulta);
    $consulta = null;

    $sql = "SELECT m.id_medico, TRIM(m.nombre || ' ' || m.apellido) nombre, e.nombre especialidad
            FROM medico m JOIN especialidad e ON e.id_especialidad = m.id_especialidad
            WHERE m.estado = 'ACTIVO' ORDER BY m.nombre, m.apellido";
    $consulta = oci_parse($conexion, $sql);
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    while ($fila = oci_fetch_assoc($consulta)) {
        $datos['medicos'][] = ['id' => (int)$fila['ID_MEDICO'], 'nombre' => $fila['NOMBRE'], 'especialidad' => $fila['ESPECIALIDAD']];
    }
    oci_free_statement($consulta);
    $consulta = null;

    $consulta = oci_parse($conexion, "SELECT id_tipo_estudio, nombre FROM tipo_estudio WHERE estado = 'ACTIVO' ORDER BY nombre");
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    while ($fila = oci_fetch_assoc($consulta)) {
        $datos['tiposEstudio'][] = ['id' => (int)$fila['ID_TIPO_ESTUDIO'], 'nombre' => $fila['NOMBRE']];
    }
    oci_free_statement($consulta);
    $consulta = null;

    $sql = "SELECT cm.id_consulta, e.id_paciente, cm.id_medico,
                   TO_CHAR(cm.fecha_consulta, 'YYYY-MM-DD') fecha,
                   TRIM(p.nombre || ' ' || p.apellido) paciente,
                   TRIM(m.nombre || ' ' || m.apellido) medico
            FROM consulta_medica cm
            JOIN expediente e ON e.id_expediente = cm.id_expediente
            JOIN paciente p ON p.id_paciente = e.id_paciente
            JOIN medico m ON m.id_medico = cm.id_medico
            WHERE e.estado = 'ACTIVO' AND p.estado = 'ACTIVO'
            ORDER BY cm.fecha_consulta DESC, cm.id_consulta DESC";
    $consulta = oci_parse($conexion, $sql);
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    while ($fila = oci_fetch_assoc($consulta)) {
        $datos['consultas'][] = [
            'id' => (int)$fila['ID_CONSULTA'], 'idPaciente' => (int)$fila['ID_PACIENTE'],
            'idMedico' => (int)$fila['ID_MEDICO'], 'fecha' => $fila['FECHA'],
            'paciente' => $fila['PACIENTE'], 'medico' => $fila['MEDICO']
        ];
    }
    responderCatalogosLaboratorio(200, true, 'Catálogos obtenidos correctamente.', $datos);
} catch (Throwable $error) {
    responderCatalogosLaboratorio(500, false, 'Error al obtener los catálogos: ' . $error->getMessage());
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
