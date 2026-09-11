<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $sql = "SELECT ci.id_cita, ci.id_paciente, ci.id_medico, ci.id_clinica,
                   p.nombre || ' ' || p.apellido AS paciente,
                   m.nombre || ' ' || m.apellido AS medico,
                   es.nombre AS especialidad, cl.nombre AS clinica,
                   TO_CHAR(ci.fecha_hora, 'YYYY-MM-DD') AS fecha,
                   TO_CHAR(ci.fecha_hora, 'HH24:MI') AS hora,
                   ci.motivo, ci.estado
            FROM cita ci
            JOIN paciente p ON p.id_paciente = ci.id_paciente
            JOIN medico m ON m.id_medico = ci.id_medico
            JOIN especialidad es ON es.id_especialidad = m.id_especialidad
            JOIN clinica cl ON cl.id_clinica = ci.id_clinica
            ORDER BY ci.fecha_hora, ci.id_cita";
    $consulta = oci_parse($conexion, $sql);
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    $citas = [];
    while ($fila = oci_fetch_assoc($consulta)) {
        $citas[] = [
            'id' => (int)$fila['ID_CITA'],
            'idPaciente' => (int)$fila['ID_PACIENTE'],
            'idMedico' => (int)$fila['ID_MEDICO'],
            'idClinica' => (int)$fila['ID_CLINICA'],
            'paciente' => $fila['PACIENTE'],
            'medico' => $fila['MEDICO'],
            'especialidad' => $fila['ESPECIALIDAD'],
            'clinica' => $fila['CLINICA'],
            'fecha' => $fila['FECHA'],
            'hora' => $fila['HORA'],
            'motivo' => $fila['MOTIVO'],
            'estado' => $fila['ESTADO']
        ];
    }
    echo json_encode(['correcto' => true, 'datos' => $citas], JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['correcto' => false, 'mensaje' => 'Error al listar citas: ' . $error->getMessage()], JSON_UNESCAPED_UNICODE);
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
