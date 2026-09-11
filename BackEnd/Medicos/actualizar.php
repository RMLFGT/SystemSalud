<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderActualizacion(int $codigo, bool $correcto, string $mensaje): never {
    http_response_code($codigo);
    echo json_encode(['correcto' => $correcto, 'mensaje' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

function convertirHoraActualizacion(string $hora): string {
    $fecha = DateTime::createFromFormat('h:i A', strtoupper(trim($hora)));
    if (!$fecha) responderActualizacion(400, false, 'El formato del horario no es válido.');
    return $fecha->format('H:i');
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') responderActualizacion(405, false, 'Método no permitido.');
$datos = json_decode(file_get_contents('php://input'), true);
$campos = ['id', 'nombre', 'apellido', 'colegiado', 'idEspecialidad', 'telefono', 'correo', 'idClinica', 'horaInicio', 'horaFin', 'estado'];
foreach ($campos as $campo) if (!isset($datos[$campo]) || trim((string)$datos[$campo]) === '') responderActualizacion(400, false, "El campo $campo es obligatorio.");

$id = filter_var($datos['id'], FILTER_VALIDATE_INT);
$nombre = trim($datos['nombre']);
$apellido = trim($datos['apellido']);
$colegiado = trim($datos['colegiado']);
$idEspecialidad = filter_var($datos['idEspecialidad'], FILTER_VALIDATE_INT);
$telefono = trim($datos['telefono']);
$correo = trim($datos['correo']);
$idClinica = filter_var($datos['idClinica'], FILTER_VALIDATE_INT);
$horaInicio = convertirHoraActualizacion($datos['horaInicio']);
$horaFin = convertirHoraActualizacion($datos['horaFin']);
$estado = strtoupper(trim($datos['estado']));
if (!$id || !$idEspecialidad || !$idClinica || !in_array($estado, ['ACTIVO', 'INACTIVO'], true)) responderActualizacion(400, false, 'Los datos relacionados no son válidos.');
if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) responderActualizacion(400, false, 'El correo electrónico no es válido.');

$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $sql = "UPDATE medico SET id_especialidad = :especialidad, numero_colegiado = :colegiado,
            nombre = UPPER(:nombre), apellido = UPPER(:apellido), telefono = :telefono,
            correo = LOWER(:correo), estado = :estado WHERE id_medico = :id";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':especialidad', $idEspecialidad);
    oci_bind_by_name($consulta, ':colegiado', $colegiado);
    oci_bind_by_name($consulta, ':nombre', $nombre);
    oci_bind_by_name($consulta, ':apellido', $apellido);
    oci_bind_by_name($consulta, ':telefono', $telefono);
    oci_bind_by_name($consulta, ':correo', $correo);
    oci_bind_by_name($consulta, ':estado', $estado);
    oci_bind_by_name($consulta, ':id', $id);
    if (!@oci_execute($consulta, OCI_NO_AUTO_COMMIT)) throw new RuntimeException(oci_error($consulta)['message']);
    if (oci_num_rows($consulta) === 0) throw new RuntimeException('El médico no existe.');
    oci_free_statement($consulta);
    $consulta = null;

    $sql = "UPDATE horario_medico SET hora_inicio = :inicio, hora_fin = :fin, id_clinica = :clinica WHERE id_medico = :id";
    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':inicio', $horaInicio, 5);
    oci_bind_by_name($consulta, ':fin', $horaFin, 5);
    oci_bind_by_name($consulta, ':clinica', $idClinica);
    oci_bind_by_name($consulta, ':id', $id);
    if (!@oci_execute($consulta, OCI_NO_AUTO_COMMIT)) throw new RuntimeException(oci_error($consulta)['message']);
    oci_commit($conexion);
    responderActualizacion(200, true, 'Médico actualizado correctamente.');
} catch (Throwable $error) {
    if ($conexion) oci_rollback($conexion);
    $mensaje = str_contains($error->getMessage(), 'ORA-00001') ? 'El número de colegiado o correo ya está registrado.' : $error->getMessage();
    responderActualizacion(500, false, 'Error al actualizar médico: ' . $mensaje);
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
