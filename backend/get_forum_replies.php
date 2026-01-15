<?php
/**
 * API para obtener respuestas de un tema del foro
 * 
 * Este script obtiene todas las respuestas asociadas a un tema específico del foro
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

// Inicializar la conexión a la base de datos
$pdo = getDatabaseConnection();

// Obtener el ID del tema de la URL
if (!isset($_GET['topic_id']) || empty($_GET['topic_id'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'ID del tema requerido',
    ]);
    exit;
}

$topicId = $_GET['topic_id'];

try {
    // Verificar las columnas disponibles en la tabla users
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
    
    // Consultar las respuestas para el tema específico, usando directamente la columna 'reply'
    $stmt = $pdo->prepare("
        SELECT $selectFields, r.reply, $usernameField
        FROM forum_replies r
        $joinCondition
        WHERE r.topic_id = ?
        ORDER BY r.created_at ASC
    ");
    $stmt->execute([$topicId]);
    
    $replies = [];
    
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $replies[] = [
            'id' => $row['id'],
            'topic_id' => $row['topic_id'],
            'user_id' => $row['user_id'],
            'content' => $row['reply'], // Proporcionar 'content' para compatibilidad con el frontend
            'reply' => $row['reply'],   // Mantener el campo original
            'created_at' => $row['created_at'],
            'username' => $row['username'],
        ];
    }
    
    echo json_encode([
        'success' => true,
        'replies' => $replies
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}