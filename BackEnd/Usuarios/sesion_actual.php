<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
require_once __DIR__ . '/../Config/seguridad.php';
try {
    echo json_encode(cargarSesionActual(), JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    responderErrorSeguridad($error);
}
