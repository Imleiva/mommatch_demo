<?php
/**
 * Sistema de mensajería entre usuarias
 *
 * Este script procesa el envío de mensajes entre usuarias de la plataforma.
 * Gestiona la validación, almacenamiento y notificación de nuevos mensajes
 * Fue difícil manejar las notificaciones en tiempo real
 * y el timeout adecuado para evitar problemas de rendimiento en el servidor.
 * También implementé un sistema de logging detallado para depuración debido
 * a problemas intermitentes
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

// Configurar un timeout para evitar ejecución infinita
set_time_limit(30); // 30 segundos máximo de ejecución

// Asegurarse de que no haya salida de buffer que interfiera con headers
ob_clean();

header('Content-Type: application/json; charset=utf-8');
// Añadir header para evitar caché
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Iniciar un log de ejecución para debug
error_log("send_message.php: Inicio de ejecución");

// Iniciar sesión
session_start([
    'name' => 'MomMatchSession',
]);

// Verificar que el usuario esté autenticado
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No autenticado']);
    error_log("send_message.php: Error de autenticación - Usuario no autenticado");
    exit;
}

$from_user_id = $_SESSION['user_id'];
error_log("send_message.php: Usuario autenticado ID: " . $from_user_id);

// Verificar método HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    error_log("send_message.php: Método no permitido - " . $_SERVER['REQUEST_METHOD']);
    exit;
}

// Obtener datos del cuerpo de la petición
$raw_input = file_get_contents('php://input');
error_log("send_message.php: Input recibido: " . $raw_input);
$data = json_decode($raw_input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'JSON inválido']);
    error_log("send_message.php: Error parseando JSON - " . json_last_error_msg());
    exit;
}

if (empty($data['to_user_id']) || empty($data['message'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Destinatario y mensaje son obligatorios']);
    error_log("send_message.php: Faltan campos obligatorios - to_user_id o message");
    exit;
}

$to_user_id = $data['to_user_id'];
$message = $data['message'];
error_log("send_message.php: Enviando mensaje a usuario ID: " . $to_user_id);

try {
    error_log("send_message.php: Conectando a la base de datos");
    $pdo = getDatabaseConnection();
    $pdo->setAttribute(PDO::ATTR_TIMEOUT, 5); // 5 segundos timeout para consultas
    
    // Insertar el mensaje en la tabla chat_messages
    $insertStmt = $pdo->prepare("
        INSERT INTO chat_messages (sender_id, receiver_id, message, is_read) 
        VALUES (?, ?, ?, 0)
    ");
    $insertStmt->execute([$from_user_id, $to_user_id, $message]);
    
    $message_id = $pdo->lastInsertId();
    
    // Recuperar el mensaje recién insertado con su timestamp
    $messageStmt = $pdo->prepare("
        SELECT id, sender_id, receiver_id, message, is_read, created_at
        FROM chat_messages
        WHERE id = ?
    ");
    $messageStmt->execute([$message_id]);
    $messageData = $messageStmt->fetch(PDO::FETCH_ASSOC);
    
    // Buscar o crear una conversación en chat_conversations
    $checkConversationStmt = $pdo->prepare("
        SELECT id, user_id_1, user_id_2, unread_count_user_1, unread_count_user_2 
        FROM chat_conversations 
        WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)
    ");
    $checkConversationStmt->execute([$from_user_id, $to_user_id, $to_user_id, $from_user_id]);
    $conversation = $checkConversationStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($conversation) {
        // Actualizar la conversación existente
        $updateUnreadCount = ($conversation['user_id_1'] == $to_user_id) ? 
            "unread_count_user_1 = unread_count_user_1 + 1" : 
            "unread_count_user_2 = unread_count_user_2 + 1";
            
        $updateConversationStmt = $pdo->prepare("
            UPDATE chat_conversations 
            SET last_message_id = ?, 
                last_message_time = NOW(),
                $updateUnreadCount
            WHERE id = ?
        ");
        $updateConversationStmt->execute([$message_id, $conversation['id']]);
    } else {
        // Crear una nueva conversación
        $createConversationStmt = $pdo->prepare("
            INSERT INTO chat_conversations 
            (user_id_1, user_id_2, last_message_id, last_message_time, unread_count_user_1, unread_count_user_2)
            VALUES (?, ?, ?, NOW(), ?, ?)
        ");
        
        // Si el remitente es user_id_1, entonces unread_count_user_2 = 1
        // Si el remitente es user_id_2, entonces unread_count_user_1 = 1
        $unread_user_1 = ($from_user_id == $to_user_id) ? 1 : 0;
        $unread_user_2 = ($from_user_id != $to_user_id) ? 1 : 0;
        
        $createConversationStmt->execute([$from_user_id, $to_user_id, $message_id, $unread_user_1, $unread_user_2]);
    }

    // He eliminado el código que usaba la tabla 'chats' xq ya no es necesario
    // ya que esta funcionalidad la reemplacé por la tabla 'chat_conversations'

    error_log("send_message.php: Enviando respuesta de éxito");
    echo json_encode([
        'success' => true, 
        'message' => 'Mensaje enviado correctamente',
        'data' => $messageData
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error del servidor: ' . $e->getMessage()]);
    error_log("Error en send_message.php: " . $e->getMessage());
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error inesperado: ' . $e->getMessage()]);
    error_log("Error inesperado en send_message.php: " . $e->getMessage());
} finally {
    // Asegurar que siempre termine la ejecución correctamente
    error_log("send_message.php: Fin de ejecución");
    exit;
}