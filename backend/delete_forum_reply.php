<?php
/**
 * Endpoint para eliminar respuestas del foro
 * 
 * Este script permite a los usuarios eliminar sus propias respuestas
 * del foro. Implementé múltiples validaciones de seguridad para evitar
 * que un usuario pueda eliminar respuestas de otro
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

session_start([
    'name' => 'MomMatchSession',
]);

// Verificar autenticación
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'No autenticado',
    ]);
    exit;
}

$userId = $_SESSION['user_id']; // Obtener el ID del usuario de la sesión

// Inicializar la conexión a la base de datos
$pdo = getDatabaseConnection();

// Asegurarnos de que la solicitud sea DELETE
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

// Obtener los datos enviados en formato JSON
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Verificar que se haya proporcionado el ID de la respuesta
if (!$data || !isset($data['replyId'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID de respuesta no proporcionado']);
    exit;
}

$replyId = intval($data['replyId']);

try {
    // Verificar que el usuario sea el autor de la respuesta
    $stmt = $pdo->prepare("SELECT user_id FROM forum_replies WHERE id = ?");
    $stmt->execute([$replyId]);
    $reply = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$reply) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Respuesta no encontrada']);
        exit;
    }

    if ($reply['user_id'] != $userId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'No tienes permiso para eliminar esta respuesta']);
        exit;
    }

    // Eliminar la respuesta
    $stmt = $pdo->prepare("DELETE FROM forum_replies WHERE id = ? AND user_id = ?");
    $stmt->execute([$replyId, $userId]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Respuesta eliminada correctamente']);
    } else {
        echo json_encode(['success' => false, 'error' => 'No se pudo eliminar la respuesta']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    error_log("Error en delete_forum_reply.php: " . $e->getMessage());
}