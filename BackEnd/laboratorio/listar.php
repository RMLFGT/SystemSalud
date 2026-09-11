<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderLaboratorio(int $codigo, bool $correcto, string $mensaje, array $datos = [], array $resumen = []): never {
    http_response_code($codigo);
    echo json_encode([
        'correcto' => $correcto,
        'mensaje' => $mensaje,
        'datos' => $datos,
        'resumen' => $resumen
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') responderLaboratorio(405, false, 'Método no permitido.');
$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $sql = "SELECT el.id_estudio, el.id_paciente, el.id_medico, el.id_consulta, el.id_tipo_estudio,
                   TO_CHAR(el.fecha_solicitud, 'YYYY-MM-DD') fecha_solicitud,
                   TO_CHAR(el.fecha_resultado, 'YYYY-MM-DD') fecha_resultado,
                   el.resultado, el.observaciones, el.estado,
                   TRIM(p.nombre || ' ' || p.apellido) paciente,
                   TRIM(m.nombre || ' ' || m.apellido) medico,
                   te.nombre tipo_estudio
            FROM estudio_laboratorio el
            JOIN paciente p ON p.id_paciente = el.id_paciente
            JOIN medico m ON m.id_medico = el.id_medico
            JOIN tipo_estudio te ON te.id_tipo_estudio = el.id_tipo_estudio
            ORDER BY el.fecha_solicitud DESC, el.id_estudio DESC";
    $consulta = oci_parse($conexion, $sql);
    if (!@oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    $estudios = [];
    $resumen = ['total' => 0, 'pendientes' => 0, 'enProceso' => 0, 'completados' => 0, 'esteMes' => 0];
    $mesActual = date('Y-m');
    while ($fila = oci_fetch_assoc($consulta)) {
        $estado = $fila['ESTADO'];
        $fechaSolicitud = $fila['FECHA_SOLICITUD'];
        $estudios[] = [
            'id' => (int)$fila['ID_ESTUDIO'],
            'idPaciente' => (int)$fila['ID_PACIENTE'],
            'idMedico' => (int)$fila['ID_MEDICO'],
            'idConsulta' => $fila['ID_CONSULTA'] === null ? null : (int)$fila['ID_CONSULTA'],
            'idTipoEstudio' => (int)$fila['ID_TIPO_ESTUDIO'],
            'paciente' => $fila['PACIENTE'],
            'medico' => $fila['MEDICO'],
            'estudio' => $fila['TIPO_ESTUDIO'],
            'fechaSolicitud' => $fechaSolicitud,
            'fechaResultado' => $fila['FECHA_RESULTADO'],
            'resultado' => $fila['RESULTADO'] ?? '',
            'observaciones' => $fila['OBSERVACIONES'] ?? '',
            'estado' => $estado
        ];
        $resumen['total']++;
        if ($estado === 'PENDIENTE') $resumen['pendientes']++;
        elseif ($estado === 'EN_PROCESO') $resumen['enProceso']++;
        elseif ($estado === 'COMPLETADO') $resumen['completados']++;
        if (str_starts_with($fechaSolicitud, $mesActual)) $resumen['esteMes']++;
    }
    responderLaboratorio(200, true, 'Estudios obtenidos correctamente.', $estudios, $resumen);
} catch (Throwable $error) {
    responderLaboratorio(500, false, 'Error al obtener los estudios: ' . $error->getMessage());
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
