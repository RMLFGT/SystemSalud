<?php
declare(strict_types=1);
require_once __DIR__ . '/../Config/seguridad.php';
exigirPermiso('INICIO', 'ver');
header('Content-Type: application/json; charset=utf-8');

// Session was revalidated by exigirPermiso on this same request.
function permiteInicio(string $modulo): bool {
    return ($_SESSION['permisos'][$modulo]['ver'] ?? false) === true;
}

function filasInicio($conexion, string $sql): array {
    $consulta = oci_parse($conexion, $sql);
    if (!$consulta) throw new RuntimeException('No fue posible preparar la consulta.');
    try {
        if (!oci_execute($consulta)) throw new RuntimeException('No fue posible ejecutar la consulta.');
        $filas = [];
        while ($fila = oci_fetch_assoc($consulta)) $filas[] = $fila;
        return $filas;
    } finally {
        oci_free_statement($consulta);
    }
}

function cantidadInicio($conexion, string $sql): int {
    $filas = filasInicio($conexion, $sql);
    if (!isset($filas[0]['CANTIDAD']) || !is_numeric($filas[0]['CANTIDAD'])) {
        throw new RuntimeException('La consulta no devolvió el indicador esperado.');
    }
    return (int)$filas[0]['CANTIDAD'];
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo json_encode(['correcto' => false, 'mensaje' => 'Método no permitido.']);
    exit;
}

$conexion = null;
try {
    $conexion = conectarOracle();
    $datos = array_fill_keys(['pacientes','pacientesMes','citasHoy','citasAtendidasHoy',
        'medicosActivos','resultadosPendientes','consultasAbiertas','expedientesActivos'], null);
    if (permiteInicio('PACIENTES')) {
        $datos['pacientes'] = cantidadInicio($conexion, 'SELECT COUNT(*) CANTIDAD FROM paciente');
        $datos['pacientesMes'] = cantidadInicio($conexion, "SELECT COUNT(*) CANTIDAD FROM paciente
            WHERE fecha_registro >= TRUNC(SYSDATE, 'MM') AND fecha_registro < ADD_MONTHS(TRUNC(SYSDATE, 'MM'), 1)");
    }
    if (permiteInicio('MEDICOS')) {
        $datos['medicosActivos'] = cantidadInicio($conexion, "SELECT COUNT(*) CANTIDAD FROM medico WHERE estado = 'ACTIVO'");
    }
    if (permiteInicio('LABORATORIO')) {
        $datos['resultadosPendientes'] = cantidadInicio($conexion, "SELECT COUNT(*) CANTIDAD FROM estudio_laboratorio WHERE estado IN ('PENDIENTE', 'EN_PROCESO')");
    }
    if (permiteInicio('EXPEDIENTES')) {
        $datos['consultasAbiertas'] = cantidadInicio($conexion, "SELECT COUNT(*) CANTIDAD FROM consulta_medica WHERE estado = 'ABIERTA'");
        $datos['expedientesActivos'] = cantidadInicio($conexion, "SELECT COUNT(*) CANTIDAD FROM expediente WHERE estado = 'ACTIVO'");
    }
    $datos['citasPermitidas'] = permiteInicio('CITAS');
    $datos['proximasCitas'] = [];
    if ($datos['citasPermitidas']) {
        $datos['citasHoy'] = cantidadInicio($conexion, "SELECT COUNT(*) CANTIDAD FROM cita
            WHERE fecha_hora >= TRUNC(SYSDATE) AND fecha_hora < TRUNC(SYSDATE) + 1 AND estado <> 'CANCELADA'");
        $datos['citasAtendidasHoy'] = cantidadInicio($conexion, "SELECT COUNT(*) CANTIDAD FROM cita c
            WHERE c.fecha_hora >= TRUNC(SYSDATE) AND c.fecha_hora < TRUNC(SYSDATE) + 1
              AND c.estado <> 'CANCELADA' AND (c.estado = 'ATENDIDA' OR EXISTS
                (SELECT 1 FROM consulta_medica cm WHERE cm.id_cita = c.id_cita AND cm.estado = 'FINALIZADA'))");
        $filas = filasInicio($conexion, "SELECT paciente, especialidad, hora FROM (
            SELECT TRIM(p.nombre || ' ' || p.apellido) paciente, e.nombre especialidad,
                   TO_CHAR(c.fecha_hora, 'HH24:MI') hora
            FROM cita c JOIN paciente p ON p.id_paciente = c.id_paciente
            JOIN medico m ON m.id_medico = c.id_medico
            JOIN especialidad e ON e.id_especialidad = m.id_especialidad
            WHERE c.fecha_hora >= SYSDATE AND c.fecha_hora < TRUNC(SYSDATE) + 1
              AND c.estado IN ('PENDIENTE', 'CONFIRMADA')
            ORDER BY c.fecha_hora, c.id_cita
        ) WHERE ROWNUM <= 4");
        foreach ($filas as $fila) $datos['proximasCitas'][] = [
            'paciente' => $fila['PACIENTE'], 'especialidad' => $fila['ESPECIALIDAD'], 'hora' => $fila['HORA']
        ];
    }
    echo json_encode(['correcto' => true, 'datos' => $datos], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    error_log('SaludSystem inicio: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['correcto' => false, 'mensaje' => 'No fue posible consultar el panel.'], JSON_UNESCAPED_UNICODE);
} finally {
    if ($conexion) oci_close($conexion);
}
