<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'correcto' => false,
        'mensaje' => 'Método no permitido.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../Config/conexion.php';

ini_set('session.use_strict_mode', '1');

session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start();

$conexion = null;
$consultaUsuario = null;
$consultaPermisos = null;
$consultaAcceso = null;

try {
    $entrada = json_decode(file_get_contents('php://input'), true);

    if (!is_array($entrada)) {
        throw new InvalidArgumentException('La solicitud enviada no es válida.');
    }

    $credencial = trim((string) ($entrada['usuario'] ?? ''));
    $password = (string) ($entrada['password'] ?? '');

    if ($credencial === '' || $password === '') {
        throw new InvalidArgumentException('Completa todos los campos.');
    }

    if (mb_strlen($credencial) > 120 || strlen($password) > 255) {
        throw new InvalidArgumentException('Las credenciales enviadas no son válidas.');
    }

    $conexion = conectarOracle();

    $sqlUsuario = "
        SELECT
            u.ID_USUARIO,
            u.ID_ROL,
            u.NOMBRE,
            u.APELLIDO,
            u.NOMBRE_USUARIO,
            u.CORREO,
            u.CONTRASENA_HASH,
            r.NOMBRE AS ROL
        FROM USUARIO u
        INNER JOIN ROL r
            ON r.ID_ROL = u.ID_ROL
        WHERE (
            LOWER(u.NOMBRE_USUARIO) = LOWER(:credencial_usuario)
            OR LOWER(u.CORREO) = LOWER(:credencial_correo)
        )
          AND u.ESTADO = 'ACTIVO'
          AND r.ESTADO = 'ACTIVO'
    ";

    $consultaUsuario = oci_parse($conexion, $sqlUsuario);

    if (!$consultaUsuario) {
        throw new RuntimeException('No fue posible preparar la autenticación.');
    }

    oci_bind_by_name($consultaUsuario, ':credencial_usuario', $credencial, 120);
    oci_bind_by_name($consultaUsuario, ':credencial_correo', $credencial, 120);

    if (!oci_execute($consultaUsuario)) {
        throw new RuntimeException('No fue posible consultar las credenciales.');
    }

    $filaUsuario = oci_fetch_assoc($consultaUsuario);

    if (!$filaUsuario || !password_verify($password, $filaUsuario['CONTRASENA_HASH'])) {
        http_response_code(401);
        echo json_encode([
            'correcto' => false,
            'mensaje' => 'Usuario o contraseña incorrectos.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $idUsuario = (int) $filaUsuario['ID_USUARIO'];
    $idRol = (int) $filaUsuario['ID_ROL'];

    $sqlPermisos = "
        SELECT
            m.NOMBRE AS MODULO,
            m.RUTA,
            rm.PUEDE_VER,
            rm.PUEDE_CREAR,
            rm.PUEDE_EDITAR,
            rm.PUEDE_ELIMINAR
        FROM ROL_MODULO rm
        INNER JOIN MODULO m
            ON m.ID_MODULO = rm.ID_MODULO
        WHERE rm.ID_ROL = :id_rol
          AND rm.PUEDE_VER = 1
          AND m.ESTADO = 'ACTIVO'
        ORDER BY m.ID_MODULO
    ";

    $consultaPermisos = oci_parse($conexion, $sqlPermisos);
    oci_bind_by_name($consultaPermisos, ':id_rol', $idRol);

    if (!oci_execute($consultaPermisos)) {
        throw new RuntimeException('No fue posible cargar los permisos del usuario.');
    }

    $permisos = [];

    while ($filaPermiso = oci_fetch_assoc($consultaPermisos)) {
        $permisos[$filaPermiso['MODULO']] = [
            'ruta' => $filaPermiso['RUTA'],
            'ver' => (int) $filaPermiso['PUEDE_VER'] === 1,
            'crear' => (int) $filaPermiso['PUEDE_CREAR'] === 1,
            'editar' => (int) $filaPermiso['PUEDE_EDITAR'] === 1,
            'eliminar' => (int) $filaPermiso['PUEDE_ELIMINAR'] === 1
        ];
    }

    $sqlAcceso = "
        UPDATE USUARIO
        SET ULTIMO_ACCESO = SYSTIMESTAMP
        WHERE ID_USUARIO = :id_usuario
    ";

    $consultaAcceso = oci_parse($conexion, $sqlAcceso);
    oci_bind_by_name($consultaAcceso, ':id_usuario', $idUsuario);

    if (!oci_execute($consultaAcceso, OCI_NO_AUTO_COMMIT)) {
        oci_rollback($conexion);
        throw new RuntimeException('No fue posible actualizar el último acceso.');
    }

    if (!oci_commit($conexion)) {
        oci_rollback($conexion);
        throw new RuntimeException('No fue posible confirmar el inicio de sesión.');
    }

    session_regenerate_id(true);

    $_SESSION['usuario'] = [
        'idUsuario' => $idUsuario,
        'idRol' => $idRol,
        'nombre' => $filaUsuario['NOMBRE'],
        'apellido' => $filaUsuario['APELLIDO'],
        'nombreUsuario' => $filaUsuario['NOMBRE_USUARIO'],
        'correo' => $filaUsuario['CORREO'],
        'rol' => $filaUsuario['ROL']
    ];

    $_SESSION['permisos'] = $permisos;
    $_SESSION['ultimoMovimiento'] = time();

    echo json_encode([
        'correcto' => true,
        'mensaje' => 'Inicio de sesión correcto.',
        'usuario' => $_SESSION['usuario']
    ], JSON_UNESCAPED_UNICODE);
} catch (InvalidArgumentException $error) {
    http_response_code(400);
    echo json_encode([
        'correcto' => false,
        'mensaje' => $error->getMessage()
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    error_log('SaludSystem login: ' . $error->getMessage());

    http_response_code(500);
    echo json_encode([
        'correcto' => false,
        'mensaje' => 'No fue posible iniciar sesión. Inténtalo nuevamente.'
    ], JSON_UNESCAPED_UNICODE);
} finally {
    if ($consultaUsuario) {
        oci_free_statement($consultaUsuario);
    }

    if ($consultaPermisos) {
        oci_free_statement($consultaPermisos);
    }

    if ($consultaAcceso) {
        oci_free_statement($consultaAcceso);
    }

    if ($conexion) {
        oci_close($conexion);
    }
}
