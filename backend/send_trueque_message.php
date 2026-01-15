<?php
/**
 * Sistema de mensajería para negociación de trueques
 * 
 * Este script maneja el envío de mensajes entre usuarias que están negociando
 * un intercambio de artículos. Implementa un sistema de validación para asegurar
 * que solo las participantes autorizadas puedan enviar mensajes. El desafío más
 * importante fue integrar el sistema con las notificaciones y mantener el estado
 * correcto del trueque según avanza la conversación
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

// Configurar un timeout para evitar ejecución infinita
set_time_limit(30); // 30 segundos máximo de ejecución

// Asegurarse de que no haya salida de buffer que interfiera con headers
if (ob_get_level()) ob_clean();

header('Content-Type: application/json; charset=utf-8');
// Añadir header para evitar caché
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Iniciar un log de ejecución para debug
error_log("send_trueque_message.php: Inicio de ejecución");


session_start([
    'name' => 'MomMatchSession',
]);

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No autenticado']);
    error_log("send_trueque_message.php: Error de autenticación - Usuario no autenticado");
    exit;
}

$from_user_id = $_SESSION['user_id'];
error_log("send_trueque_message.php: Usuario autenticado ID: " . $from_user_id);

// Verificar método HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    error_log("send_trueque_message.php: Método no permitido - " . $_SERVER['REQUEST_METHOD']);
    exit;
}

// Obtener datos del cuerpo de la petición
try {
    $raw_input = file_get_contents('php://input');
    error_log("send_trueque_message.php: Input recibido: " . $raw_input);

    // Validar que el cuerpo no esté vacío
    if (empty($raw_input)) {
        throw new Exception('El cuerpo de la solicitud está vacío');
    }

    $data = json_decode($raw_input, true);

    // Validar JSON
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('JSON inválido: ' . json_last_error_msg());
    }

    // Validar campos obligatorios
    if (!isset($data['to_user_id'], $data['message'], $data['trueque_id'])) {
        throw new Exception('Faltan campos obligatorios: to_user_id, message, trueque_id');
    }

    $to_user_id = $data['to_user_id'];
    $message = $data['message'];
    $trueque_id = $data['trueque_id'];
    $chat_id = $data['chat_id'] ?? null;
    error_log("send_trueque_message.php: Enviando mensaje a usuario ID: " . $to_user_id . " sobre trueque ID: " . $trueque_id);

    error_log("send_trueque_message.php: Conectando a la base de datos");
    $pdo = getDatabaseConnection();
    $pdo->setAttribute(PDO::ATTR_TIMEOUT, 5); // 5 segundos timeout para consultas
    
    // Validar que el trueque existe
    $truequeStmt = $pdo->prepare("SELECT * FROM trueques WHERE id = ?");
    $truequeStmt->execute([$trueque_id]);
    if ($truequeStmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'El trueque no existe']);
        error_log("send_trueque_message.php: Trueque no encontrado ID: " . $trueque_id);
        exit;
    }
    
    // Si se proporciona chat_id, verificar que existe
    if ($chat_id) {
        $chatStmt = $pdo->prepare("
            SELECT * FROM trueque_chats 
            WHERE id = ? AND ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))
        ");
        $chatStmt->execute([$chat_id, $from_user_id, $to_user_id, $to_user_id, $from_user_id]);
        
        if ($chatStmt->rowCount() === 0) {
            // El chat no existe o el usuario no tiene acceso
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'No tienes acceso a este chat']);
            error_log("send_trueque_message.php: Acceso denegado a chat ID: " . $chat_id);
            exit;
        }
    }

    // Si no se proporciona chat_id, buscar o crear un nuevo chat
    if (!$chat_id) {
        // Verificar si ya existe un chat entre los usuarios para el mismo trueque
        $existingChatStmt = $pdo->prepare("
            SELECT id FROM trueque_chats 
            WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)) 
            AND trueque_id = ?
        ");
        $existingChatStmt->execute([$from_user_id, $to_user_id, $to_user_id, $from_user_id, $trueque_id]);

        if ($existingChatStmt->rowCount() > 0) {
            // Si el chat ya existe, usar su ID
            $chat_id = $existingChatStmt->fetchColumn();
        } else {
            // Crear un nuevo chat
            $createChatStmt = $pdo->prepare("
                INSERT INTO trueque_chats (user1_id, user2_id, trueque_id, created_at, updated_at, last_message, unread_count_user1, unread_count_user2)
                VALUES (?, ?, ?, NOW(), NOW(), ?, 0, 1)
            ");
            $createChatStmt->execute([$from_user_id, $to_user_id, $trueque_id, $message]);
            $chat_id = $pdo->lastInsertId();
        }
    }

    // Insertar el mensaje en el chat
    $insertStmt = $pdo->prepare("
        INSERT INTO trueque_messages (chat_id, sender_id, receiver_id, message, sent_at, is_read) 
        VALUES (?, ?, ?, ?, NOW(), 0)
    ");
    $insertStmt->execute([$chat_id, $from_user_id, $to_user_id, $message]);

    // Actualizar el último mensaje y contador de no leídos
    $updateChatStmt = $pdo->prepare("
        UPDATE trueque_chats 
        SET last_message = ?, 
            updated_at = NOW(),
            unread_count_user1 = CASE WHEN user1_id = ? THEN unread_count_user1 ELSE unread_count_user1 + 1 END,
            unread_count_user2 = CASE WHEN user2_id = ? THEN unread_count_user2 ELSE unread_count_user2 + 1 END
        WHERE id = ?
    ");
    $updateChatStmt->execute([$message, $from_user_id, $from_user_id, $chat_id]);
    
    $message_id = $pdo->lastInsertId();
    
    // Recuperar el mensaje recién insertado con su timestamp
    $messageStmt = $pdo->prepare("
        SELECT id, chat_id, sender_id, receiver_id, message, trueque_id, is_read, created_at
        FROM trueque_messages
        WHERE id = ?
    ");
    $messageStmt->execute([$message_id]);
    $messageData = $messageStmt->fetch(PDO::FETCH_ASSOC);
    
    error_log("send_trueque_message.php: Enviando respuesta de éxito");
    echo json_encode([
        'success' => true, 
        'message' => 'Mensaje enviado correctamente',
        'data' => $messageData,
        'chat_id' => $chat_id
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    error_log("send_trueque_message.php: Error - " . $e->getMessage());
} finally {
    // Asegurar que siempre termine la ejecución correctamente
    error_log("send_trueque_message.php: Fin de ejecución");
    exit;
}