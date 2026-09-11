<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderDisponibilidad(int $codigo, bool $correcto, string $mensaje, ?array $datos = null): never {
    http_response_code($codigo);
    $respuesta = ['correcto' => $correcto, 'mensaje' => $mensaje];
    if ($datos !== null) $respuesta['datos'] = $datos;
    echo json_encode($respuesta, JSON_UNESCAPED_UNICODE);
    exit;
}

$idMedico = filter_input(INPUT_GET, 'idMedico', FILTER_VALIDATE_INT);
$idCita = filter_input(INPUT_GET, 'idCita', FILTER_VALIDATE_INT) ?: null;
$fechaTexto = $_GET['fecha'] ?? '';
$fecha = DateTime::createFromFormat('Y-m-d', $fechaTexto);
if (!$idMedico || !$fecha || $fecha->format('Y-m-d') !== $fechaTexto) responderDisponibilidad(400, false, 'Médico o fecha no válidos.');
$dias = [1 => 'LUNES', 2 => 'MARTES', 3 => 'MIERCOLES', 4 => 'JUEVES', 5 => 'VIERNES', 6 => 'SABADO', 7 => 'DOMINGO'];
$dia = $dias[(int)$fecha->format('N')];

$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $sql = "SELECT h.hora_inicio, h.hora_fin, c.nombre AS clinica FROM horario_medico h JOIN clinica c ON c.id_clinica = h.id_clinica WHERE h.id_medico = :medico AND h.dia_semana = :dia AND h.estado = 'ACTIVO'";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':medico', $idMedico);
    oci_bind_by_name($consulta, ':dia', $dia, 10);
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    $horario = oci_fetch_assoc($consulta);
    if (!$horario) responderDisponibilidad(404, false, 'El médico no atiende en la fecha seleccionada.');
    oci_free_statement($consulta);

    $consulta = oci_parse($conexion, "SELECT TO_CHAR(fecha_hora, 'HH24:MI') AS hora FROM cita WHERE id_medico = :medico AND TRUNC(fecha_hora) = TO_DATE(:fecha, 'YYYY-MM-DD') AND estado <> 'CANCELADA' AND (:cita IS NULL OR id_cita <> :cita)");
    oci_bind_by_name($consulta, ':medico', $idMedico);
    oci_bind_by_name($consulta, ':fecha', $fechaTexto, 10);
    oci_bind_by_name($consulta, ':cita', $idCita);
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    $ocupadas = [];
    while ($fila = oci_fetch_assoc($consulta)) $ocupadas[] = $fila['HORA'];

    $inicio = DateTime::createFromFormat('H:i', $horario['HORA_INICIO']);
    $fin = DateTime::createFromFormat('H:i', $horario['HORA_FIN']);
    $horas = [];
    while ($inicio < $fin) {
        $hora = $inicio->format('H:i');
        if (!in_array($hora, $ocupadas, true)) $horas[] = $hora;
        $inicio->modify('+1 hour');
    }
    responderDisponibilidad(200, true, 'Disponibilidad consultada.', ['clinica' => $horario['CLINICA'], 'horas' => $horas]);
} catch (Throwable $error) {
    responderDisponibilidad(500, false, 'Error al consultar disponibilidad: ' . $error->getMessage());
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
