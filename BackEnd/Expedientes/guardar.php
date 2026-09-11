<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderConsulta(int $codigo, bool $correcto, string $mensaje): never {
    http_response_code($codigo);
    echo json_encode(['correcto' => $correcto, 'mensaje' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

function numeroOpcional(mixed $valor): ?float {
    return $valor === null || $valor === '' ? null : (is_numeric($valor) ? (float)$valor : -1);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') responderConsulta(405, false, 'Método no permitido.');
$datos = json_decode(file_get_contents('php://input'), true);
if (!is_array($datos)) responderConsulta(400, false, 'El contenido enviado no es válido.');
$idPaciente = filter_var($datos['idPaciente'] ?? null, FILTER_VALIDATE_INT);
$idMedico = filter_var($datos['idMedico'] ?? null, FILTER_VALIDATE_INT);
$idTipo = filter_var($datos['idTipoConsulta'] ?? null, FILTER_VALIDATE_INT);
$idCita = empty($datos['idCita']) ? null : filter_var($datos['idCita'], FILTER_VALIDATE_INT);
$fecha = trim((string)($datos['fecha'] ?? ''));
$diagnostico = trim((string)($datos['diagnostico'] ?? ''));
$sintomas = trim((string)($datos['sintomas'] ?? ''));
$tratamiento = trim((string)($datos['tratamiento'] ?? ''));
$observaciones = trim((string)($datos['observaciones'] ?? ''));
$presion = trim((string)($datos['presion'] ?? ''));
$frecuencia = numeroOpcional($datos['frecuencia'] ?? null);
$temperatura = numeroOpcional($datos['temperatura'] ?? null);
$peso = numeroOpcional($datos['peso'] ?? null);
$estado = strtoupper(trim((string)($datos['estado'] ?? 'FINALIZADA')));
if (!$idPaciente || !$idMedico || !$idTipo || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha) || $diagnostico === '') responderConsulta(400, false, 'Paciente, médico, tipo, fecha y diagnóstico son obligatorios.');
if (mb_strlen($diagnostico) > 500 || mb_strlen($sintomas) > 2000 || mb_strlen($tratamiento) > 2000 || mb_strlen($observaciones) > 2000) responderConsulta(400, false, 'Uno de los textos supera la longitud permitida.');
if (!in_array($estado, ['ABIERTA', 'FINALIZADA'], true)) responderConsulta(400, false, 'El estado de la consulta no es válido.');
$sistolica = null;
$diastolica = null;
if ($presion !== '') {
    if (!preg_match('/^(\d{2,3})\s*\/\s*(\d{2,3})$/', $presion, $partes)) responderConsulta(400, false, 'La presión debe escribirse con el formato 120/80.');
    $sistolica = (int)$partes[1];
    $diastolica = (int)$partes[2];
}
if ($frecuencia !== null && ($frecuencia < 1 || $frecuencia > 300)) responderConsulta(400, false, 'La frecuencia cardiaca está fuera del rango permitido.');
if ($temperatura !== null && ($temperatura < 30 || $temperatura > 45)) responderConsulta(400, false, 'La temperatura debe estar entre 30 y 45 °C.');
if ($peso !== null && ($peso < 1 || $peso > 500)) responderConsulta(400, false, 'El peso debe estar entre 1 y 500 kg.');

$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $sql = "SELECT e.id_expediente FROM expediente e JOIN paciente p ON p.id_paciente = e.id_paciente
            WHERE e.id_paciente = :paciente AND e.estado = 'ACTIVO' AND p.estado = 'ACTIVO'";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':paciente', $idPaciente);
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    $fila = oci_fetch_assoc($consulta);
    oci_free_statement($consulta);
    $consulta = null;
    if (!$fila) responderConsulta(409, false, 'El paciente no tiene un expediente activo.');
    $idExpediente = (int)$fila['ID_EXPEDIENTE'];

    $sql = "SELECT COUNT(*) total FROM medico m JOIN tipo_consulta tc ON tc.id_tipo_consulta = :tipo
            WHERE m.id_medico = :medico AND m.estado = 'ACTIVO' AND tc.estado = 'ACTIVO'";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':tipo', $idTipo);
    oci_bind_by_name($consulta, ':medico', $idMedico);
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    $validez = oci_fetch_assoc($consulta);
    oci_free_statement($consulta);
    $consulta = null;
    if ((int)$validez['TOTAL'] === 0) responderConsulta(409, false, 'El médico o el tipo de consulta no está activo.');

    if ($idCita !== null) {
        $sql = "SELECT COUNT(*) total FROM cita c WHERE c.id_cita = :cita AND c.id_paciente = :paciente
                AND c.id_medico = :medico AND c.estado = 'CONFIRMADA'
                AND NOT EXISTS (SELECT 1 FROM consulta_medica cm WHERE cm.id_cita = c.id_cita)";
        $consulta = oci_parse($conexion, $sql);
        oci_bind_by_name($consulta, ':cita', $idCita);
        oci_bind_by_name($consulta, ':paciente', $idPaciente);
        oci_bind_by_name($consulta, ':medico', $idMedico);
        if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
        $citaValida = oci_fetch_assoc($consulta);
        oci_free_statement($consulta);
        $consulta = null;
        if ((int)$citaValida['TOTAL'] === 0) responderConsulta(409, false, 'La cita no es válida, no está confirmada o ya tiene una consulta.');
    }

    $sql = "INSERT INTO consulta_medica (id_expediente, id_medico, id_cita, id_tipo_consulta, fecha_consulta,
            diagnostico, sintomas, tratamiento, observaciones, presion_sistolica, presion_diastolica,
            frecuencia_cardiaca, temperatura, peso, estado)
            VALUES (:expediente, :medico, :cita, :tipo, TO_TIMESTAMP(:fecha, 'YYYY-MM-DD'), UPPER(:diagnostico),
            :sintomas, :tratamiento, :observaciones, :sistolica, :diastolica, :frecuencia,
            TO_NUMBER(:temperatura, '999D99', 'NLS_NUMERIC_CHARACTERS=''.,'''),
            TO_NUMBER(:peso, '999D99', 'NLS_NUMERIC_CHARACTERS=''.,'''), :estado)";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':expediente', $idExpediente);
    oci_bind_by_name($consulta, ':medico', $idMedico);
    oci_bind_by_name($consulta, ':cita', $idCita);
    oci_bind_by_name($consulta, ':tipo', $idTipo);
    oci_bind_by_name($consulta, ':fecha', $fecha);
    oci_bind_by_name($consulta, ':diagnostico', $diagnostico);
    oci_bind_by_name($consulta, ':sintomas', $sintomas);
    oci_bind_by_name($consulta, ':tratamiento', $tratamiento);
    oci_bind_by_name($consulta, ':observaciones', $observaciones);
    oci_bind_by_name($consulta, ':sistolica', $sistolica);
    oci_bind_by_name($consulta, ':diastolica', $diastolica);
    oci_bind_by_name($consulta, ':frecuencia', $frecuencia);
    oci_bind_by_name($consulta, ':temperatura', $temperatura);
    oci_bind_by_name($consulta, ':peso', $peso);
    oci_bind_by_name($consulta, ':estado', $estado);
    if (!@oci_execute($consulta, OCI_NO_AUTO_COMMIT)) throw new RuntimeException(oci_error($consulta)['message']);
    oci_commit($conexion);
    responderConsulta(201, true, 'Consulta médica registrada correctamente.');
} catch (Throwable $error) {
    if ($conexion) oci_rollback($conexion);
    $mensaje = str_contains($error->getMessage(), 'UK_CONSULTA_CITA') || str_contains($error->getMessage(), 'ORA-00001') ? 'La cita seleccionada ya tiene una consulta registrada.' : $error->getMessage();
    responderConsulta(500, false, 'Error al registrar la consulta: ' . $mensaje);
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
