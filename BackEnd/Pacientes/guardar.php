<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../Config/conexion.php';

$conexion = null;

try {

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

        http_response_code(405);

        echo json_encode([
            'correcto' => false,
            'mensaje' => 'Método no permitido'
        ]);

        exit;
    }


    $contenido = file_get_contents('php://input');

    $datos = json_decode($contenido, true);


    if (!is_array($datos)) {

        throw new InvalidArgumentException(
            'Los datos enviados no son válidos'
        );

    }


    $nombre = trim($datos['nombre'] ?? '');

    $apellido = trim($datos['apellido'] ?? '');

    $dpi = preg_replace(
        '/[^0-9]/',
        '',
        $datos['dpi'] ?? ''
    );

    $fechaNacimiento =
        trim($datos['fechaNacimiento'] ?? '');

    $sexo =
        strtoupper(trim($datos['sexo'] ?? ''));

    $tipoSangre =
        strtoupper(trim($datos['tipoSangre'] ?? ''));

    $telefono =
        trim($datos['telefono'] ?? '');

    $correo =
        trim($datos['correo'] ?? '');

    $direccion =
        trim($datos['direccion'] ?? '');

    $contactoEmergencia =
        trim($datos['contactoEmergencia'] ?? '');

    $telefonoEmergencia =
        trim($datos['telefonoEmergencia'] ?? '');


    if (
        $nombre === '' ||
        $apellido === '' ||
        $dpi === '' ||
        $fechaNacimiento === '' ||
        $sexo === ''
    ) {

        http_response_code(422);

        echo json_encode([
            'correcto' => false,
            'mensaje' => 'Completa los campos obligatorios'
        ]);

        exit;
    }


    if (!preg_match('/^[0-9]{13}$/', $dpi)) {

        http_response_code(422);

        echo json_encode([
            'correcto' => false,
            'mensaje' => 'El DPI debe contener 13 números'
        ]);

        exit;
    }


    if (!in_array(
        $sexo,
        ['MASCULINO', 'FEMENINO'],
        true
    )) {

        http_response_code(422);

        echo json_encode([
            'correcto' => false,
            'mensaje' => 'El sexo seleccionado no es válido'
        ]);

        exit;
    }


    $fechaValida = DateTime::createFromFormat(
        'Y-m-d',
        $fechaNacimiento
    );


    if (
        !$fechaValida ||
        $fechaValida->format('Y-m-d') !==
            $fechaNacimiento
    ) {

        http_response_code(422);

        echo json_encode([
            'correcto' => false,
            'mensaje' => 'La fecha de nacimiento no es válida'
        ]);

        exit;
    }


    $conexion = conectarOracle();


    $sqlPaciente = "
        INSERT INTO paciente (
            dpi,
            nombre,
            apellido,
            fecha_nacimiento,
            sexo,
            tipo_sangre,
            telefono,
            correo,
            direccion,
            contacto_emergencia,
            telefono_emergencia
        )
        VALUES (
            :dpi,
            :nombre,
            :apellido,
            TO_DATE(:fecha_nacimiento, 'YYYY-MM-DD'),
            :sexo,
            :tipo_sangre,
            :telefono,
            :correo,
            :direccion,
            :contacto_emergencia,
            :telefono_emergencia
        )
        RETURNING id_paciente INTO :nuevo_id
    ";


    $consultaPaciente =
        oci_parse($conexion, $sqlPaciente);


    $nuevoId = null;


    oci_bind_by_name(
        $consultaPaciente,
        ':dpi',
        $dpi
    );

    oci_bind_by_name(
        $consultaPaciente,
        ':nombre',
        $nombre
    );

    oci_bind_by_name(
        $consultaPaciente,
        ':apellido',
        $apellido
    );

    oci_bind_by_name(
        $consultaPaciente,
        ':fecha_nacimiento',
        $fechaNacimiento
    );

    oci_bind_by_name(
        $consultaPaciente,
        ':sexo',
        $sexo
    );

    oci_bind_by_name(
        $consultaPaciente,
        ':tipo_sangre',
        $tipoSangre
    );

    oci_bind_by_name(
        $consultaPaciente,
        ':telefono',
        $telefono
    );

    oci_bind_by_name(
        $consultaPaciente,
        ':correo',
        $correo
    );

    oci_bind_by_name(
        $consultaPaciente,
        ':direccion',
        $direccion
    );

    oci_bind_by_name(
        $consultaPaciente,
        ':contacto_emergencia',
        $contactoEmergencia
    );

    oci_bind_by_name(
        $consultaPaciente,
        ':telefono_emergencia',
        $telefonoEmergencia
    );

    oci_bind_by_name(
        $consultaPaciente,
        ':nuevo_id',
        $nuevoId,
        40
    );


    if (
        !oci_execute(
            $consultaPaciente,
            OCI_NO_AUTO_COMMIT
        )
    ) {

        $error = oci_error($consultaPaciente);

        throw new RuntimeException(
            $error['message']
        );

    }


    $sqlExpediente = "
        INSERT INTO expediente (
            id_paciente,
            observaciones_generales
        )
        VALUES (
            :id_paciente,
            'Expediente creado automáticamente'
        )
    ";


    $consultaExpediente =
        oci_parse($conexion, $sqlExpediente);


    oci_bind_by_name(
        $consultaExpediente,
        ':id_paciente',
        $nuevoId
    );


    if (
        !oci_execute(
            $consultaExpediente,
            OCI_NO_AUTO_COMMIT
        )
    ) {

        $error = oci_error($consultaExpediente);

        throw new RuntimeException(
            $error['message']
        );

    }


    oci_commit($conexion);


    http_response_code(201);

    echo json_encode(
        [
            'correcto' => true,
            'mensaje' =>
                'Paciente registrado correctamente',
            'idPaciente' => (int) $nuevoId
        ],
        JSON_UNESCAPED_UNICODE
    );


    oci_free_statement($consultaPaciente);

    oci_free_statement($consultaExpediente);

    oci_close($conexion);


} catch (Throwable $error) {

    if ($conexion) {
        oci_rollback($conexion);
    }


    $mensaje =
        str_contains(
            $error->getMessage(),
            'ORA-00001'
        )
        ? 'El DPI o correo ya se encuentra registrado'
        : 'No fue posible registrar el paciente';


    http_response_code(500);

    echo json_encode(
        [
            'correcto' => false,
            'mensaje' => $mensaje,
            'detalle' => $error->getMessage()
        ],
        JSON_UNESCAPED_UNICODE
    );

}