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

ini_set('session.use_strict_mode', '1');
session_start();

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

echo json_encode([
    'correcto' => true,
    'mensaje' => 'Sesión cerrada correctamente.'
], JSON_UNESCAPED_UNICODE);
