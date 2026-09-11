<?php

function conectarOracle()
{
    $configuracion = require __DIR__ . '/config.local.php';

    $conexion = oci_connect(
        $configuracion['usuario'],
        $configuracion['contrasena'],
        $configuracion['conexion'],
        $configuracion['charset']
    );

    if (!$conexion) {
        $error = oci_error();

        throw new RuntimeException(
            'No fue posible conectarse con Oracle: ' .
            $error['message']
        );
    }

    return $conexion;
}