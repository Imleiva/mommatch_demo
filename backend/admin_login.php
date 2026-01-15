<?php
/**
 * Endpoint de autenticación para el panel de administración
 * 
 * Este script maneja el login de administradores. Lo complicado fue
 * la configuración de las cookies de sesión y asegurarme de que fueran
 * compatibles con la estructura de la aplicación principal. Las sesiones
 * me dieron varios problemas hasta que entendí que necesitaba
 * un nombre de sesión diferente para admin
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';
header('Content-Type: application/json; charset=utf-8');

// Configura los parámetros de la cookie de sesión igual que en el resto de la app
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => 'localhost',
    'secure' => false,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start([
    'name' => 'MomMatchAdminSession',
]);

// Si es una solicitud OPTIONS, simplemente responde con 200 OK
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Verificar que la solicitud sea POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "error" => "Método no permitido"]);
    exit;
}

// Obtener datos del cuerpo de la solicitud
$inputData = json_decode(file_get_contents('php://input'), true);

if (!isset($inputData['email']) || !isset($inputData['password'])) {
    echo json_encode(["success" => false, "error" => "Email y contraseña requeridos"]);
    exit;
}

$email = trim($inputData['email']);
$password = $inputData['password'];

// Buscar el admin en la base de datos (case-insensitive)
$pdo = getDatabaseConnection();
$stmt = $pdo->prepare("SELECT id, username, password, email FROM admin_users WHERE LOWER(email) = LOWER(?)");
$stmt->execute([$email]);
$admin = $stmt->fetch(PDO::FETCH_ASSOC);

if ($admin && password_verify($password, $admin['password'])) {
    // Autenticación exitosa
    $_SESSION['admin_id'] = $admin['id'];
    $_SESSION['admin_email'] = $admin['email'];
    $_SESSION['admin_name'] = $admin['username'];
    $_SESSION['is_admin'] = true;
    $_SESSION['user_id'] = $admin['id']; // Para compatibilidad con verify_session.php

    echo json_encode([
        "success" => true,
        "message" => "Inicio de sesión exitoso",
        "user" => [ // <-- Cambiado de "admin" a "user"
            "id" => $admin['id'],
            "email" => $admin['email'],
            "name" => $admin['username'],
            "is_admin" => true
        ]
    ]);
} else {
    // Autenticación fallida
    echo json_encode(["success" => false, "error" => "Credenciales inválidas"]);
}
