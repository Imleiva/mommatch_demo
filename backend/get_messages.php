<?php
/**
 * API para obtener mensajes entre usuarias que han hecho match
 * 
 * Este script forma parte del sistema de mensajería para matches
 * y es independiente del sistema de mensajes para trueques
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

// Verificar sesión y obtener el ID de la usuaria
session_start([
    'name' => 'MomMatchSession',
    'cookie_lifetime' => 0, // Sesión válida hasta que se cierre el navegador
    'cookie_path' => '/',
    'cookie_domain' => 'localhost',
    'cookie_secure' => false,
    'cookie_httponly' => true,
    'cookie_samesite' => 'Lax',
]);

// Validación de autenticación
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No has iniciado sesión']);
    exit;
}

$user_id = $_SESSION['user_id'];

// Verificar que se proporciona el ID del otro usuario (la otra madre del match)
if (!isset($_GET['other_user_id']) || !is_numeric($_GET['other_user_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID de usuario no válido']);
    exit;
}

$other_user_id = (int)$_GET['other_user_id'];

try {
    $pdo = getDatabaseConnection();
    
    // 1: Obtener información del otro usuario para mostrar en el chat
    $stmt = $pdo->prepare("
        SELECT 
            u.id,
            u.name,
            p.profile_photo
        FROM users u
        LEFT JOIN profile_preferences p ON p.user_id = u.id
        WHERE u.id = ?
    ");
    $stmt->execute([$other_user_id]);
    $other_user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$other_user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Usuario no encontrado']);
        exit;
    }
    
    // 2: Buscar una conversación existente entre estas usuarias
    $stmt = $pdo->prepare("
        SELECT id FROM chat_conversations
        WHERE (user_id_1 = ? AND user_id_2 = ?) 
        OR (user_id_1 = ? AND user_id_2 = ?)
    ");
    $stmt->execute([$user_id, $other_user_id, $other_user_id, $user_id]);
    $conversation = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $conversation_id = null;
    
    if ($conversation) {
        // Caso 1: Ya existe una conversación entre estas usuarias
        $conversation_id = $conversation['id'];

        // Marcar mensajes como leídos cuando la usuaria abre el chat
        $stmt = $pdo->prepare("
            UPDATE chat_conversations
            SET
                unread_count_user_1 = CASE WHEN user_id_1 = ? THEN 0 ELSE unread_count_user_1 END,
                unread_count_user_2 = CASE WHEN user_id_2 = ? THEN 0 ELSE unread_count_user_2 END
            WHERE id = ?
        ");
        $stmt->execute([$user_id, $user_id, $conversation_id]);
    } else {
        // Caso 2: No existe conversación aún, verificar si hay un match antes de crearla
        // Solo se permite crear una conversación si existe un match confirmado entre las usuarias
        $stmt = $pdo->prepare("
            SELECT id FROM matches
            WHERE ((user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?))
            AND status = 'matched'
        ");
        $stmt->execute([$user_id, $other_user_id, $other_user_id, $user_id]);
        $match = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$match) {
            // No existe un match, no se permite iniciar conversación
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'No puedes iniciar una conversación con esta usuaria']);
            exit;
        }
        
        // Crear nueva conversación entre las usuarias que han hecho match
        $stmt = $pdo->prepare("
            INSERT INTO chat_conversations (user_id_1, user_id_2, last_message_time, unread_count_user_1, unread_count_user_2)
            VALUES (?, ?, NOW(), 0, 0)
        ");
        $stmt->execute([$user_id, $other_user_id]);
        $conversation_id = $pdo->lastInsertId();
    }
    
    // 3: Obtener todos los mensajes de esta conversación
    $stmt = $pdo->prepare("
        SELECT 
            m.id,
            m.sender_id,
            m.message,
            DATE_FORMAT(m.created_at, '%d/%m/%Y %H:%i') as formatted_time,
            m.created_at
        FROM chat_messages m
        JOIN chat_conversations c ON (
            (c.user_id_1 = m.sender_id AND c.user_id_2 = m.receiver_id) OR
            (c.user_id_2 = m.sender_id AND c.user_id_1 = m.receiver_id)
        )
        WHERE c.id = ?
        ORDER BY m.created_at ASC
    ");
    $stmt->execute([$conversation_id]);
    $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Fuerzo el primer mensaje a no leído para pruebas
    foreach ($messages as &$msg) {
        $msg['is_read'] = 0;
        break;
    }
    
    // Mensajes y información del usuario en formato JSON
    echo json_encode([
        'success' => true, 
        'messages' => $messages, 
        'other_user' => $other_user,
        'conversation_id' => $conversation_id
    ]);
    
} catch (Exception $e) {
    // Manejo errores y registrarlos para debugging
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error al obtener los mensajes: ' . $e->getMessage()]);
    error_log("Error en get_messages.php: " . $e->getMessage());
}