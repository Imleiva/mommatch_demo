<?php
/**
 * Sistema de cierre de sesión universal
 * 
 * Este script maneja el cierre de sesión para todos los tipos de usuarias
 * (regulares y admin)
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

header("Content-Type: application/json");

// Primero verificar sesión de usuaria normal
session_start([
    'name' => 'MomMatchSession',
]);

// Destruir la sesión de usuaria normal
session_unset();
session_destroy();

// Cerrar la sesión actual antes de intentar abrir la de admin
session_write_close();

// Ahora verificar sesión de admin
session_start([
    'name' => 'MomMatchAdminSession',
]);

// Destruir también la sesión de admin
session_unset();
session_destroy();

// Eliminar cookies de sesión correctamente
setcookie("MomMatchSession", "", time() - 3600, "/", "", false, true);
setcookie("MomMatchAdminSession", "", time() - 3600, "/", "", false, true);

// Responder con JSON en lugar de redireccionar (la redirección la maneja el frontend)
echo json_encode(["success" => true, "message" => "Sesión cerrada correctamente"]);
exit();