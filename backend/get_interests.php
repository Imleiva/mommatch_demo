<?php
/**
 * API para obtener todos los intereses disponibles
 * 
 * Este script recupera todos los intereses disponibles en la plataforma
 * para mostrarlos en el formulario de perfil. Decidí incluir el atributo
 * is_custom para distinguir entre intereses predefinidos y los creados
 * por usuarios
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

header('Content-Type: application/json; charset=utf-8');

session_start([
    'name' => 'MomMatchSession',
]);

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'No autenticado',
    ]);
    exit;
}

try {
    $pdo = getDatabaseConnection();

    // Obtener todos los intereses con todos sus campos
    $stmt = $pdo->prepare("SELECT id, name, created_at, created_by, is_custom FROM interests ORDER BY name ASC");
    $stmt->execute();
    $interests = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $interests,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error interno del servidor',
    ]);
    error_log("Error en get_interests.php: " . $e->getMessage());
}
