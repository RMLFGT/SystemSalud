<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderExpediente(int $codigo, bool $correcto, string $mensaje, array $datos = []): never {
    http_response_code($codigo);
    echo json_encode(['correcto' => $correcto, 'mensaje' => $mensaje, 'datos' => $datos], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') responderExpediente(405, false, 'Método no permitido.');
$conexion = null;
$consulta = null;
try {
    $conexion = conectarOracle();
    $sql = "SELECT e.id_expediente, e.id_paciente, e.observaciones_generales, e.estado,
                   TO_CHAR(e.fecha_apertura, 'YYYY-MM-DD') fecha_apertura,
                   p.dpi, p.nombre, p.apellido,
                   TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') fecha_nacimiento,
                   TRUNC(MONTHS_BETWEEN(SYSDATE, p.fecha_nacimiento) / 12) edad,
                   p.sexo, p.telefono, p.correo,
                   u.id_consulta, u.id_medico, u.id_tipo_consulta,
                   TO_CHAR(u.fecha_consulta, 'YYYY-MM-DD') fecha_consulta,
                   u.diagnostico, u.sintomas, u.tratamiento, u.observaciones,
                   u.presion_sistolica, u.presion_diastolica, u.frecuencia_cardiaca,
                   u.temperatura, u.peso, u.estado estado_consulta,
                   TRIM(m.nombre || ' ' || m.apellido) medico, tc.nombre tipo_consulta,
                   (SELECT COUNT(*) FROM consulta_medica cm WHERE cm.id_expediente = e.id_expediente) total_consultas,
                   (SELECT COUNT(*) FROM consulta_medica cm WHERE cm.id_expediente = e.id_expediente
                    AND cm.fecha_consulta >= TRUNC(SYSDATE, 'MM')
                    AND cm.fecha_consulta < ADD_MONTHS(TRUNC(SYSDATE, 'MM'), 1)) consultas_mes
            FROM expediente e JOIN paciente p ON p.id_paciente = e.id_paciente
            LEFT JOIN (SELECT cm.*, ROW_NUMBER() OVER (PARTITION BY id_expediente ORDER BY fecha_consulta DESC, id_consulta DESC) posicion
                       FROM consulta_medica cm) u ON u.id_expediente = e.id_expediente AND u.posicion = 1
            LEFT JOIN medico m ON m.id_medico = u.id_medico
            LEFT JOIN tipo_consulta tc ON tc.id_tipo_consulta = u.id_tipo_consulta
            ORDER BY e.id_expediente";
    $consulta = oci_parse($conexion, $sql);
    if (!oci_execute($consulta)) throw new RuntimeException(oci_error($consulta)['message']);
    $expedientes = [];
    while ($fila = oci_fetch_assoc($consulta)) {
        $expedientes[] = [
            'id' => (int)$fila['ID_EXPEDIENTE'], 'idPaciente' => (int)$fila['ID_PACIENTE'],
            'paciente' => trim($fila['NOMBRE'] . ' ' . $fila['APELLIDO']), 'dpi' => $fila['DPI'],
            'fechaNacimiento' => $fila['FECHA_NACIMIENTO'], 'edad' => (int)$fila['EDAD'],
            'sexo' => $fila['SEXO'], 'telefono' => $fila['TELEFONO'], 'correo' => $fila['CORREO'],
            'fechaApertura' => $fila['FECHA_APERTURA'], 'observacionesGenerales' => $fila['OBSERVACIONES_GENERALES'] ?? '',
            'estado' => $fila['ESTADO'], 'totalConsultas' => (int)$fila['TOTAL_CONSULTAS'],
            'consultasMes' => (int)$fila['CONSULTAS_MES'],
            'ultimaConsulta' => $fila['ID_CONSULTA'] === null ? null : [
                'id' => (int)$fila['ID_CONSULTA'], 'idMedico' => (int)$fila['ID_MEDICO'],
                'idTipoConsulta' => (int)$fila['ID_TIPO_CONSULTA'], 'fecha' => $fila['FECHA_CONSULTA'],
                'medico' => $fila['MEDICO'], 'tipo' => $fila['TIPO_CONSULTA'],
                'diagnostico' => $fila['DIAGNOSTICO'], 'sintomas' => $fila['SINTOMAS'] ?? '',
                'tratamiento' => $fila['TRATAMIENTO'] ?? '', 'observaciones' => $fila['OBSERVACIONES'] ?? '',
                'presion' => $fila['PRESION_SISTOLICA'] === null ? '' : $fila['PRESION_SISTOLICA'] . '/' . $fila['PRESION_DIASTOLICA'],
                'frecuencia' => $fila['FRECUENCIA_CARDIACA'], 'temperatura' => $fila['TEMPERATURA'],
                'peso' => $fila['PESO'], 'estado' => $fila['ESTADO_CONSULTA']
            ]
        ];
    }
    responderExpediente(200, true, 'Expedientes obtenidos correctamente.', $expedientes);
} catch (Throwable $error) {
    responderExpediente(500, false, 'Error al obtener expedientes: ' . $error->getMessage());
} finally {
    if ($consulta) oci_free_statement($consulta);
    if ($conexion) oci_close($conexion);
}
