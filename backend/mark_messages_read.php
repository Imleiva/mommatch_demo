<?php
/**
 * Marcador de mensajes como leídos
 * 
 * Este script actualiza el estado de los mensajes para marcarlos como leídos
 * cuando se visualizan. Implementa un sistema eficiente para actualizar
 * múltiples mensajes en una sola operación
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

session_start([
    'name' => 'MomMatchSession',
]);

header('Content-Type: application/json; charset=utf-8');

// Manejar solicitud OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Asegurarse de que sea una solicitud POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

try {
    if (empty($_SESSION['user_id'])) {
        throw new RuntimeException('No autenticado', 401);
    }

    $userId = $_SESSION['user_id'];
      // Obtener datos de la solicitud
    $data = json_decode(file_get_contents('php://input'), true);

    // Aceptar tanto 'matchId' como 'other_user_id' para compatibilidad
    $otherUserId = null;
    if (isset($data['matchId']) && !empty($data['matchId'])) {
        $otherUserId = $data['matchId'];
    } elseif (isset($data['other_user_id']) && !empty($data['other_user_id'])) {
        $otherUserId = $data['other_user_id'];
    } else {
        throw new RuntimeException('ID de usuario no proporcionado', 400);
    }

    $pdo = getDatabaseConnection();
    
    // Actualizar los mensajes como leídos - marcar como leídos los mensajes
    // que el otro usuario envió al usuario actual
    $stmt = $pdo->prepare("
        UPDATE chat_messages 
        SET is_read = 1 
        WHERE 
            sender_id = :other_user_id AND receiver_id = :user_id 
            AND is_read = 0
    ");
    
    $stmt->execute([
        ':other_user_id' => $otherUserId,
        ':user_id' => $userId
    ]);
    
    $count = $stmt->rowCount();
      echo json_encode([
        'success' => true, 
        'message' => 'Mensajes marcados como leídos', 
        'count' => $count
    ]);
    
    // Log de debug para troubleshooting
    error_log("mark_messages_read.php: Usuario $userId marcó como leídos $count mensajes del usuario $otherUserId");
    
} catch (Exception $e) {
    http_response_code($e->getCode() ?: 500);
    echo json_encode([
        'success' => false, 
        'message' => $e->getMessage()
    ]);
    error_log('Error en mark_messages_read.php: ' . $e->getMessage());
}

