<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/../Config/conexion.php';

ini_set('session.use_strict_mode', '1');
session_start();

const TIEMPO_MAXIMO_INACTIVIDAD = 1800;

function responderNoAutorizado(string $mensaje = 'Debes iniciar sesión.'): void
{
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $parametros = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $parametros['path'],
            'domain' => $parametros['domain'],
            'secure' => $parametros['secure'],
            'httponly' => $parametros['httponly'],
            'samesite' => 'Lax'
        ]);
    }

    session_destroy();
    http_response_code(401);

    echo json_encode([
        'correcto' => false,
        'mensaje' => $mensaje
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

if (empty($_SESSION['usuario']['idUsuario'])) {
    responderNoAutorizado();
}

$ultimoMovimiento = (int) ($_SESSION['ultimoMovimiento'] ?? 0);

if ($ultimoMovimiento > 0 && time() - $ultimoMovimiento > TIEMPO_MAXIMO_INACTIVIDAD) {
    responderNoAutorizado('La sesión finalizó por inactividad.');
}

$conexion = null;
$consultaUsuario = null;
$consultaPermisos = null;

try {
    $idUsuario = (int) $_SESSION['usuario']['idUsuario'];
    $conexion = conectarOracle();

    $sqlUsuario = "
        SELECT
            u.ID_USUARIO,
            u.ID_ROL,
            u.NOMBRE,
            u.APELLIDO,
            u.NOMBRE_USUARIO,
            u.CORREO,
            r.NOMBRE AS ROL
        FROM USUARIO u
        INNER JOIN ROL r ON r.ID_ROL = u.ID_ROL
        WHERE u.ID_USUARIO = :id_usuario
          AND u.ESTADO = 'ACTIVO'
          AND r.ESTADO = 'ACTIVO'
    ";

    $consultaUsuario = oci_parse($conexion, $sqlUsuario);
    oci_bind_by_name($consultaUsuario, ':id_usuario', $idUsuario);

    if (!oci_execute($consultaUsuario)) {
        throw new RuntimeException('No fue posible validar la sesión.');
    }

    $filaUsuario = oci_fetch_assoc($consultaUsuario);

    if (!$filaUsuario) {
        responderNoAutorizado('La cuenta ya no está disponible.');
    }

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
        INNER JOIN MODULO m ON m.ID_MODULO = rm.ID_MODULO
        WHERE rm.ID_ROL = :id_rol
          AND rm.PUEDE_VER = 1
          AND m.ESTADO = 'ACTIVO'
        ORDER BY m.ID_MODULO
    ";

    $consultaPermisos = oci_parse($conexion, $sqlPermisos);
    oci_bind_by_name($consultaPermisos, ':id_rol', $idRol);

    if (!oci_execute($consultaPermisos)) {
        throw new RuntimeException('No fue posible cargar los permisos.');
    }

    $permisos = [];

    while ($fila = oci_fetch_assoc($consultaPermisos)) {
        $permisos[$fila['MODULO']] = [
            'ruta' => $fila['RUTA'],
            'ver' => (int) $fila['PUEDE_VER'] === 1,
            'crear' => (int) $fila['PUEDE_CREAR'] === 1,
            'editar' => (int) $fila['PUEDE_EDITAR'] === 1,
            'eliminar' => (int) $fila['PUEDE_ELIMINAR'] === 1
        ];
    }

    $_SESSION['usuario'] = [
        'idUsuario' => (int) $filaUsuario['ID_USUARIO'],
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
        'usuario' => $_SESSION['usuario'],
        'permisos' => $permisos
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    error_log('SaludSystem sesión: ' . $error->getMessage());
    http_response_code(500);

    echo json_encode([
        'correcto' => false,
        'mensaje' => 'No fue posible comprobar la sesión.'
    ], JSON_UNESCAPED_UNICODE);
} finally {
    if ($consultaUsuario) oci_free_statement($consultaUsuario);
    if ($consultaPermisos) oci_free_statement($consultaPermisos);
    if ($conexion) oci_close($conexion);
}
