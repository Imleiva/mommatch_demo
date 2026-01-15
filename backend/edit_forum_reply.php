<?php
/**
 * Endpoint para editar respuestas del foro
 * 
 * Este script permite a los usuarios modificar sus propias respuestas
 * publicadas en el foro. La parte más compleja fue recuperar la respuesta
 * editada con toda la información del usuario para mantener la coherencia
 * en la interfaz sin necesidad de recargar la página completa
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

// Asegurarnos de que la solicitud sea PUT
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

// Obtener los datos enviados en formato JSON
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Verificar que se hayan proporcionado los datos necesarios
if (!$data || !isset($data['replyId']) || !isset($data['content']) || empty($data['content'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
    exit;
}

$replyId = intval($data['replyId']);
$content = trim($data['content']);

try {
    // Verificar que el usuario sea el autor de la respuesta
    $stmt = $pdo->prepare("SELECT user_id, topic_id FROM forum_replies WHERE id = ?");
    $stmt->execute([$replyId]);
    $reply = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$reply) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Respuesta no encontrada']);
        exit;
    }

    if ($reply['user_id'] != $userId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'No tienes permiso para editar esta respuesta']);
        exit;
    }

    // Actualizar la respuesta utilizando el nombre correcto de la columna 'reply'
    $stmt = $pdo->prepare("UPDATE forum_replies SET reply = ? WHERE id = ? AND user_id = ?");
    $stmt->execute([$content, $replyId, $userId]);

    if ($stmt->rowCount() > 0) {
        // Obtener la respuesta actualizada con los detalles completos
        $userTableStmt = $pdo->prepare("DESCRIBE users");
        $userTableStmt->execute();
        $userColumns = $userTableStmt->fetchAll(PDO::FETCH_COLUMN);
        
        // Definir campos para el nombre de usuario
        $selectFields = "r.id, r.topic_id, r.user_id, r.created_at";
        $joinCondition = "LEFT JOIN users u ON r.user_id = u.id";
        
        // Determinar qué campos están disponibles para construir el nombre de usuario
        $nameCases = [];
        
        // Comprobar first_name y last_name
        if (in_array('first_name', $userColumns) && in_array('last_name', $userColumns)) {
            $nameCases[] = "CASE WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name) END";
            $selectFields .= ", u.first_name, u.last_name";
        }
        
        // Comprobar name
        if (in_array('name', $userColumns)) {
            $nameCases[] = "CASE WHEN u.name IS NOT NULL THEN u.name END";
            $selectFields .= ", u.name";
        }
        
        // Comprobar username
        if (in_array('username', $userColumns)) {
            $nameCases[] = "CASE WHEN u.username IS NOT NULL THEN u.username END";
            $selectFields .= ", u.username";
        }
        
        // Comprobar email
        if (in_array('email', $userColumns)) {
            $nameCases[] = "CASE WHEN u.email IS NOT NULL THEN SUBSTRING_INDEX(u.email, '@', 1) END";
            $selectFields .= ", u.email";
        }
        
        // Si no hay campos disponibles para el nombre
        if (empty($nameCases)) {
            $usernameField = "'Usuario' as username";
        } else {
            $nameCasesStr = implode(', ', $nameCases);
            $usernameField = "COALESCE($nameCasesStr, 'Usuario') as username";
        }
        
        // Consultar la respuesta actualizada
        $replyStmt = $pdo->prepare("
            SELECT $selectFields, r.reply, $usernameField
            FROM forum_replies r
            $joinCondition
            WHERE r.id = ?
        ");
        $replyStmt->execute([$replyId]);
        $updatedReply = $replyStmt->fetch(PDO::FETCH_ASSOC);
        
        // Añadir el campo 'content' para compatibilidad con el frontend
        $updatedReply['content'] = $updatedReply['reply'];
        
        echo json_encode([
            'success' => true, 
            'message' => 'Respuesta actualizada correctamente',
            'reply' => $updatedReply
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'No se pudo actualizar la respuesta']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    error_log("Error en edit_forum_reply.php: " . $e->getMessage());
}
?>