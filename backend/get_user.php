<?php
/**
 * Obtenedor de información de la usuaria actual
 * 
 * Este script proporciona información básica sobre la usuaria actualmente autenticada.
 * Se utiliza para verificar el estado de la sesión y obtener datos
 * esenciales como nombre y email. Un desafío importante fue asegurar la correcta
 * configuración de cookies para mantener la sesión consistente entre navegadores
 * y dispositivos. También fue necesario limitar los datos devueltos para proteger
 * la privacidad de la usuaria
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

session_set_cookie_params([
    'lifetime' => 0, // La sesión expira al cerrar el navegador
    'path' => '/',
    'domain' => 'localhost',
    'secure' => false, 
    'httponly' => true,
    'samesite' => 'Lax',
]);

session_start([
    'name' => 'MomMatchSession',
]);


try {
    if (empty($_SESSION['user_id'])) {
        throw new RuntimeException('No autenticado', 401);
    }

    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("SELECT id, name, email FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user) {
        throw new RuntimeException('Usuario no encontrado', 404);
    }

    echo json_encode([
        'success' => true,
        'user' => $user,
        'timestamp' => date('c')
    ]);

} catch (RuntimeException $e) {
    http_response_code($e->getCode());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('c')
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error interno del servidor',
        'timestamp' => date('c')
    ]);
    error_log("Error en get_user: " . $e->getMessage());
}