<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderHistorial(int $codigo, bool $correcto, string $mensaje, array $datos = []): never {
    http_response_code($codigo);
    echo json_encode(['correcto' => $correcto, 'mensaje' => $mensaje, 'datos' => $datos], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') responderHistorial(405, false, 'Método no permitido.');
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$id) responderHistorial(400, false, 'El identificador del expediente no es válido.');
$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $sql = "SELECT e.id_expediente, e.id_paciente, TO_CHAR(e.fecha_apertura, 'YYYY-MM-DD') fecha_apertura,
                   e.observaciones_generales, e.estado, p.dpi, p.nombre, p.apellido,
                   TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') fecha_nacimiento,
                   TRUNC(MONTHS_BETWEEN(SYSDATE, p.fecha_nacimiento) / 12) edad,
                   p.sexo, p.telefono, p.correo
            FROM expediente e JOIN paciente p ON p.id_paciente = e.id_paciente
            WHERE e.id_expediente = :id";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':id', $id);
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    $fila = oci_fetch_assoc($consulta);
    oci_free_statement($consulta);
    $consulta = null;
    if (!$fila) responderHistorial(404, false, 'El expediente no existe.');
    $expediente = [
        'id' => (int)$fila['ID_EXPEDIENTE'], 'idPaciente' => (int)$fila['ID_PACIENTE'],
        'paciente' => trim($fila['NOMBRE'] . ' ' . $fila['APELLIDO']), 'dpi' => $fila['DPI'],
        'fechaNacimiento' => $fila['FECHA_NACIMIENTO'], 'edad' => (int)$fila['EDAD'],
        'sexo' => $fila['SEXO'], 'telefono' => $fila['TELEFONO'], 'correo' => $fila['CORREO'],
        'fechaApertura' => $fila['FECHA_APERTURA'], 'observacionesGenerales' => $fila['OBSERVACIONES_GENERALES'] ?? '',
        'estado' => $fila['ESTADO'], 'consultas' => []
    ];
    $sql = "SELECT cm.id_consulta, cm.id_cita, cm.id_medico, cm.id_tipo_consulta,
                   TO_CHAR(cm.fecha_consulta, 'YYYY-MM-DD') fecha,
                   TO_CHAR(cm.fecha_consulta, 'HH24:MI') hora,
                   cm.diagnostico, cm.sintomas, cm.tratamiento, cm.observaciones,
                   cm.presion_sistolica, cm.presion_diastolica, cm.frecuencia_cardiaca,
                   cm.temperatura, cm.peso, cm.estado,
                   TRIM(m.nombre || ' ' || m.apellido) medico, tc.nombre tipo
            FROM consulta_medica cm JOIN medico m ON m.id_medico = cm.id_medico
            JOIN tipo_consulta tc ON tc.id_tipo_consulta = cm.id_tipo_consulta
            WHERE cm.id_expediente = :id ORDER BY cm.fecha_consulta DESC, cm.id_consulta DESC";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':id', $id);
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    while ($fila = oci_fetch_assoc($consulta)) {
        $expediente['consultas'][] = [
            'id' => (int)$fila['ID_CONSULTA'], 'idCita' => $fila['ID_CITA'] === null ? null : (int)$fila['ID_CITA'],
            'idMedico' => (int)$fila['ID_MEDICO'], 'idTipoConsulta' => (int)$fila['ID_TIPO_CONSULTA'],
            'fecha' => $fila['FECHA'], 'hora' => $fila['HORA'], 'medico' => $fila['MEDICO'],
            'tipo' => $fila['TIPO'], 'diagnostico' => $fila['DIAGNOSTICO'],
            'sintomas' => $fila['SINTOMAS'] ?? '', 'tratamiento' => $fila['TRATAMIENTO'] ?? '',
            'observaciones' => $fila['OBSERVACIONES'] ?? '',
            'presion' => $fila['PRESION_SISTOLICA'] === null ? '' : $fila['PRESION_SISTOLICA'] . '/' . $fila['PRESION_DIASTOLICA'],
            'frecuencia' => $fila['FRECUENCIA_CARDIACA'], 'temperatura' => $fila['TEMPERATURA'],
            'peso' => $fila['PESO'], 'estado' => $fila['ESTADO']
        ];
    }
    responderHistorial(200, true, 'Historial obtenido correctamente.', $expediente);
} catch (Throwable $error) {
    responderHistorial(500, false, 'Error al obtener el historial: ' . $error->getMessage());
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
