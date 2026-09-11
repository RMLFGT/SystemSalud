<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderEstadoCita(int $codigo, bool $correcto, string $mensaje): never {
    http_response_code($codigo);
    echo json_encode(['correcto' => $correcto, 'mensaje' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'PATCH') responderEstadoCita(405, false, 'Método no permitido.');
$datos = json_decode(file_get_contents('php://input'), true);
$id = filter_var($datos['id'] ?? null, FILTER_VALIDATE_INT);
$estado = strtoupper(trim((string)($datos['estado'] ?? '')));
if (!$id || !in_array($estado, ['PENDIENTE', 'CANCELADA'], true)) responderEstadoCita(400, false, 'Identificador o estado no válido.');

$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $sql = "SELECT c.id_paciente, c.id_medico, TO_CHAR(c.fecha_hora, 'YYYY-MM-DD') fecha,
                   TO_CHAR(c.fecha_hora, 'HH24:MI') hora, p.estado estado_paciente, m.estado estado_medico
            FROM cita c JOIN paciente p ON p.id_paciente = c.id_paciente
            JOIN medico m ON m.id_medico = c.id_medico WHERE c.id_cita = :id";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':id', $id);
    if (!oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    $cita = oci_fetch_assoc($consulta);
    oci_free_statement($consulta);
    $consulta = null;
    if (!$cita) responderEstadoCita(404, false, 'La cita no existe.');

    if ($estado === 'PENDIENTE') {
        if ($cita['ESTADO_PACIENTE'] !== 'ACTIVO' || $cita['ESTADO_MEDICO'] !== 'ACTIVO') responderEstadoCita(409, false, 'El paciente y el médico deben estar activos para reactivar la cita.');
        $dias = [1 => 'LUNES', 2 => 'MARTES', 3 => 'MIERCOLES', 4 => 'JUEVES', 5 => 'VIERNES', 6 => 'SABADO', 7 => 'DOMINGO'];
        $dia = $dias[(int)(new DateTime($cita['FECHA']))->format('N')];
        $sql = "SELECT COUNT(*) total FROM horario_medico
                WHERE id_medico = :medico AND dia_semana = :dia AND estado = 'ACTIVO'
                AND :hora BETWEEN hora_inicio AND hora_fin";
        $consulta = oci_parse($conexion, $sql);
        oci_bind_by_name($consulta, ':medico', $cita['ID_MEDICO']);
        oci_bind_by_name($consulta, ':dia', $dia);
        oci_bind_by_name($consulta, ':hora', $cita['HORA']);
        if (!oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
        $horario = oci_fetch_assoc($consulta);
        oci_free_statement($consulta);
        $consulta = null;
        if ((int)$horario['TOTAL'] === 0) responderEstadoCita(409, false, 'El médico no tiene disponibilidad para la fecha y hora de esta cita.');

        $fechaHora = $cita['FECHA'] . ' ' . $cita['HORA'];
        $sql = "SELECT COUNT(*) total FROM cita WHERE id_cita <> :id AND estado <> 'CANCELADA'
                AND fecha_hora = TO_TIMESTAMP(:fecha_hora, 'YYYY-MM-DD HH24:MI')
                AND (id_medico = :medico OR id_paciente = :paciente)";
        $consulta = oci_parse($conexion, $sql);
        oci_bind_by_name($consulta, ':id', $id);
        oci_bind_by_name($consulta, ':fecha_hora', $fechaHora);
        oci_bind_by_name($consulta, ':medico', $cita['ID_MEDICO']);
        oci_bind_by_name($consulta, ':paciente', $cita['ID_PACIENTE']);
        if (!oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
        $conflicto = oci_fetch_assoc($consulta);
        oci_free_statement($consulta);
        $consulta = null;
        if ((int)$conflicto['TOTAL'] > 0) responderEstadoCita(409, false, 'No se puede reactivar: el paciente o el médico ya tiene una cita en ese horario.');
    }

    $consulta = oci_parse($conexion, 'UPDATE cita SET estado = :estado WHERE id_cita = :id');
    oci_bind_by_name($consulta, ':estado', $estado);
    oci_bind_by_name($consulta, ':id', $id);
    if (!oci_execute($consulta, OCI_NO_AUTO_COMMIT)) throw new RuntimeException(oci_error($consulta)['message']);
    oci_commit($conexion);
    responderEstadoCita(200, true, $estado === 'CANCELADA' ? 'Cita cancelada correctamente.' : 'Cita reactivada como pendiente.');
} catch (Throwable $error) {
    if ($conexion) oci_rollback($conexion);
    responderEstadoCita(500, false, 'Error al cambiar el estado de la cita: ' . $error->getMessage());
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
