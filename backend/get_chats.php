<?php
/**
 * API para obtener lista de conversaciones del usuario
 * 
 * Este script recupera todas las conversaciones activas del usuario
 * actual con otros usuarios. La consulta SQL para obtener el último
 * mensaje y los contadores de no leidos fue bastante compleja, especialmente
 * por la necesidad de usar subconsultas y CASE para determinar el remitente
 * y destinatario de cada mensaje
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

// Verificar sesión y obtener el ID del usuario
session_start();
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No has iniciado sesión']);
    exit;
}

$user_id = $_SESSION['user_id'];

try {
    $pdo = getDatabaseConnection();
    // Preparar la consulta para obtener las conversaciones del usuario
    // Uso un JOIN para obtener el nombre del otro usuario y su foto de perfil
    $stmt = $pdo->prepare("
        SELECT 
            conv.id as conversation_id,
            CASE 
                WHEN conv.user1_id = ? THEN conv.user2_id
                ELSE conv.user1_id
            END as other_user_id,
            u.name as other_user_name,
            p.profile_photo,
            (SELECT message FROM chat_messages 
             WHERE (sender_id = conv.user1_id AND receiver_id = conv.user2_id) 
                OR (sender_id = conv.user2_id AND receiver_id = conv.user1_id) 
             ORDER BY created_at DESC LIMIT 1) as last_message,
            (SELECT sender_id FROM chat_messages 
             WHERE (sender_id = conv.user1_id AND receiver_id = conv.user2_id) 
                OR (sender_id = conv.user2_id AND receiver_id = conv.user1_id) 
             ORDER BY created_at DESC LIMIT 1) as last_message_sender,
            (SELECT DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') FROM chat_messages 
             WHERE (sender_id = conv.user1_id AND receiver_id = conv.user2_id) 
                OR (sender_id = conv.user2_id AND receiver_id = conv.user1_id) 
             ORDER BY created_at DESC LIMIT 1) as formatted_time,
            meta.last_message_time,
            CASE 
                WHEN meta.user_id_1 = ? THEN meta.unread_count_user_1
                ELSE meta.unread_count_user_2
            END as unread_count
        FROM chat_conversations conv
        JOIN users u ON u.id = CASE 
            WHEN conv.user1_id = ? THEN conv.user2_id
            ELSE conv.user1_id
        END
        LEFT JOIN profile_preferences p ON p.user_id = u.id
        LEFT JOIN chat_metadata meta ON 
            (meta.user_id_1 = conv.user1_id AND meta.user_id_2 = conv.user2_id) OR
            (meta.user_id_1 = conv.user2_id AND meta.user_id_2 = conv.user1_id)
        WHERE conv.user1_id = ? OR conv.user2_id = ?
        ORDER BY meta.last_message_time DESC
    ");
    $stmt->execute([$user_id, $user_id, $user_id, $user_id, $user_id]);
    
    $conversations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Procesamos las conversaciones para agregar información adicional
    foreach ($conversations as &$conv) {
        // Formatear la ruta de la foto de perfil si existe
        if ($conv['profile_photo']) {
            // Convertir la ruta relativa a una URL completa si es necesario
            if (strpos($conv['profile_photo'], 'http') !== 0) {
                if (strpos($conv['profile_photo'], '/') === 0) {
                    $conv['profile_photo'] = 'http://localhost/mommatch/backend' . $conv['profile_photo'];
                } else {
                    $conv['profile_photo'] = 'http://localhost/mommatch/backend/' . $conv['profile_photo'];
                }
            }
        } else {
            // Foto de perfil por defecto
            $conv['profile_photo'] = 'http://localhost/mommatch/backend/public/uploads/profiles/default_profile.jpg';
        }
        
        // Determinar si el último mensaje fue enviado por el usuario actual
        $conv['is_last_message_mine'] = ($conv['last_message_sender'] == $user_id);

        // Limita la longitud del último mensaje para la vista previa
        if (strlen($conv['last_message']) > 30) {
            $conv['last_message_preview'] = substr($conv['last_message'], 0, 30) . '...';
        } else {
            $conv['last_message_preview'] = $conv['last_message'];
        }
    }
    
    echo json_encode(['success' => true, 'conversations' => $conversations]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error al obtener las conversaciones: ' . $e->getMessage()]);
    error_log("Error en get_chats.php: " . $e->getMessage());
}