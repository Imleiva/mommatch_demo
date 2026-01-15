<?php
/**
 * Endpoint para añadir respuestas al foro
 * 
 * Este script maneja la creación de respuestas a temas del foro.
 * Tiene que identificar al usuario que publica la respuesta, lo cual
 * resultó complicado por las diferentes estructuras de datos que pueden
 * existir en la tabla de usuarios. Tuve que implementar una lógica flexible
 * para determinar el nombre de usuario desde varios campos posibles
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

// Obtener los datos de la solicitud
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data || !isset($data['topicId']) || !isset($data['content'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Datos incompletos',
    ]);
    exit;
}

$topicId = $data['topicId'];
$content = $data['content'];

try {
    // Verificar las columnas disponibles en la tabla users
    $userTableStmt = $pdo->prepare("DESCRIBE users");
    $userTableStmt->execute();
    $userColumns = $userTableStmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Construir la consulta según las columnas disponibles
    $userFields = [];
    if (in_array('first_name', $userColumns)) {
        $userFields[] = 'first_name';
    }
    if (in_array('last_name', $userColumns)) {
        $userFields[] = 'last_name';
    }
    if (in_array('name', $userColumns)) {
        $userFields[] = 'name';
    }
    if (in_array('username', $userColumns)) {
        $userFields[] = 'username';
    }
    if (in_array('email', $userColumns)) {
        $userFields[] = 'email';
    }
    
    $username = "Usuario"; // Valor predeterminado
    
    if (!empty($userFields)) {
        $fieldsStr = implode(', ', $userFields);
        $userStmt = $pdo->prepare("SELECT $fieldsStr FROM users WHERE id = ?");
        $userStmt->execute([$userId]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user) {
            // Intentar determinar un nombre de usuario apropiado
            if (isset($user['first_name']) && isset($user['last_name'])) {
                $username = $user['first_name'] . ' ' . $user['last_name'];
            } elseif (isset($user['name'])) {
                $username = $user['name'];
            } elseif (isset($user['username'])) {
                $username = $user['username'];
            } elseif (isset($user['email'])) {
                // Extraer la parte del nombre del correo electrónico
                $username = explode('@', $user['email'])[0];
            }
        }
    }

    // Insertar directamente en la columna 'reply'
    $insertStmt = $pdo->prepare("INSERT INTO forum_replies (topic_id, user_id, reply) VALUES (?, ?, ?)");
    $insertStmt->execute([$topicId, $userId, $content]);
    
    $replyId = $pdo->lastInsertId();
    
    // Obtener la respuesta recién creada
    $replyStmt = $pdo->prepare("SELECT id, topic_id, user_id, reply as content, created_at FROM forum_replies WHERE id = ?");
    $replyStmt->execute([$replyId]);
    $reply = $replyStmt->fetch(PDO::FETCH_ASSOC);
    
    // Añadir el nombre de usuario a la respuesta
    $reply['username'] = $username;
    
    echo json_encode([
        'success' => true, 
        'reply' => $reply
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => $e->getMessage()
    ]);
}