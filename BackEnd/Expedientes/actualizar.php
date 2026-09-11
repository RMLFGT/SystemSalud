<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderActualizacion(int $codigo, bool $correcto, string $mensaje): never {
    http_response_code($codigo);
    echo json_encode(['correcto' => $correcto, 'mensaje' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

function numeroConsulta(mixed $valor): ?float {
    return $valor === null || $valor === '' ? null : (is_numeric($valor) ? (float)$valor : -1);
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') responderActualizacion(405, false, 'Método no permitido.');
$datos = json_decode(file_get_contents('php://input'), true);
if (!is_array($datos)) responderActualizacion(400, false, 'El contenido enviado no es válido.');
$id = filter_var($datos['id'] ?? null, FILTER_VALIDATE_INT);
$idMedico = filter_var($datos['idMedico'] ?? null, FILTER_VALIDATE_INT);
$idTipo = filter_var($datos['idTipoConsulta'] ?? null, FILTER_VALIDATE_INT);
$fecha = trim((string)($datos['fecha'] ?? ''));
$diagnostico = trim((string)($datos['diagnostico'] ?? ''));
$sintomas = trim((string)($datos['sintomas'] ?? ''));
$tratamiento = trim((string)($datos['tratamiento'] ?? ''));
$observaciones = trim((string)($datos['observaciones'] ?? ''));
$presion = trim((string)($datos['presion'] ?? ''));
$frecuencia = numeroConsulta($datos['frecuencia'] ?? null);
$temperatura = numeroConsulta($datos['temperatura'] ?? null);
$peso = numeroConsulta($datos['peso'] ?? null);
$estado = strtoupper(trim((string)($datos['estado'] ?? '')));
if (!$id || !$idMedico || !$idTipo || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha) || $diagnostico === '') responderActualizacion(400, false, 'Consulta, médico, tipo, fecha y diagnóstico son obligatorios.');
if (mb_strlen($diagnostico) > 500 || mb_strlen($sintomas) > 2000 || mb_strlen($tratamiento) > 2000 || mb_strlen($observaciones) > 2000) responderActualizacion(400, false, 'Uno de los textos supera la longitud permitida.');
if (!in_array($estado, ['ABIERTA', 'FINALIZADA'], true)) responderActualizacion(400, false, 'El estado no es válido.');
$sistolica = null;
$diastolica = null;
if ($presion !== '') {
    if (!preg_match('/^(\d{2,3})\s*\/\s*(\d{2,3})$/', $presion, $partes)) responderActualizacion(400, false, 'La presión debe escribirse con el formato 120/80.');
    $sistolica = (int)$partes[1];
    $diastolica = (int)$partes[2];
}
if ($frecuencia !== null && ($frecuencia < 1 || $frecuencia > 300)) responderActualizacion(400, false, 'La frecuencia cardiaca está fuera del rango permitido.');
if ($temperatura !== null && ($temperatura < 30 || $temperatura > 45)) responderActualizacion(400, false, 'La temperatura debe estar entre 30 y 45 °C.');
if ($peso !== null && ($peso < 1 || $peso > 500)) responderActualizacion(400, false, 'El peso debe estar entre 1 y 500 kg.');

$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $sql = "SELECT cm.id_cita, e.estado estado_expediente FROM consulta_medica cm
            JOIN expediente e ON e.id_expediente = cm.id_expediente WHERE cm.id_consulta = :id";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':id', $id);
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    $actual = oci_fetch_assoc($consulta);
    oci_free_statement($consulta);
    $consulta = null;
    if (!$actual) responderActualizacion(404, false, 'La consulta médica no existe.');
    if ($actual['ESTADO_EXPEDIENTE'] !== 'ACTIVO') responderActualizacion(409, false, 'No se puede editar una consulta de un expediente cerrado.');

    $sql = "SELECT COUNT(*) total FROM medico m JOIN tipo_consulta tc ON tc.id_tipo_consulta = :tipo
            WHERE m.id_medico = :medico AND m.estado = 'ACTIVO' AND tc.estado = 'ACTIVO'";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':tipo', $idTipo);
    oci_bind_by_name($consulta, ':medico', $idMedico);
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    $validez = oci_fetch_assoc($consulta);
    oci_free_statement($consulta);
    $consulta = null;
    if ((int)$validez['TOTAL'] === 0) responderActualizacion(409, false, 'El médico o el tipo de consulta no está activo.');

    if ($actual['ID_CITA'] !== null) {
        $idCita = (int)$actual['ID_CITA'];
        $consulta = oci_parse($conexion, 'SELECT COUNT(*) total FROM cita WHERE id_cita = :cita AND id_medico = :medico');
        oci_bind_by_name($consulta, ':cita', $idCita);
        oci_bind_by_name($consulta, ':medico', $idMedico);
        if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
        $cita = oci_fetch_assoc($consulta);
        oci_free_statement($consulta);
        $consulta = null;
        if ((int)$cita['TOTAL'] === 0) responderActualizacion(409, false, 'No se puede cambiar el médico de una consulta asociada a una cita.');
    }

    $sql = "UPDATE consulta_medica SET id_medico = :medico, id_tipo_consulta = :tipo,
            fecha_consulta = TO_TIMESTAMP(:fecha || ' ' || TO_CHAR(fecha_consulta, 'HH24:MI'), 'YYYY-MM-DD HH24:MI'),
            diagnostico = UPPER(:diagnostico), sintomas = :sintomas, tratamiento = :tratamiento,
            observaciones = :observaciones, presion_sistolica = :sistolica, presion_diastolica = :diastolica,
            frecuencia_cardiaca = :frecuencia,
            temperatura = TO_NUMBER(:temperatura, '999D99', 'NLS_NUMERIC_CHARACTERS=''.,'''),
            peso = TO_NUMBER(:peso, '999D99', 'NLS_NUMERIC_CHARACTERS=''.,'''), estado = :estado
            WHERE id_consulta = :id";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':medico', $idMedico);
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
    oci_bind_by_name($consulta, ':id', $id);
    if (!@oci_execute($consulta, OCI_NO_AUTO_COMMIT)) throw new RuntimeException(oci_error($consulta)['message']);
    oci_commit($conexion);
    responderActualizacion(200, true, 'Consulta médica actualizada correctamente.');
} catch (Throwable $error) {
    if ($conexion) oci_rollback($conexion);
    responderActualizacion(500, false, 'Error al actualizar la consulta: ' . $error->getMessage());
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
