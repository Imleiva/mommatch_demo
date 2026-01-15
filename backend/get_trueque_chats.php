<?php
/**
 * Gestor de conversaciones para el sistema de trueques
 * 
 * Este script recupera todas las conversaciones de trueques
 * Implementa un sistema de paginación para manejar grandes volúmenes de chats
 * Uno de los desafíos principales fue la optimización de las consultas SQL para
 * evitar tiempos de carga excesivos cuando hay muchas conversaciones
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
    $chats = [];

    try {
        // Verificar si hay mensajes de trueque para este usuario
        $stmt = $pdo->prepare("
            SELECT DISTINCT chat_id 
            FROM trueque_messages 
            WHERE sender_id = ? OR receiver_id = ?
        ");
        $stmt->execute([$user_id, $user_id]);
        $chatIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        error_log("get_trueque_chats.php: Chat IDs encontrados: " . json_encode($chatIds));
        
        // Si no hay conversaciones, verificar si hay alguna en trueque_chats
        if (empty($chatIds)) {
            $chatCheckStmt = $pdo->prepare("
                SELECT id FROM trueque_chats 
                WHERE user1_id = ? OR user2_id = ?
            ");
            $chatCheckStmt->execute([$user_id, $user_id]);
            $chatIds = $chatCheckStmt->fetchAll(PDO::FETCH_COLUMN);
            error_log("get_trueque_chats.php: Chat IDs encontrados en trueque_chats: " . json_encode($chatIds));
        }
        
        if (!empty($chatIds)) {
            // Crear un array para almacenar las conversaciones
            $reconstructedChats = [];
            
            foreach ($chatIds as $chatId) {
                // Verificar si existe entrada en trueque_chats
                $chatExistsStmt = $pdo->prepare("
                    SELECT * FROM trueque_chats WHERE id = ?
                ");
                $chatExistsStmt->execute([$chatId]);
                $existingChat = $chatExistsStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($existingChat) {
                    // Si existe, obtener información adicional
                    $user1Info = getUserInfo($pdo, $existingChat['user1_id']);
                    $user2Info = getUserInfo($pdo, $existingChat['user2_id']);
                    $truequeInfo = getTruequeInfo($pdo, $existingChat['trueque_id']);
                    
                    // Contar mensajes no leídos para el usuario actual
                    $unreadCount = getUnreadCount($pdo, $chatId, $user_id);
                    
                    // Obtener el último mensaje si no está en el registro
                    if (empty($existingChat['last_message'])) {
                        $lastMsgStmt = $pdo->prepare("
                            SELECT message FROM trueque_messages 
                            WHERE chat_id = ? 
                            ORDER BY sent_at DESC LIMIT 1
                        ");
                        $lastMsgStmt->execute([$chatId]);
                        $lastMsg = $lastMsgStmt->fetch(PDO::FETCH_COLUMN);
                        $existingChat['last_message'] = $lastMsg ?: "";
                    }
                    
                    // Construir la conversación completa
                    $chat = [
                        'id' => $existingChat['id'],
                        'user1_id' => $existingChat['user1_id'],
                        'user2_id' => $existingChat['user2_id'],
                        'trueque_id' => $existingChat['trueque_id'],
                        'created_at' => $existingChat['created_at'],
                        'updated_at' => $existingChat['updated_at'],
                        'last_message' => $existingChat['last_message'],
                        'user1_name' => $user1Info['name'],
                        'user2_name' => $user2Info['name'],
                        'user1_photo' => $user1Info['photo'],
                        'user2_photo' => $user2Info['photo']
                    ];
                    
                    // Establecer contadores de mensajes no leídos
                    if ($existingChat['user1_id'] == $user_id) {
                        $chat['unread_count_user1'] = $unreadCount;
                        $chat['unread_count_user2'] = $existingChat['unread_count_user2'];
                    } else {
                        $chat['unread_count_user1'] = $existingChat['unread_count_user1'];
                        $chat['unread_count_user2'] = $unreadCount;
                    }
                    
                    // Agregar info del trueque si existe
                    if ($truequeInfo) {
                        $chat['trueque_title'] = $truequeInfo['title'];
                        $chat['trueque_image'] = $truequeInfo['image_path'];
                        $chat['trueque_city'] = $truequeInfo['city'];
                    }
                    
                    $reconstructedChats[] = $chat;
                } else {
                    // Si no existe en trueque_chats, reconstruir desde los mensajes
                    $firstMsgStmt = $pdo->prepare("
                        SELECT * FROM trueque_messages 
                        WHERE chat_id = ? 
                        ORDER BY sent_at ASC LIMIT 1
                    ");
                    $firstMsgStmt->execute([$chatId]);
                    $firstMsg = $firstMsgStmt->fetch(PDO::FETCH_ASSOC);
                    
                    $lastMsgStmt = $pdo->prepare("
                        SELECT * FROM trueque_messages 
                        WHERE chat_id = ? 
                        ORDER BY sent_at DESC LIMIT 1
                    ");
                    $lastMsgStmt->execute([$chatId]);
                    $lastMsg = $lastMsgStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($firstMsg && $lastMsg) {
                        // Determinar user1_id y user2_id (menor y mayor ID por convención)
                        $user1Id = min($firstMsg['sender_id'], $firstMsg['receiver_id']);
                        $user2Id = max($firstMsg['sender_id'], $firstMsg['receiver_id']);
                        
                        $user1Info = getUserInfo($pdo, $user1Id);
                        $user2Info = getUserInfo($pdo, $user2Id);
                        
                        // Contar mensajes no leídos
                        $unreadCountUser1 = 0;
                        $unreadCountUser2 = 0;
                        
                        if ($user_id == $user1Id) {
                            $unreadCountUser1 = getUnreadCount($pdo, $chatId, $user1Id);
                        } else {
                            $unreadCountUser2 = getUnreadCount($pdo, $chatId, $user2Id);
                        }
                        
                        // Crear un chat reconstruido
                        $chat = [
                            'id' => $chatId,
                            'user1_id' => $user1Id,
                            'user2_id' => $user2Id,
                            'trueque_id' => null, 
                            'created_at' => $firstMsg['sent_at'],
                            'updated_at' => $lastMsg['sent_at'],
                            'last_message' => $lastMsg['message'],
                            'user1_name' => $user1Info['name'],
                            'user2_name' => $user2Info['name'],
                            'user1_photo' => $user1Info['photo'],
                            'user2_photo' => $user2Info['photo'],
                            'unread_count_user1' => $unreadCountUser1,
                            'unread_count_user2' => $unreadCountUser2
                        ];
                        
                        // Crear el registro en trueque_chats para futuras consultas
                        try {
                            $createChatStmt = $pdo->prepare("
                                INSERT IGNORE INTO trueque_chats 
                                (id, user1_id, user2_id, created_at, updated_at, last_message, unread_count_user1, unread_count_user2) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            ");
                            $createChatStmt->execute([
                                $chatId,
                                $user1Id,
                                $user2Id,
                                $firstMsg['sent_at'],
                                $lastMsg['sent_at'],
                                $lastMsg['message'],
                                $unreadCountUser1,
                                $unreadCountUser2
                            ]);
                            error_log("get_trueque_chats.php: Creado registro en trueque_chats para el chat ID $chatId");
                        } catch (Exception $e) {
                            error_log("get_trueque_chats.php: Error al crear registro en trueque_chats: " . $e->getMessage());
                        }
                        
                        $reconstructedChats[] = $chat;
                    }
                }
            }
            
            // Ordenar las conversaciones por fecha de actualización, más recientes primero
            usort($reconstructedChats, function($a, $b) {
                return strtotime($b['updated_at']) - strtotime($a['updated_at']);
            });
            
            $chats = $reconstructedChats;
        }
        
        // Devolver SOLO las conversaciones
        echo json_encode(['success' => true, 'chats' => $chats]);
        exit;
        
    } catch (Exception $e) {
        error_log("Error en get_trueque_chats.php: " . $e->getMessage());
        throw $e;
    }
    
} catch (Exception $e) {
    // Limpiar cualquier salida que se haya generado
    ob_clean();
    
    http_response_code(500);
    
    // Asegurar que siempre devolvemos JSON válido
    echo json_encode([
        'success' => false, 
        'error' => 'Error al obtener los chats de trueques',
        'details' => $e->getMessage()
    ]);
    
    error_log("Error general en get_trueque_chats.php: " . $e->getMessage());
}

exit;

// Función auxiliar para obtener información del usuario
function getUserInfo($pdo, $userId) {
    $userStmt = $pdo->prepare("
        SELECT 
            u.name,
            IFNULL(p.profile_photo, '') as profile_photo
        FROM users u
        LEFT JOIN profile_preferences p ON p.user_id = u.id
        WHERE u.id = ?
    ");
    $userStmt->execute([$userId]);
    $user = $userStmt->fetch(PDO::FETCH_ASSOC);
    
    return [
        'name' => $user ? $user['name'] : 'Usuario',
        'photo' => $user ? $user['profile_photo'] : ''
    ];
}

// Función auxiliar para obtener información del trueque
function getTruequeInfo($pdo, $truequeId) {
    if (!$truequeId) return null;
    
    $truequeStmt = $pdo->prepare("
        SELECT id, title, image_path, city
        FROM trueques
        WHERE id = ?
    ");
    $truequeStmt->execute([$truequeId]);
    return $truequeStmt->fetch(PDO::FETCH_ASSOC);
}

// Función auxiliar para contar mensajes no leídos
function getUnreadCount($pdo, $chatId, $userId) {
    $unreadStmt = $pdo->prepare("
        SELECT COUNT(*) FROM trueque_messages 
        WHERE chat_id = ? AND receiver_id = ? AND is_read = 0
    ");
    $unreadStmt->execute([$chatId, $userId]);
    return $unreadStmt->fetchColumn();
}
?>