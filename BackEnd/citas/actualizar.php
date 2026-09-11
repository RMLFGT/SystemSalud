<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderActualizacionCita(int $codigo, bool $correcto, string $mensaje): never {
    http_response_code($codigo);
    echo json_encode(['correcto' => $correcto, 'mensaje' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') responderActualizacionCita(405, false, 'Método no permitido.');
$datos = json_decode(file_get_contents('php://input'), true);
$id = filter_var($datos['id'] ?? null, FILTER_VALIDATE_INT);
$idPaciente = filter_var($datos['idPaciente'] ?? null, FILTER_VALIDATE_INT);
$idMedico = filter_var($datos['idMedico'] ?? null, FILTER_VALIDATE_INT);
$fechaTexto = trim($datos['fecha'] ?? '');
$hora = trim($datos['hora'] ?? '');
$motivo = trim($datos['motivo'] ?? '');
$estado = strtoupper(trim($datos['estado'] ?? ''));
$fecha = DateTime::createFromFormat('Y-m-d', $fechaTexto);
if (!$id || !$idPaciente || !$idMedico || !$fecha || !preg_match('/^\d{2}:\d{2}$/', $hora) || $motivo === '') responderActualizacionCita(400, false, 'Los datos de la cita no son válidos.');
if (!in_array($estado, ['PENDIENTE', 'CONFIRMADA', 'CANCELADA'], true)) responderActualizacionCita(400, false, 'El estado no es válido.');
$dias = [1 => 'LUNES', 2 => 'MARTES', 3 => 'MIERCOLES', 4 => 'JUEVES', 5 => 'VIERNES', 6 => 'SABADO', 7 => 'DOMINGO'];
$dia = $dias[(int)$fecha->format('N')];
$fechaHora = "$fechaTexto $hora";

$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $sql = "SELECT h.id_clinica FROM horario_medico h JOIN medico m ON m.id_medico = h.id_medico JOIN paciente p ON p.id_paciente = :paciente WHERE h.id_medico = :medico AND h.dia_semana = :dia AND h.estado = 'ACTIVO' AND m.estado = 'ACTIVO' AND p.estado = 'ACTIVO' AND :hora >= h.hora_inicio AND :hora < h.hora_fin";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':paciente', $idPaciente);
    oci_bind_by_name($consulta, ':medico', $idMedico);
    oci_bind_by_name($consulta, ':dia', $dia, 10);
    oci_bind_by_name($consulta, ':hora', $hora, 5);
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    $horario = oci_fetch_assoc($consulta);
    if (!$horario) responderActualizacionCita(400, false, 'El médico no está disponible en el día y hora seleccionados.');
    $idClinica = (int)$horario['ID_CLINICA'];
    oci_free_statement($consulta);

    $sql = "SELECT COUNT(*) AS total FROM cita WHERE id_cita <> :id AND fecha_hora = TO_TIMESTAMP(:fecha_hora, 'YYYY-MM-DD HH24:MI') AND estado <> 'CANCELADA' AND (id_medico = :medico OR id_paciente = :paciente)";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':id', $id);
    oci_bind_by_name($consulta, ':fecha_hora', $fechaHora, 16);
    oci_bind_by_name($consulta, ':medico', $idMedico);
    oci_bind_by_name($consulta, ':paciente', $idPaciente);
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    if ((int)oci_fetch_assoc($consulta)['TOTAL'] > 0) responderActualizacionCita(409, false, 'El médico o el paciente ya tiene una cita en esa fecha y hora.');
    oci_free_statement($consulta);

    $sql = "UPDATE cita SET id_paciente = :paciente, id_medico = :medico, id_clinica = :clinica, fecha_hora = TO_TIMESTAMP(:fecha_hora, 'YYYY-MM-DD HH24:MI'), motivo = UPPER(:motivo), estado = :estado WHERE id_cita = :id";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':paciente', $idPaciente);
    oci_bind_by_name($consulta, ':medico', $idMedico);
    oci_bind_by_name($consulta, ':clinica', $idClinica);
    oci_bind_by_name($consulta, ':fecha_hora', $fechaHora, 16);
    oci_bind_by_name($consulta, ':motivo', $motivo);
    oci_bind_by_name($consulta, ':estado', $estado, 10);
    oci_bind_by_name($consulta, ':id', $id);
    if (!@oci_execute($consulta, OCI_NO_AUTO_COMMIT)) throw new RuntimeException(oci_error($consulta)['message']);
    if (oci_num_rows($consulta) === 0) throw new RuntimeException('La cita no existe.');
    oci_commit($conexion);
    responderActualizacionCita(200, true, 'Cita actualizada correctamente.');
} catch (Throwable $error) {
    if ($conexion) oci_rollback($conexion);
    responderActualizacionCita(500, false, 'Error al actualizar cita: ' . $error->getMessage());
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
