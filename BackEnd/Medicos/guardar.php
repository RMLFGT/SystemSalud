<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderMedico(int $codigo, bool $correcto, string $mensaje): never {
    http_response_code($codigo);
    echo json_encode([
        'correcto' => $correcto,
        'mensaje' => $mensaje
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function convertirHora(string $hora): string {
    $fecha = DateTime::createFromFormat('h:i A', strtoupper(trim($hora)));
    if (!$fecha) responderMedico(400, false, 'El formato del horario no es válido.');
    return $fecha->format('H:i');
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderMedico(405, false, 'Método no permitido.');
}

$datos = json_decode(file_get_contents('php://input'), true);

if (!is_array($datos)) {
    responderMedico(400, false, 'Los datos enviados no son válidos.');
}

$campos = [
    'nombre',
    'apellido',
    'colegiado',
    'idEspecialidad',
    'telefono',
    'correo',
    'idClinica',
    'horaInicio',
    'horaFin',
    'estado'
];

foreach ($campos as $campo) {
    if (!isset($datos[$campo]) || trim((string)$datos[$campo]) === '') {
        responderMedico(400, false, "El campo $campo es obligatorio.");
    }
}

$nombre = trim($datos['nombre']);
$apellido = trim($datos['apellido']);
$colegiado = trim($datos['colegiado']);
$idEspecialidad = filter_var($datos['idEspecialidad'], FILTER_VALIDATE_INT);
$telefono = trim($datos['telefono']);
$correo = trim($datos['correo']);
$idClinica = filter_var($datos['idClinica'], FILTER_VALIDATE_INT);
$horaInicio = convertirHora($datos['horaInicio']);
$horaFin = convertirHora($datos['horaFin']);
$estado = strtoupper(trim($datos['estado']));

if (!$idEspecialidad || !$idClinica || !in_array($estado, ['ACTIVO', 'INACTIVO'], true)) {
    responderMedico(400, false, 'Especialidad, clínica o estado no válidos.');
}

if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    responderMedico(400, false, 'El correo electrónico no es válido.');
}

$conexion = null;
$consulta = null;

try {
    $conexion = conectarOracle();
    $idMedico = 0;

    $sql = "INSERT INTO medico (
                id_especialidad,
                numero_colegiado,
                nombre,
                apellido,
                telefono,
                correo,
                estado
            ) VALUES (
                :especialidad,
                :colegiado,
                UPPER(:nombre),
                UPPER(:apellido),
                :telefono,
                LOWER(:correo),
                :estado
            )
            RETURNING id_medico INTO :id_medico";

    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name($consulta, ':especialidad', $idEspecialidad);
    oci_bind_by_name($consulta, ':colegiado', $colegiado);
    oci_bind_by_name($consulta, ':nombre', $nombre);
    oci_bind_by_name($consulta, ':apellido', $apellido);
    oci_bind_by_name($consulta, ':telefono', $telefono);
    oci_bind_by_name($consulta, ':correo', $correo);
    oci_bind_by_name($consulta, ':estado', $estado);
    oci_bind_by_name($consulta, ':id_medico', $idMedico, 32);

    if (!@oci_execute($consulta, OCI_NO_AUTO_COMMIT)) {
        $errorOracle = oci_error($consulta);
        throw new RuntimeException(
            $errorOracle['message'] ?? 'No fue posible registrar al médico.'
        );
    }

    oci_free_statement($consulta);
    $consulta = null;

    $dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];

    $sqlHorario = "INSERT INTO horario_medico (
                        id_medico,
                        dia_semana,
                        hora_inicio,
                        hora_fin,
                        estado,
                        id_clinica
                    ) VALUES (
                        :medico,
                        :dia,
                        :inicio,
                        :fin,
                        'ACTIVO',
                        :clinica
                    )";

    $consulta = oci_parse($conexion, $sqlHorario);
    $dia = '';

    oci_bind_by_name($consulta, ':medico', $idMedico);
    oci_bind_by_name($consulta, ':dia', $dia, 10);
    oci_bind_by_name($consulta, ':inicio', $horaInicio, 5);
    oci_bind_by_name($consulta, ':fin', $horaFin, 5);
    oci_bind_by_name($consulta, ':clinica', $idClinica);

    foreach ($dias as $dia) {
        if (!@oci_execute($consulta, OCI_NO_AUTO_COMMIT)) {
            $errorOracle = oci_error($consulta);
            throw new RuntimeException(
                $errorOracle['message'] ?? 'No fue posible registrar el horario.'
            );
        }
    }

    oci_commit($conexion);
    responderMedico(201, true, 'Médico y horario registrados correctamente.');
} catch (Throwable $error) {
    if ($conexion) oci_rollback($conexion);

    $mensaje = str_contains($error->getMessage(), 'ORA-00001')
        ? 'El número de colegiado o correo ya está registrado.'
        : $error->getMessage();

    responderMedico(500, false, 'Error al registrar médico: ' . $mensaje);
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}