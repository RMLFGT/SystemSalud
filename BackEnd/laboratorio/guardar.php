<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderGuardarEstudio(int $codigo, bool $correcto, string $mensaje): never {
    http_response_code($codigo);
    echo json_encode(['correcto' => $correcto, 'mensaje' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') responderGuardarEstudio(405, false, 'Método no permitido.');
$datos = json_decode(file_get_contents('php://input'), true);
if (!is_array($datos)) responderGuardarEstudio(400, false, 'El contenido enviado no es válido.');
$idPaciente = filter_var($datos['idPaciente'] ?? null, FILTER_VALIDATE_INT);
$idMedico = filter_var($datos['idMedico'] ?? null, FILTER_VALIDATE_INT);
$idTipo = filter_var($datos['idTipoEstudio'] ?? null, FILTER_VALIDATE_INT);
$idConsulta = empty($datos['idConsulta']) ? null : filter_var($datos['idConsulta'], FILTER_VALIDATE_INT);
$fecha = trim((string)($datos['fechaSolicitud'] ?? ''));
$observaciones = trim((string)($datos['observaciones'] ?? ''));
if (!$idPaciente || !$idMedico || !$idTipo || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) responderGuardarEstudio(400, false, 'Paciente, médico, tipo de estudio y fecha son obligatorios.');
if ($idConsulta === false) responderGuardarEstudio(400, false, 'La consulta seleccionada no es válida.');
if (mb_strlen($observaciones) > 1000) responderGuardarEstudio(400, false, 'Las observaciones superan la longitud permitida.');

$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $sql = "SELECT COUNT(*) total FROM paciente p JOIN expediente e ON e.id_paciente = p.id_paciente
            WHERE p.id_paciente = :paciente AND p.estado = 'ACTIVO' AND e.estado = 'ACTIVO'";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':paciente', $idPaciente);
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    $validez = oci_fetch_assoc($consulta);
    oci_free_statement($consulta);
    $consulta = null;
    if ((int)$validez['TOTAL'] === 0) responderGuardarEstudio(409, false, 'El paciente no está activo o su expediente está cerrado.');

    $sql = "SELECT COUNT(*) total FROM medico m JOIN tipo_estudio te ON te.id_tipo_estudio = :tipo
            WHERE m.id_medico = :medico AND m.estado = 'ACTIVO' AND te.estado = 'ACTIVO'";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':medico', $idMedico);
    oci_bind_by_name($consulta, ':tipo', $idTipo);
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    $validez = oci_fetch_assoc($consulta);
    oci_free_statement($consulta);
    $consulta = null;
    if ((int)$validez['TOTAL'] === 0) responderGuardarEstudio(409, false, 'El médico o el tipo de estudio no está activo.');

    if ($idConsulta !== null) {
        $sql = "SELECT COUNT(*) total FROM consulta_medica cm JOIN expediente e ON e.id_expediente = cm.id_expediente
                WHERE cm.id_consulta = :consulta AND e.id_paciente = :paciente AND cm.id_medico = :medico";
        $consulta = oci_parse($conexion, $sql);
        oci_bind_by_name($consulta, ':consulta', $idConsulta);
        oci_bind_by_name($consulta, ':paciente', $idPaciente);
        oci_bind_by_name($consulta, ':medico', $idMedico);
        if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
        $validez = oci_fetch_assoc($consulta);
        oci_free_statement($consulta);
        $consulta = null;
        if ((int)$validez['TOTAL'] === 0) responderGuardarEstudio(409, false, 'La consulta no corresponde al paciente y médico seleccionados.');
    }

    $sql = "INSERT INTO estudio_laboratorio
            (id_paciente, id_medico, id_consulta, id_tipo_estudio, fecha_solicitud, resultado, observaciones, estado)
            VALUES (:paciente, :medico, :consulta, :tipo, TO_TIMESTAMP(:fecha, 'YYYY-MM-DD'), NULL, :observaciones, 'PENDIENTE')";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':paciente', $idPaciente);
    oci_bind_by_name($consulta, ':medico', $idMedico);
    oci_bind_by_name($consulta, ':consulta', $idConsulta);
    oci_bind_by_name($consulta, ':tipo', $idTipo);
    oci_bind_by_name($consulta, ':fecha', $fecha);
    oci_bind_by_name($consulta, ':observaciones', $observaciones);
    if (!@oci_execute($consulta, OCI_NO_AUTO_COMMIT)) throw new RuntimeException(oci_error($consulta)['message']);
    oci_commit($conexion);
    responderGuardarEstudio(201, true, 'Solicitud de estudio registrada correctamente.');
} catch (Throwable $error) {
    if ($conexion) oci_rollback($conexion);
    responderGuardarEstudio(500, false, 'Error al registrar el estudio: ' . $error->getMessage());
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
