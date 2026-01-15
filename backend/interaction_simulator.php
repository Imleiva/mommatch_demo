<?php
require_once 'db.php';
require_once 'cors.php';

// Sistema de simulación de interacciones paso a paso para testing del MatchCelebration modal
// Permite simular el flujo realista donde las usuarias se dan "Conectemos" mutuamente

$message = '';

// Procesar acciones POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'give_like':
            $fromUser = (int)$_POST['from_user'];
            $toUser = (int)$_POST['to_user'];
            $result = giveLike($fromUser, $toUser);
            $message = $result;
            break;
            
        case 'simulate_flow':
            $user1 = (int)$_POST['user1'];
            $user2 = (int)$_POST['user2'];
            $result = simulateMatchFlow($user1, $user2);
            $message = $result;
            break;
            
        case 'clear_interactions':
            $user = (int)$_POST['user_id'];
            $result = clearUserInteractions($user);
            $message = $result;
            break;
              case 'send_message':
            $fromUser = (int)$_POST['from_user_msg'];
            $toUser = (int)$_POST['to_user_msg'];
            $messageText = trim($_POST['message_text'] ?? '');
            $result = sendMessage($fromUser, $toUser, $messageText);
            $message = $result;
            break;
            
        case 'test_mark_read':
            $readerUser = (int)$_POST['reader_user'];
            $senderUser = (int)$_POST['sender_user'];
            $result = testMarkMessagesRead($readerUser, $senderUser);
            $message = $result;
            break;
    }
}

// Función para que un usuario de like a otro
function giveLike($fromUserId, $toUserId) {
    $pdo = getDatabaseConnection();
    
    try {
        // Verificar que ambos usuarios existen
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE id IN (?, ?)");
        $stmt->execute([$fromUserId, $toUserId]);
        if ($stmt->fetchColumn() < 2) {
            return "❌ Error: Uno o ambos usuarios no existen";
        }
        
        // Verificar si ya existe una interacción
        $stmt = $pdo->prepare("
            SELECT status FROM matches 
            WHERE user_id_1 = ? AND user_id_2 = ?
        ");
        $stmt->execute([$fromUserId, $toUserId]);
        $existingMatch = $stmt->fetch();
        
        if ($existingMatch) {
            if ($existingMatch['status'] === 'pending') {
                return "La usuaria $fromUserId ya dio like a la usuaria $toUserId";
            } elseif ($existingMatch['status'] === 'matched') {
                return "Ya existe un match entre estas usuarias";
            }
        }
        
        // Crear el like
        $stmt = $pdo->prepare("
            INSERT INTO matches (user_id_1, user_id_2, status, created_at) 
            VALUES (?, ?, 'pending', NOW())
            ON DUPLICATE KEY UPDATE status = 'pending'
        ");
        $stmt->execute([$fromUserId, $toUserId]);
        
        // Verificar si hay match mutuo
        $stmt = $pdo->prepare("
            SELECT 1 FROM matches 
            WHERE user_id_1 = ? AND user_id_2 = ? AND status = 'pending'
        ");
        $stmt->execute([$toUserId, $fromUserId]);
        
        if ($stmt->fetch()) {
            // ¡Es un match! Actualizar ambos registros
            $pdo->prepare("
                UPDATE matches 
                SET status = 'matched', matched_at = NOW() 
                WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)
            ")->execute([$fromUserId, $toUserId, $toUserId, $fromUserId]);
            
            return "🎉 ¡MATCH! Las usuarias $fromUserId y $toUserId ahora son un match. ¡Verifica el modal de celebración en el frontend!";
        } else {
            return "👍 Like registrado: Usuaria $fromUserId dio like a usuaria $toUserId. Esperando reciprocidad...";
        }
        
    } catch (Exception $e) {
        return "❌ Error: " . $e->getMessage();
    }
}

// Función para simular el flujo completo paso a paso
function simulateMatchFlow($user1Id, $user2Id) {
    $pdo = getDatabaseConnection();
    
    try {
        // Limpiar interacciones existentes
        clearUserInteractions($user1Id);
        clearUserInteractions($user2Id);
        
        $steps = [];
        
        // Paso 1: Usuario 1 da like a Usuario 2
        $stmt = $pdo->prepare("
            INSERT INTO matches (user_id_1, user_id_2, status, created_at) 
            VALUES (?, ?, 'pending', NOW())
        ");
        $stmt->execute([$user1Id, $user2Id]);
        $steps[] = "✅ Paso 1: Usuaria $user1Id dio 'Conectemos' a usuaria $user2Id";
        
        // Simular un pequeño delay
        sleep(1);
        
        // Paso 2: Usuario 2 da like de vuelta a Usuario 1
        $stmt = $pdo->prepare("
            INSERT INTO matches (user_id_1, user_id_2, status, created_at) 
            VALUES (?, ?, 'pending', NOW())
        ");
        $stmt->execute([$user2Id, $user1Id]);
        $steps[] = "✅ Paso 2: Usuaria $user2Id dio 'Conectemos' de vuelta a usuaria $user1Id";
        
        // Paso 3: Convertir en match
        $pdo->prepare("
            UPDATE matches 
            SET status = 'matched', matched_at = NOW() 
            WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)
        ")->execute([$user1Id, $user2Id, $user2Id, $user1Id]);
        $steps[] = "🎉 Paso 3: ¡MATCH CREADO! Las usuarias ahora son compatibles";
        
        return implode("<br>", $steps) . "<br><br><strong>Ve al frontend y verifica que aparece el modal de celebración!</strong>";
        
    } catch (Exception $e) {
        return "❌ Error simulando flujo: " . $e->getMessage();
    }
}

// Función para enviar un mensaje como si fueras otra usuaria
function sendMessage($fromUserId, $toUserId, $messageText) {
    if (empty($messageText)) {
        return "❌ Error: El mensaje no puede estar vacío";
    }
    
    $pdo = getDatabaseConnection();
    
    try {
        // Verificar que ambos usuarios existen
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE id IN (?, ?)");
        $stmt->execute([$fromUserId, $toUserId]);
        if ($stmt->fetchColumn() < 2) {
            return "❌ Error: Uno o ambos usuarios no existen";
        }
        
        // Verificar que existe un match entre los usuarios
        $stmt = $pdo->prepare("
            SELECT COUNT(*) FROM matches 
            WHERE ((user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?))
            AND status = 'matched'
        ");
        $stmt->execute([$fromUserId, $toUserId, $toUserId, $fromUserId]);
        
        if ($stmt->fetchColumn() == 0) {
            return "⚠️ Advertencia: No existe un match entre estos usuarios, pero se enviará el mensaje de todas formas";
        }
          // Insertar el mensaje
        $stmt = $pdo->prepare("
            INSERT INTO chat_messages (sender_id, receiver_id, message, created_at, is_read) 
            VALUES (?, ?, ?, NOW(), 0)
        ");
        $stmt->execute([$fromUserId, $toUserId, $messageText]);
        
        // Obtener nombres de los usuarios
        $stmt = $pdo->prepare("SELECT name FROM users WHERE id IN (?, ?)");
        $stmt->execute([$fromUserId, $toUserId]);
        $users = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        return "✅ Mensaje enviado exitosamente de {$users[0]} a {$users[1]}";
        
    } catch (Exception $e) {
        return "❌ Error enviando mensaje: " . $e->getMessage();
    }
}

// Función para limpiar todas las interacciones de un usuario
function clearUserInteractions($userId) {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("DELETE FROM matches WHERE user_id_1 = ? OR user_id_2 = ?");
    $stmt->execute([$userId, $userId]);
    $count = $stmt->rowCount();
    return "🧹 Se eliminaron $count interacciones para la usuaria $userId";
}

// Función para obtener todos los usuarios
function getAllUsers() {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("
        SELECT u.id, u.name, pp.profile_photo 
        FROM users u 
        LEFT JOIN profile_preferences pp ON u.id = pp.user_id 
        ORDER BY u.id
    ");
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Función para obtener el estado de las interacciones
function getInteractionStatus() {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("
        SELECT m.*, 
               u1.name as user1_name, 
               u2.name as user2_name,
               CASE 
                   WHEN m.status = 'pending' THEN 'Esperando reciprocidad'
                   WHEN m.status = 'matched' THEN 'Match confirmado'
                   ELSE 'Desconocido'
               END as status_display
        FROM matches m 
        JOIN users u1 ON m.user_id_1 = u1.id 
        JOIN users u2 ON m.user_id_2 = u2.id 
        ORDER BY m.created_at DESC 
        LIMIT 20
    ");
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Simular la funcionalidad de marcar mensajes como leídos
 */
function testMarkMessagesRead($readerUserId, $senderUserId) {
    try {
        $pdo = getDatabaseConnection();
        
        // Verificar si hay mensajes sin leer del remitente al lector
        $stmt = $pdo->prepare("
            SELECT COUNT(*) 
            FROM chat_messages 
            WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
        ");
        $stmt->execute([$senderUserId, $readerUserId]);
        $unreadCount = $stmt->fetchColumn();
        
        if ($unreadCount == 0) {
            return "No hay mensajes sin leer del usuario $senderUserId para el usuario $readerUserId";
        }
        
        // Simular la sesión del usuario que lee
        session_start(['name' => 'MomMatchSession']);
        $_SESSION['user_id'] = $readerUserId;
        
        // Hacer la llamada al endpoint real
        $postData = json_encode(['other_user_id' => $senderUserId]);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'http://localhost/mommatch/backend/mark_messages_read.php');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($postData)
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_COOKIE, session_name() . '=' . session_id());
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200) {
            $responseData = json_decode($response, true);
            if ($responseData && $responseData['success']) {
                return "✅ Éxito: Usuario $readerUserId marcó como leídos {$responseData['count']} mensajes del usuario $senderUserId";
            } else {
                return "❌ Error en la respuesta: " . ($responseData['message'] ?? 'Respuesta inválida');
            }
        } else {
            return "❌ Error HTTP $httpCode: $response";
        }
        
    } catch (Exception $e) {
        return "❌ Error de prueba: " . $e->getMessage();
    }
}

$users = getAllUsers();
$interactions = getInteractionStatus();
$pdo = getDatabaseConnection(); // Para la consulta de mensajes
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simulador de Interacciones - MomMatch</title>
    <style>
        body {
            font-family: 'Poppins', sans-serif;
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }
        
        .container {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 25px;
        }
        
        .container h3 {
            color: #333;
            border-bottom: 3px solid #ff6f61;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #555;
        }
        
        select, input {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        select:focus, input:focus {
            outline: none;
            border-color: #ff6f61;
        }
        
        .btn {
            background: linear-gradient(45deg, #ff6f61, #ff8a65);
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-right: 10px;
            margin-bottom: 10px;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(255, 111, 97, 0.4);
        }
        
        .btn-secondary {
            background: linear-gradient(45deg, #42a5f5, #26c6da);
        }
        
        .btn-danger {
            background: linear-gradient(45deg, #ef5350, #f44336);
        }
        
        .message {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-weight: 500;
        }
        
        .message.success {
            background-color: #e8f5e8;
            color: #2e7d32;
            border: 1px solid #4caf50;
        }
        
        .message.error {
            background-color: #ffebee;
            color: #c62828;
            border: 1px solid #f44336;
        }
        
        .two-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
        }
        
        .interaction-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        .interaction-table th,
        .interaction-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        .interaction-table th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #333;
        }
        
        .interaction-table tr:hover {
            background-color: #f8f9fa;
        }
        
        .quick-actions {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            margin-bottom: 20px;
        }
        
        .status-indicator {
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 14px;
            font-weight: 500;
        }
        
        .status-pending {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .status-matched {
            background-color: #d4edda;
            color: #155724;
        }
        
        .highlight-box {
            background: linear-gradient(45deg, #ff6f61, #ff8a65);
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: center;
        }
        
        @media (max-width: 768px) {
            .two-column {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>    <div class="header">
        <h1>🎯 Simulador de Interacciones MomMatch</h1>
        <p>Simula interacciones y envía mensajes para testing completo de la aplicación</p>
    </div>
    
    <?php if ($message): ?>
        <div class="message <?php echo strpos($message, '❌') !== false ? 'error' : 'success'; ?>">
            <?php echo $message; ?>
        </div>
    <?php endif; ?>
    
    <div class="highlight-box">
        <p><strong>Funcionalidades disponibles:</strong></p>
        <p>• Simular likes y matches entre usuarias<br>
        • Enviar mensajes como cualquier usuaria para testing<br>
        • Ver estado de todas las interacciones en tiempo real</p>
    </div>
    
    <div class="two-column">
        <!-- Conectemos Individual -->
        <div class="container">
            <h3>Conectemos Individual</h3>
            <form method="POST">
                <input type="hidden" name="action" value="give_like">
                <div class="form-group">
                    <label for="from_user">Usuaria que da "Conectemos":</label>
                    <select name="from_user" id="from_user" required>
                        <option value="">Seleccionar usuaria...</option>
                        <?php foreach ($users as $user): ?>
                            <option value="<?php echo $user['id']; ?>">
                                <?php echo htmlspecialchars($user['name']) . " (ID: " . $user['id'] . ")"; ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group">
                    <label for="to_user">Usuaria que recibe el like:</label>
                    <select name="to_user" id="to_user" required>
                        <option value="">Seleccionar usuaria...</option>
                        <?php foreach ($users as $user): ?>
                            <option value="<?php echo $user['id']; ?>">
                                <?php echo htmlspecialchars($user['name']) . " (ID: " . $user['id'] . ")"; ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <button type="submit" class="btn"> Dar "Conectemos"</button>
            </form>
        </div>
        
        <!-- Simular Flujo Completo -->
        <div class="container">
            <h3> Simular Flujo Completo</h3>
            <p><strong>Simula automáticamente el proceso completo:</strong></p>
            <ul>
                <li>Usuaria 1 da like a Usuaria 2</li>
                <li>Usuaria 2 da like de vuelta</li>
                <li>Se crea el match automáticamente</li>
            </ul>
            <form method="POST">
                <input type="hidden" name="action" value="simulate_flow">
                <div class="form-group">
                    <label for="user1">Primera usuaria:</label>
                    <select name="user1" id="user1" required>
                        <option value="">Seleccionar usuaria...</option>
                        <?php foreach ($users as $user): ?>
                            <option value="<?php echo $user['id']; ?>">
                                <?php echo htmlspecialchars($user['name']) . " (ID: " . $user['id'] . ")"; ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group">
                    <label for="user2">Segunda usuaria:</label>
                    <select name="user2" id="user2" required>
                        <option value="">Seleccionar usuaria...</option>
                        <?php foreach ($users as $user): ?>
                            <option value="<?php echo $user['id']; ?>">
                                <?php echo htmlspecialchars($user['name']) . " (ID: " . $user['id'] . ")"; ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <button type="submit" class="btn btn-secondary">Simular Flujo Completo</button>            </form>
        </div>
        
        <!-- Enviar Mensaje -->
        <div class="container">
            <h3>Enviar Mensaje</h3>
            <p><strong>Envía un mensaje como si fueras otra usuaria</strong></p>
            <form method="POST">
                <input type="hidden" name="action" value="send_message">
                <div class="form-group">
                    <label for="from_user_msg">Usuaria que envía:</label>
                    <select name="from_user_msg" id="from_user_msg" required>
                        <option value="">Seleccionar usuaria...</option>
                        <?php foreach ($users as $user): ?>
                            <option value="<?php echo $user['id']; ?>">
                                <?php echo htmlspecialchars($user['name']) . " (ID: " . $user['id'] . ")"; ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group">
                    <label for="to_user_msg">Usuaria que recibe:</label>
                    <select name="to_user_msg" id="to_user_msg" required>
                        <option value="">Seleccionar usuaria...</option>
                        <?php foreach ($users as $user): ?>
                            <option value="<?php echo $user['id']; ?>">
                                <?php echo htmlspecialchars($user['name']) . " (ID: " . $user['id'] . ")"; ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group">
                    <label for="message_text">Mensaje:</label>
                    <textarea name="message_text" id="message_text" rows="3" placeholder="Escribe el mensaje aquí..." required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-family: inherit;"></textarea>
                </div>
                <button type="submit" class="btn">Enviar Mensaje</button>
            </form>
        </div>
    </div>
    
    <!-- Acciones Rápidas -->
    <div class="container">
        <h3>⚡ Acciones Rápidas</h3>
        <div class="quick-actions">
            <form method="POST" style="display: inline;">
                <input type="hidden" name="action" value="simulate_flow">
                <input type="hidden" name="user1" value="28">
                <input type="hidden" name="user2" value="<?php echo $users[1]['id'] ?? '1'; ?>">
                <button type="submit" class="btn">Match Rápido (User 28)</button>
            </form>
            
            <form method="POST" style="display: inline;">
                <input type="hidden" name="action" value="clear_interactions">
                <input type="hidden" name="user_id" value="28">
                <button type="submit" class="btn btn-danger">Limpiar User 28</button>
            </form>
          
        </div>
    </div>
    
    <!-- Estado de Interacciones -->
    <div class="container">
        <h3>Estado Actual de Interacciones</h3>
        
        <?php if (count($interactions) > 0): ?>
            <table class="interaction-table">
                <thead>
                    <tr>
                        <th>De</th>
                        <th>Para</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($interactions as $interaction): ?>
                        <tr>
                            <td><?php echo htmlspecialchars($interaction['user1_name']) . " (ID: " . $interaction['user_id_1'] . ")"; ?></td>
                            <td><?php echo htmlspecialchars($interaction['user2_name']) . " (ID: " . $interaction['user_id_2'] . ")"; ?></td>
                            <td>
                                <span class="status-indicator status-<?php echo $interaction['status']; ?>">
                                    <?php echo $interaction['status_display']; ?>
                                </span>
                            </td>
                            <td><?php echo $interaction['created_at']; ?></td>
                            <td>
                                <?php if ($interaction['status'] === 'pending'): ?>
                                    <form method="POST" style="display: inline;">
                                        <input type="hidden" name="action" value="give_like">
                                        <input type="hidden" name="from_user" value="<?php echo $interaction['user_id_2']; ?>">
                                        <input type="hidden" name="to_user" value="<?php echo $interaction['user_id_1']; ?>">
                                        <button type="submit" class="btn" style="padding: 5px 10px; font-size: 12px;">
                                            Reciprocar
                                        </button>
                                    </form>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>        <?php else: ?>
            <p style="text-align: center; color: #666; font-style: italic;">
                 No hay interacciones actualmente. ¡Crea algunas usando los formularios de arriba!
            </p>
        <?php endif; ?>    </div>
  
    
    <!-- Últimos Mensajes -->
    <div class="container">
        <h3>Últimos Mensajes Enviados</h3>
        
        <?php        // Obtener los últimos mensajes para mostrar como feedback
        $stmt = $pdo->prepare("
            SELECT m.*, 
                   u1.name as sender_name, 
                   u2.name as receiver_name,
                   DATE_FORMAT(m.created_at, '%d/%m/%Y %H:%i') as formatted_date
            FROM chat_messages m 
            JOIN users u1 ON m.sender_id = u1.id 
            JOIN users u2 ON m.receiver_id = u2.id 
            ORDER BY m.created_at DESC 
            LIMIT 10
        ");
        $stmt->execute();
        $recent_messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
        ?>
        
        <?php if (count($recent_messages) > 0): ?>
            <table class="interaction-table">
                <thead>
                    <tr>
                        <th>De</th>
                        <th>Para</th>
                        <th>Mensaje</th>
                        <th>Fecha</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($recent_messages as $msg): ?>
                        <tr>
                            <td><?php echo htmlspecialchars($msg['sender_name']) . " (ID: " . $msg['sender_id'] . ")"; ?></td>
                            <td><?php echo htmlspecialchars($msg['receiver_name']) . " (ID: " . $msg['receiver_id'] . ")"; ?></td>
                            <td style="max-width: 300px; word-wrap: break-word;"><?php echo htmlspecialchars($msg['message']); ?></td>
                            <td><?php echo $msg['formatted_date']; ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php else: ?>
            <p style="text-align: center; color: #666; font-style: italic;">
                📭 No hay mensajes aún. ¡Envía algunos usando el formulario de arriba!
            </p>
        <?php endif; ?>
    </div>
</body>
</html>
