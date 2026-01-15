<?php
/**
 * Endpoint para añadir intereses personalizados
 * 
 * Este script permite a los usuarios añadir intereses personalizados
 * a su perfil. La implementación usa ON DUPLICATE KEY UPDATE para
 * evitar duplicados en la base de datos, lo que me ahorró mucho código
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
    $userId = $_SESSION['user_id'];

    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new RuntimeException('Datos JSON inválidos', 400);
    }

    $interestName = $input['interest'] ?? null;
    if (empty($interestName)) {
        throw new RuntimeException('El nombre del interés es obligatorio', 400);
    }

    // Insertar el interés si no existe
    $stmt = $pdo->prepare("INSERT INTO interests (name, is_custom, created_by) VALUES (?, 1, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)");
    $stmt->execute([$interestName, $userId]);
    $interestId = $pdo->lastInsertId();

    // Asociar el interés con el usuario
    $stmt = $pdo->prepare("INSERT IGNORE INTO user_interests (user_id, interest_id) VALUES (?, ?)");
    $stmt->execute([$userId, $interestId]);

    echo json_encode([
        'success' => true,
        'message' => 'Interés añadido correctamente',
        'interest' => [
            'id' => $interestId,
            'name' => $interestName
        ]
    ]);

} catch (RuntimeException $e) {
    http_response_code($e->getCode() ?: 400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error interno del servidor',
    ]);
    error_log("Error en add_interest.php: " . $e->getMessage());
}
