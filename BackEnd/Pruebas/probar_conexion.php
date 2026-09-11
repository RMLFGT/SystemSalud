<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/conexion.php';

try {
    $conexion = conectarOracle();

    $sql = "
        SELECT
            USER AS usuario,
            SYS_CONTEXT('USERENV', 'SERVICE_NAME') AS servicio,
            (SELECT COUNT(*) FROM user_tables) AS total_tablas
        FROM dual
    ";

    $consulta = oci_parse($conexion, $sql);
    oci_execute($consulta);

    $resultado = oci_fetch_assoc($consulta);

    echo json_encode(
        [
            'correcto' => true,
            'mensaje' => 'Conexion exitosa con Oracle',
            'datos' => $resultado
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
            'mensaje' => $error->getMessage()
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_PRETTY_PRINT
    );
    }