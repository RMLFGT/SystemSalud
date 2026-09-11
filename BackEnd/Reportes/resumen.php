<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';

function responderReporte(
    int $codigo,
    bool $correcto,
    string $mensaje,
    array $resumen = [],
    array $actividadMensual = [],
    array $distribucionEdades = [],
    array $resumenCitas = [],
    array $detalles = []
): never {
    http_response_code($codigo);
    echo json_encode([
        'correcto' => $correcto,
        'mensaje' => $mensaje,
        'resumen' => $resumen,
        'actividadMensual' => $actividadMensual,
        'distribucionEdades' => $distribucionEdades,
        'resumenCitas' => $resumenCitas,
        'detalles' => $detalles
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function fechaValida(string $fecha): bool {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
        return false;
    }

    $objeto = DateTimeImmutable::createFromFormat('!Y-m-d', $fecha);
    $errores = DateTimeImmutable::getLastErrors();

    return $objeto !== false &&
        (
            $errores === false ||
            ($errores['warning_count'] === 0 && $errores['error_count'] === 0)
        );
}

function consultarValor(
    $conexion,
    string $sql,
    array $parametros = []
): string {
    $consulta = oci_parse($conexion, $sql);

    foreach ($parametros as $nombre => &$valor) {
        oci_bind_by_name($consulta, $nombre, $valor);
    }
    unset($valor);

    if (!@oci_execute($consulta)) {
        $error = oci_error($consulta);
        oci_free_statement($consulta);
        throw new RuntimeException($error['message']);
    }

    $fila = oci_fetch_assoc($consulta);
    oci_free_statement($consulta);

    return (string)($fila['VALOR'] ?? '0');
}

function consultarFilas(
    $conexion,
    string $sql,
    array $parametros = []
): array {
    $consulta = oci_parse($conexion, $sql);

    foreach ($parametros as $nombre => &$valor) {
        oci_bind_by_name($consulta, $nombre, $valor);
    }
    unset($valor);

    if (!@oci_execute($consulta)) {
        $error = oci_error($consulta);
        oci_free_statement($consulta);
        throw new RuntimeException($error['message']);
    }

    $filas = [];
    while ($fila = oci_fetch_assoc($consulta)) {
        $filas[] = $fila;
    }
    oci_free_statement($consulta);

    return $filas;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    responderReporte(405, false, 'Método no permitido.');
}

$desde = trim((string)($_GET['desde'] ?? ''));
$hasta = trim((string)($_GET['hasta'] ?? ''));
$tipo = strtolower(trim((string)($_GET['tipo'] ?? 'general')));

$tiposPermitidos = ['general', 'pacientes', 'citas', 'laboratorio', 'farmacia'];
if (!in_array($tipo, $tiposPermitidos, true)) {
    responderReporte(400, false, 'El tipo de reporte indicado no es válido.');
}

if (!fechaValida($desde) || !fechaValida($hasta)) {
    responderReporte(
        400,
        false,
        'Debe indicar fechas válidas con el formato YYYY-MM-DD.'
    );
}

if ($desde > $hasta) {
    responderReporte(
        400,
        false,
        'La fecha inicial no puede ser mayor que la fecha final.'
    );
}

$conexion = null;

try {
    $conexion = conectarOracle();
    $periodo = [':desde' => $desde, ':hasta' => $hasta];

    $pacientes = (int)consultarValor(
        $conexion,
        "SELECT COUNT(*) AS valor FROM paciente"
    );

    $medicosActivos = (int)consultarValor(
        $conexion,
        "SELECT COUNT(*) AS valor
         FROM medico
         WHERE estado = 'ACTIVO'"
    );

    $citasPeriodo = (int)consultarValor(
        $conexion,
        "SELECT COUNT(*) AS valor
         FROM cita
         WHERE fecha_hora >= TO_DATE(:desde, 'YYYY-MM-DD')
           AND fecha_hora < TO_DATE(:hasta, 'YYYY-MM-DD') + 1",
        $periodo
    );

    $estudiosPeriodo = (int)consultarValor(
        $conexion,
        "SELECT COUNT(*) AS valor
         FROM estudio_laboratorio
         WHERE fecha_solicitud >= TO_DATE(:desde, 'YYYY-MM-DD')
           AND fecha_solicitud < TO_DATE(:hasta, 'YYYY-MM-DD') + 1",
        $periodo
    );

    $consultasFinalizadas = (int)consultarValor(
        $conexion,
        "SELECT COUNT(*) AS valor
         FROM consulta_medica
         WHERE estado = 'FINALIZADA'
           AND fecha_consulta >= TO_DATE(:desde, 'YYYY-MM-DD')
           AND fecha_consulta < TO_DATE(:hasta, 'YYYY-MM-DD') + 1",
        $periodo
    );

    $expedientesActivos = (int)consultarValor(
        $conexion,
        "SELECT COUNT(*) AS valor
         FROM expediente
         WHERE estado = 'ACTIVO'"
    );

    $medicamentosActivos = (int)consultarValor(
        $conexion,
        "SELECT COUNT(*) AS valor
         FROM medicamento
         WHERE estado = 'ACTIVO'"
    );

    $stockBajo = (int)consultarValor(
        $conexion,
        "SELECT COUNT(*) AS valor
         FROM medicamento
         WHERE estado = 'ACTIVO'
           AND stock <= stock_minimo"
    );

    $unidadesDisponibles = (int)consultarValor(
        $conexion,
        "SELECT NVL(SUM(stock), 0) AS valor
         FROM medicamento
         WHERE estado = 'ACTIVO'"
    );

    $valorTexto = consultarValor(
        $conexion,
        "SELECT TO_CHAR(
                    NVL(SUM(stock * precio), 0),
                    'FM9999999990D00',
                    'NLS_NUMERIC_CHARACTERS=''.,'''
                ) AS valor
         FROM medicamento
         WHERE estado = 'ACTIVO'"
    );
    $valorInventario = (float)str_replace(',', '.', $valorTexto);

    $actividad = [];

    $filasCitas = consultarFilas(
        $conexion,
        "SELECT TO_CHAR(TRUNC(fecha_hora, 'MM'), 'YYYY-MM') AS periodo,
                COUNT(*) AS cantidad
         FROM cita
         WHERE fecha_hora >= TO_DATE(:desde, 'YYYY-MM-DD')
           AND fecha_hora < TO_DATE(:hasta, 'YYYY-MM-DD') + 1
         GROUP BY TRUNC(fecha_hora, 'MM')
         ORDER BY TRUNC(fecha_hora, 'MM')",
        $periodo
    );

    foreach ($filasCitas as $fila) {
        $mes = $fila['PERIODO'];
        $actividad[$mes] = [
            'periodo' => $mes,
            'citas' => (int)$fila['CANTIDAD'],
            'estudios' => 0
        ];
    }

    $filasEstudios = consultarFilas(
        $conexion,
        "SELECT TO_CHAR(TRUNC(fecha_solicitud, 'MM'), 'YYYY-MM') AS periodo,
                COUNT(*) AS cantidad
         FROM estudio_laboratorio
         WHERE fecha_solicitud >= TO_DATE(:desde, 'YYYY-MM-DD')
           AND fecha_solicitud < TO_DATE(:hasta, 'YYYY-MM-DD') + 1
         GROUP BY TRUNC(fecha_solicitud, 'MM')
         ORDER BY TRUNC(fecha_solicitud, 'MM')",
        $periodo
    );

    foreach ($filasEstudios as $fila) {
        $mes = $fila['PERIODO'];
        if (!isset($actividad[$mes])) {
            $actividad[$mes] = [
                'periodo' => $mes,
                'citas' => 0,
                'estudios' => 0
            ];
        }
        $actividad[$mes]['estudios'] = (int)$fila['CANTIDAD'];
    }

    ksort($actividad);
    $actividadMensual = array_values($actividad);

    $distribucionBase = [
        'ninos' => 0,
        'jovenes' => 0,
        'adultos' => 0,
        'adultosMayores' => 0
    ];

    $filasEdades = consultarFilas(
        $conexion,
        "SELECT CASE
                    WHEN TRUNC(MONTHS_BETWEEN(SYSDATE, fecha_nacimiento) / 12) < 18
                        THEN 'NINOS'
                    WHEN TRUNC(MONTHS_BETWEEN(SYSDATE, fecha_nacimiento) / 12) < 30
                        THEN 'JOVENES'
                    WHEN TRUNC(MONTHS_BETWEEN(SYSDATE, fecha_nacimiento) / 12) < 60
                        THEN 'ADULTOS'
                    ELSE 'ADULTOS_MAYORES'
                END AS grupo,
                COUNT(*) AS cantidad
         FROM paciente
         GROUP BY CASE
                    WHEN TRUNC(MONTHS_BETWEEN(SYSDATE, fecha_nacimiento) / 12) < 18
                        THEN 'NINOS'
                    WHEN TRUNC(MONTHS_BETWEEN(SYSDATE, fecha_nacimiento) / 12) < 30
                        THEN 'JOVENES'
                    WHEN TRUNC(MONTHS_BETWEEN(SYSDATE, fecha_nacimiento) / 12) < 60
                        THEN 'ADULTOS'
                    ELSE 'ADULTOS_MAYORES'
                  END"
    );

    foreach ($filasEdades as $fila) {
        $clave = match ($fila['GRUPO']) {
            'NINOS' => 'ninos',
            'JOVENES' => 'jovenes',
            'ADULTOS' => 'adultos',
            default => 'adultosMayores'
        };
        $distribucionBase[$clave] = (int)$fila['CANTIDAD'];
    }

    $filasResumenCitas = consultarFilas(
        $conexion,
        "SELECT m.id_medico,
                TRIM(m.nombre || ' ' || m.apellido) AS medico,
                e.nombre AS especialidad,
                TO_CHAR(MAX(c.fecha_hora), 'YYYY-MM-DD') AS ultima_fecha,
                COUNT(DISTINCT c.id_cita) AS citas,
                COUNT(DISTINCT CASE
                    WHEN cm.estado = 'FINALIZADA' THEN c.id_cita
                END) AS completadas,
                COUNT(DISTINCT CASE
                    WHEN c.estado = 'CANCELADA' THEN c.id_cita
                END) AS canceladas
         FROM cita c
         JOIN medico m ON m.id_medico = c.id_medico
         JOIN especialidad e ON e.id_especialidad = m.id_especialidad
         LEFT JOIN consulta_medica cm ON cm.id_cita = c.id_cita
         WHERE c.fecha_hora >= TO_DATE(:desde, 'YYYY-MM-DD')
           AND c.fecha_hora < TO_DATE(:hasta, 'YYYY-MM-DD') + 1
         GROUP BY m.id_medico, m.nombre, m.apellido, e.nombre
         ORDER BY citas DESC, medico",
        $periodo
    );

    $resumenCitas = [];
    foreach ($filasResumenCitas as $fila) {
        $totalCitas = (int)$fila['CITAS'];
        $completadas = (int)$fila['COMPLETADAS'];
        $resumenCitas[] = [
            'idMedico' => (int)$fila['ID_MEDICO'],
            'medico' => $fila['MEDICO'],
            'especialidad' => $fila['ESPECIALIDAD'],
            'ultimaFecha' => $fila['ULTIMA_FECHA'],
            'citas' => $totalCitas,
            'completadas' => $completadas,
            'canceladas' => (int)$fila['CANCELADAS'],
            'cumplimiento' => $totalCitas > 0
                ? (int)round(($completadas / $totalCitas) * 100)
                : 0
        ];
    }

    $estadosCitas = [];
    $filasEstadosCitas = consultarFilas(
        $conexion,
        "SELECT estado, COUNT(*) AS cantidad
         FROM cita
         WHERE fecha_hora >= TO_DATE(:desde, 'YYYY-MM-DD')
           AND fecha_hora < TO_DATE(:hasta, 'YYYY-MM-DD') + 1
         GROUP BY estado
         ORDER BY estado",
        $periodo
    );
    foreach ($filasEstadosCitas as $fila) {
        $estadosCitas[] = [
            'estado' => $fila['ESTADO'],
            'cantidad' => (int)$fila['CANTIDAD']
        ];
    }

    $estadosLaboratorio = [];
    $filasEstadosLaboratorio = consultarFilas(
        $conexion,
        "SELECT estado, COUNT(*) AS cantidad
         FROM estudio_laboratorio
         WHERE fecha_solicitud >= TO_DATE(:desde, 'YYYY-MM-DD')
           AND fecha_solicitud < TO_DATE(:hasta, 'YYYY-MM-DD') + 1
         GROUP BY estado
         ORDER BY estado",
        $periodo
    );
    foreach ($filasEstadosLaboratorio as $fila) {
        $estadosLaboratorio[] = [
            'estado' => $fila['ESTADO'],
            'cantidad' => (int)$fila['CANTIDAD']
        ];
    }

    $inventario = [];
    $filasInventario = consultarFilas(
        $conexion,
        "SELECT id_medicamento,
                nombre,
                stock,
                stock_minimo,
                TO_CHAR(
                    precio,
                    'FM999999990D00',
                    'NLS_NUMERIC_CHARACTERS=''.,'''
                ) AS precio,
                estado
         FROM medicamento
         ORDER BY nombre"
    );
    foreach ($filasInventario as $fila) {
        $inventario[] = [
            'id' => (int)$fila['ID_MEDICAMENTO'],
            'nombre' => $fila['NOMBRE'],
            'stock' => (int)$fila['STOCK'],
            'stockMinimo' => (int)$fila['STOCK_MINIMO'],
            'precio' => (float)str_replace(',', '.', $fila['PRECIO']),
            'estado' => $fila['ESTADO']
        ];
    }

    $detalles = [
        'tipo' => $tipo,
        'estadosCitas' => $estadosCitas,
        'estadosLaboratorio' => $estadosLaboratorio,
        'inventario' => $inventario
    ];

    responderReporte(
        200,
        true,
        'Resumen obtenido correctamente.',
        [
            'desde' => $desde,
            'hasta' => $hasta,
            'pacientes' => $pacientes,
            'medicosActivos' => $medicosActivos,
            'citasPeriodo' => $citasPeriodo,
            'estudiosPeriodo' => $estudiosPeriodo,
            'consultasFinalizadas' => $consultasFinalizadas,
            'expedientesActivos' => $expedientesActivos,
            'medicamentosActivos' => $medicamentosActivos,
            'unidadesDisponibles' => $unidadesDisponibles,
            'stockBajo' => $stockBajo,
            'valorInventario' => $valorInventario
        ],
        $actividadMensual,
        $distribucionBase,
        $resumenCitas,
        $detalles
    );
} catch (Throwable $error) {
    responderReporte(
        500,
        false,
        'Error al obtener el resumen: ' . $error->getMessage()
    );
} finally {
    if ($conexion) {
        oci_close($conexion);
    }
}
