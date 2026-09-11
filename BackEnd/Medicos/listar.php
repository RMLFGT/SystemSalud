<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $sql = "SELECT m.id_medico, m.id_especialidad, m.numero_colegiado, m.nombre, m.apellido, m.telefono, m.correo, m.estado,
                   e.nombre AS especialidad, h.id_clinica, h.hora_inicio, h.hora_fin, NVL(h.dias, 'Sin horario') AS dias,
                   CASE WHEN h.id_medico IS NULL THEN 'Sin horario' ELSE h.hora_inicio || ' - ' || h.hora_fin END AS horario,
                   NVL(c.nombre, 'Sin clínica') AS clinica
            FROM medico m
            JOIN especialidad e ON e.id_especialidad = m.id_especialidad
            LEFT JOIN (
                SELECT id_medico, MIN(id_clinica) AS id_clinica, MIN(hora_inicio) AS hora_inicio,
                       MAX(hora_fin) AS hora_fin,
                       LISTAGG(dia_semana, ', ') WITHIN GROUP (ORDER BY id_horario) AS dias
                FROM horario_medico
                GROUP BY id_medico
            ) h ON h.id_medico = m.id_medico
            LEFT JOIN clinica c ON c.id_clinica = h.id_clinica
            ORDER BY m.id_medico";
    $consulta = oci_parse($conexion, $sql);
    if (!oci_execute($consulta)) {
        $error = oci_error($consulta);
        throw new RuntimeException($error['message'] ?? 'No fue posible consultar los médicos.');
    }
    $medicos = [];
    while ($fila = oci_fetch_assoc($consulta)) {
        $medicos[] = [
            'id' => (int)$fila['ID_MEDICO'],
            'idEspecialidad' => (int)$fila['ID_ESPECIALIDAD'],
            'colegiado' => $fila['NUMERO_COLEGIADO'],
            'nombre' => $fila['NOMBRE'],
            'apellido' => $fila['APELLIDO'],
            'especialidad' => $fila['ESPECIALIDAD'],
            'telefono' => $fila['TELEFONO'],
            'correo' => $fila['CORREO'],
            'dias' => $fila['DIAS'],
            'horaInicio' => $fila['HORA_INICIO'],
            'horaFin' => $fila['HORA_FIN'],
            'horario' => $fila['HORARIO'],
            'idClinica' => isset($fila['ID_CLINICA']) ? (int)$fila['ID_CLINICA'] : null,
            'clinica' => $fila['CLINICA'],
            'estado' => $fila['ESTADO']
        ];
    }
    echo json_encode(['correcto' => true, 'datos' => $medicos], JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['correcto' => false, 'mensaje' => 'Error al listar médicos: ' . $error->getMessage()], JSON_UNESCAPED_UNICODE);
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
