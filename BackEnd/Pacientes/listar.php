<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../Config/conexion.php';

try {
    $conexion = conectarOracle();

    $sql = "
        SELECT
            id_paciente,
            dpi,
            nombre,
            apellido,
            TO_CHAR(fecha_nacimiento, 'YYYY-MM-DD')
                AS fecha_nacimiento,
            TRUNC(
                MONTHS_BETWEEN(SYSDATE, fecha_nacimiento) / 12
            ) AS edad,
            sexo,
            tipo_sangre,
            telefono,
            correo,
            direccion,
            contacto_emergencia,
            telefono_emergencia,
            estado
        FROM paciente
        ORDER BY id_paciente
    ";

    $consulta = oci_parse($conexion, $sql);

    if (!oci_execute($consulta)) {
        $error = oci_error($consulta);
        throw new RuntimeException($error['message']);
    }

    $pacientes = [];

    while ($fila = oci_fetch_assoc($consulta)) {
        $pacientes[] = [
            'id' => (int) $fila['ID_PACIENTE'],
            'dpi' => $fila['DPI'],
            'nombre' => $fila['NOMBRE'],
            'apellido' => $fila['APELLIDO'],
            'fechaNacimiento' => $fila['FECHA_NACIMIENTO'],
            'edad' => (int) $fila['EDAD'],
            'sexo' => $fila['SEXO'],
            'tipoSangre' => $fila['TIPO_SANGRE'],
            'telefono' => $fila['TELEFONO'],
            'correo' => $fila['CORREO'],
            'direccion' => $fila['DIRECCION'],
            'contactoEmergencia' => $fila['CONTACTO_EMERGENCIA'],
            'telefonoEmergencia' => $fila['TELEFONO_EMERGENCIA'],
            'estado' => $fila['ESTADO']
        ];
    }

    echo json_encode(
        [
            'correcto' => true,
            'total' => count($pacientes),
            'datos' => $pacientes
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_PRETTY_PRINT
    );

    oci_free_statement($consulta);
    oci_close($conexion);

} catch (Throwable $error) {
    http_response_code(500);

    echo json_encode(
        [
            'correcto' => false,
            'mensaje' => 'No fue posible obtener los pacientes',
            'detalle' => $error->getMessage()
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_PRETTY_PRINT
    );
}