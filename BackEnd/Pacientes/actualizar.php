<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Config/conexion.php';
$conexion = null;

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
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

    $idPaciente = (int) ($datos['id'] ?? 0);
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

    if ($idPaciente <= 0) {
        http_response_code(422);
        echo json_encode([
            'correcto' => false,
            'mensaje' => 'El identificador del paciente no es válido'
        ]);

        exit;
    }

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
    $sql = "
        UPDATE paciente
        SET
            dpi = :dpi,
            nombre = :nombre,
            apellido = :apellido,
            fecha_nacimiento =
                TO_DATE(:fecha_nacimiento, 'YYYY-MM-DD'),
            sexo = :sexo,
            tipo_sangre = :tipo_sangre,
            telefono = :telefono,
            correo = :correo,
            direccion = :direccion,
            contacto_emergencia = :contacto_emergencia,
            telefono_emergencia = :telefono_emergencia
        WHERE id_paciente = :id_paciente
    ";

    $consulta = oci_parse($conexion, $sql);
    oci_bind_by_name(
        $consulta,
        ':dpi',
        $dpi
    );

    oci_bind_by_name(
        $consulta,
        ':nombre',
        $nombre
    );

    oci_bind_by_name(
        $consulta,
        ':apellido',
        $apellido
    );

    oci_bind_by_name(
        $consulta,
        ':fecha_nacimiento',
        $fechaNacimiento
    );

    oci_bind_by_name(
        $consulta,
        ':sexo',
        $sexo
    );

    oci_bind_by_name(
        $consulta,
        ':tipo_sangre',
        $tipoSangre
    );

    oci_bind_by_name(
        $consulta,
        ':telefono',
        $telefono
    );

    oci_bind_by_name(
        $consulta,
        ':correo',
        $correo
    );

    oci_bind_by_name(
        $consulta,
        ':direccion',
        $direccion
    );

    oci_bind_by_name(
        $consulta,
        ':contacto_emergencia',
        $contactoEmergencia
    );

    oci_bind_by_name(
        $consulta,
        ':telefono_emergencia',
        $telefonoEmergencia
    );

    oci_bind_by_name(
        $consulta,
        ':id_paciente',
        $idPaciente
    );

    if (
        !oci_execute(
            $consulta,
            OCI_NO_AUTO_COMMIT
        )
    ) {
        $error = oci_error($consulta);
        throw new RuntimeException(
            $error['message']
        );
    }

    if (oci_num_rows($consulta) === 0) {
        oci_rollback($conexion);
        http_response_code(404);
        echo json_encode([
            'correcto' => false,
            'mensaje' => 'El paciente no existe'
        ]);
        exit;
    }

    oci_commit($conexion);
    echo json_encode(
        [
            'correcto' => true,
            'mensaje' =>
                'Paciente actualizado correctamente'
        ],
        JSON_UNESCAPED_UNICODE
    );

    oci_free_statement($consulta);
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
        ? 'El DPI o correo pertenece a otro paciente'
        : 'No fue posible actualizar el paciente';

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