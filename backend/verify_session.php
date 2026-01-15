<?php
/**
 * Verificador universal de sesiones
 * 
 * Este script es fundamental para la seguridad,
 * proporcionando un punto centralizado para la verificación de sesiones
 * de usuaria y admin. Implementa un sistema de cascada que primero
 * intenta verificar una sesión de usuaria regular y, si no existe, verifica
 * una sesión de admin
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';
header('Content-Type: application/json; charset=UTF-8');

// Primero verificar si existe una sesión de usuario normal
session_start([
    'name' => 'MomMatchSession',
]);

$userSession = false;
$isAdmin = false;

// Verificar sesión de usuario normal
if (isset($_SESSION['user_id'])) {
    $userId = $_SESSION['user_id'];
    $userSession = true;
} else {
    // Si no hay sesión de usuario, verificar sesión de administrador
    session_write_close(); // Cerrar sesión actual antes de abrir otra
    session_start([
        'name' => 'MomMatchAdminSession',
    ]);
    
    if (isset($_SESSION['user_id']) && isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true) {
        $userId = $_SESSION['user_id'];
        $isAdmin = true;
        $userSession = true;
    }
}

if (!$userSession) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "No autenticado"]);
    exit;
}

// Actualizar la marca de tiempo de la última actividad
$pdo = getDatabaseConnection();
$stmt = $pdo->prepare("UPDATE users SET last_active = NOW() WHERE id = :user_id");
$stmt->execute([':user_id' => $userId]);

if ($isAdmin) {
    // Obtener datos del admin
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("SELECT id, username AS name, email FROM admin_users WHERE id = ?");
    $stmt->execute([$userId]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($admin) {
        echo json_encode([
            "success" => true,
            "user" => [
                "id" => $admin['id'],
                "name" => $admin['name'],
                "email" => $admin['email'],
                "is_admin" => true
            ]
        ]);
        exit;
    }
} else {
    // Obtener datos de la usuaria normal
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("SELECT id, name, email FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        echo json_encode([
            "success" => true,
            "user" => $user
        ]);
        exit;
    }
}

http_response_code(401);
echo json_encode(["success" => false, "error" => "No autenticado"]);