<?php
/**
 * Recuperador de mensajes para conversaciones de trueques
 * 
 * Este script gestiona la recuperación de mensajes entre usuarios que están
 * negociando un trueque. Implementa un sistema de paginación y marcado de 
 * mensajes leídos automático. 
 */

// Capturar cualquier salida de buffer antes de hacer cualquier operación
ob_clean();

// Asegurar que no hay errores PHP mostrados como HTML
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Prevenir errores de SQL de aparecer como HTML
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    require_once __DIR__ . '/db.php';
    require_once __DIR__ . '/cors.php';

   
    session_start([
        'name' => 'MomMatchSession',
    ]);

    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'No autenticado']);
        exit;
    }

    $user_id = $_SESSION['user_id'];
    
    // Asegurar encabezados JSON
    header('Content-Type: application/json; charset=utf-8');

    $pdo = getDatabaseConnection();
 

    // Validar que se recibió el chat_id
    if (!isset($_GET['chat_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Se requiere un ID de chat']);
        exit;
    }

    $chat_id = $_GET['chat_id'];
    $pdo = getDatabaseConnection();

    // Primero verificar si hay mensajes en trueque_messages para este chat_id
    $msgCountStmt = $pdo->prepare("SELECT COUNT(*) FROM trueque_messages WHERE chat_id = ?");
    $msgCountStmt->execute([$chat_id]);
    $messageCount = $msgCountStmt->fetchColumn();
    
    error_log("get_trueque_messages.php: Encontrados $messageCount mensajes para el chat_id $chat_id");
    
    // Si hay mensajes, verificar si el usuario es parte de la conversación
    if ($messageCount > 0) {
        $participantStmt = $pdo->prepare("
            SELECT COUNT(*) FROM trueque_messages 
            WHERE chat_id = ? AND (sender_id = ? OR receiver_id = ?)
        ");
        $participantStmt->execute([$chat_id, $user_id, $user_id]);
        $isParticipant = $participantStmt->fetchColumn() > 0;
        
        if (!$isParticipant) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'No tienes permiso para ver esta conversación']);
            exit;
        }
        
        // Verificar si existe el chat en trueque_chats y crearlo si no existe
        $chatExistsStmt = $pdo->prepare("SELECT * FROM trueque_chats WHERE id = ?");
        $chatExistsStmt->execute([$chat_id]);
        $existingChat = $chatExistsStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$existingChat) {
            // Obtener el primer y último mensaje para reconstruir el chat
            $firstMsgStmt = $pdo->prepare("
                SELECT * FROM trueque_messages 
                WHERE chat_id = ? 
                ORDER BY sent_at ASC 
                LIMIT 1
            ");
            $firstMsgStmt->execute([$chat_id]);
            $firstMsg = $firstMsgStmt->fetch(PDO::FETCH_ASSOC);
            
            $lastMsgStmt = $pdo->prepare("
                SELECT * FROM trueque_messages 
                WHERE chat_id = ? 
                ORDER BY sent_at DESC 
                LIMIT 1
            ");
            $lastMsgStmt->execute([$chat_id]);
            $lastMsg = $lastMsgStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($firstMsg && $lastMsg) {
                // Determinar user1 y user2
                $user1_id = $firstMsg['sender_id'];
                $user2_id = $firstMsg['receiver_id'];
                
                // Insertar el chat en la tabla trueque_chats
                $createChatStmt = $pdo->prepare("
                    INSERT INTO trueque_chats (id, user1_id, user2_id, last_message, last_message_at) 
                    VALUES (?, ?, ?, ?, ?)
                ");
                $createChatStmt->execute([
                    $chat_id, 
                    $user1_id, 
                    $user2_id, 
                    $lastMsg['message'], 
                    $lastMsg['sent_at']
                ]);
                
                error_log("get_trueque_messages.php: Creado registro en trueque_chats para chat_id $chat_id");
            }
        }
    }

    // Obtener los mensajes del chat
    $messagesStmt = $pdo->prepare("
        SELECT tm.*, 
               DATE_FORMAT(tm.sent_at, '%H:%i') as formatted_time
        FROM trueque_messages tm
        WHERE tm.chat_id = ?
        ORDER BY tm.sent_at ASC
    ");
    $messagesStmt->execute([$chat_id]);
    $messages = $messagesStmt->fetchAll(PDO::FETCH_ASSOC);

    // Marcar mensajes como leídos si el usuario actual es el receptor
    $markReadStmt = $pdo->prepare("
        UPDATE trueque_messages 
        SET is_read = 1 
        WHERE chat_id = ? AND receiver_id = ? AND is_read = 0
    ");
    $markReadStmt->execute([$chat_id, $user_id]);
    
    // Si hay alguna entrada en trueque_chats, actualizar el conteo de no leídos
    $updateChatStmt = $pdo->prepare("
        UPDATE trueque_chats 
        SET unread_count_user1 = CASE WHEN user1_id = ? THEN 0 ELSE unread_count_user1 END,
            unread_count_user2 = CASE WHEN user2_id = ? THEN 0 ELSE unread_count_user2 END
        WHERE id = ?
    ");
    $updateChatStmt->execute([$user_id, $user_id, $chat_id]);
    
    // Devolver los mensajes
    echo json_encode([
        'success' => true, 
        'messages' => $messages
    ]);
    
} catch (Exception $e) {
    error_log("Error en get_trueque_messages.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => 'Error al obtener los mensajes: ' . $e->getMessage()
    ]);
}