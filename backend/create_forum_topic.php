<?php
/**
 * Endpoint para crear un tema en el foro
 * 
 * Este script permite a los usuarios autenticados crear nuevos temas
 * en el foro de la comunidad
 */

// Incluir configuración CORS
require_once 'cors.php';
require_once 'db.php';

// Verificar que sea una solicitud POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); 
    echo json_encode(['success' => false, 'message' => 'Solo se permiten solicitudes POST']);
    exit;
}

// Verificar la sesión del usuario
session_start([
    'name' => 'MomMatchSession',
]);
if (!isset($_SESSION['user_id'])) {
    http_response_code(401); 
    echo json_encode(['success' => false, 'message' => 'Debe iniciar sesión']);
    exit;
}

// Inicializar la conexión a la base de datos
$pdo = getDatabaseConnection();

// Obtener datos JSON del cuerpo de la solicitud
$data = json_decode(file_get_contents('php://input'), true);

// Validar que se proporcionaron datos necesarios
if (!isset($data['title']) || !isset($data['content']) || !isset($data['category'])) {
    http_response_code(400); 
    echo json_encode(['success' => false, 'message' => 'Faltan datos requeridos']);
    exit;
}

// Sanitizar datos de entrada
$title = htmlspecialchars(trim($data['title']));
$content = htmlspecialchars(trim($data['content']));
$category = htmlspecialchars(trim($data['category']));
$user_id = $_SESSION['user_id'];

// Validar que los campos no estén vacíos
if (empty($title) || empty($content) || empty($category)) {
    http_response_code(400); 
    echo json_encode(['success' => false, 'message' => 'Los campos no pueden estar vacíos']);
    exit;
}

try {
    // Verificar la estructura de la tabla forum_topics
    $tableStructureStmt = $pdo->query("DESCRIBE forum_topics");
    $columns = $tableStructureStmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Comprobar si los campos necesarios existen en la tabla
    $hasUserID = in_array('user_id', $columns);
    $hasContent = in_array('content', $columns);
    $hasDescription = in_array('description', $columns);
    $hasCategory = in_array('category', $columns);
    
    // Construir la consulta SQL según las columnas disponibles
    if ($hasUserID && $hasContent && $hasCategory) {
        // Si la tabla tiene las columnas user_id, content y category
        $stmt = $pdo->prepare("INSERT INTO forum_topics (user_id, title, content, category, created_at) VALUES (?, ?, ?, ?, NOW())");
        $result = $stmt->execute([$user_id, $title, $content, $category]);
    } elseif ($hasUserID && $hasDescription && $hasCategory) {
        // Si la tabla tiene las columnas user_id, description y category
        $stmt = $pdo->prepare("INSERT INTO forum_topics (user_id, title, description, category, created_at) VALUES (?, ?, ?, ?, NOW())");
        $result = $stmt->execute([$user_id, $title, $content, $category]);
    } elseif ($hasUserID && $hasContent) {
        // Si la tabla tiene las columnas user_id y content
        $stmt = $pdo->prepare("INSERT INTO forum_topics (user_id, title, content, created_at) VALUES (?, ?, ?, NOW())");
        $result = $stmt->execute([$user_id, $title, $content]);
    } elseif ($hasUserID && $hasDescription) {
        // Si la tabla tiene las columnas user_id y description
        $stmt = $pdo->prepare("INSERT INTO forum_topics (user_id, title, description, created_at) VALUES (?, ?, ?, NOW())");
        $result = $stmt->execute([$user_id, $title, $content]);
    } elseif ($hasDescription) {
        // Si solo tiene title, description
        $stmt = $pdo->prepare("INSERT INTO forum_topics (title, description, created_at) VALUES (?, ?, NOW())");
        $result = $stmt->execute([$title, $content]);
    } else {
        // Si solo tiene title, content
        $stmt = $pdo->prepare("INSERT INTO forum_topics (title, content, created_at) VALUES (?, ?, NOW())");
        $result = $stmt->execute([$title, $content]);
    }
    
    if ($result) {
        // Obtener el ID del tema recién creado
        $topic_id = $pdo->lastInsertId();
        
        http_response_code(201); // Created
        echo json_encode([
            'success' => true, 
            'message' => 'Tema creado exitosamente',
            'topic_id' => $topic_id
        ]);
    } else {
        throw new Exception("Error al crear el tema");
    }
} catch (Exception $e) {
    error_log("Error en create_forum_topic.php: " . $e->getMessage());
    http_response_code(500); // Internal Server Error
    echo json_encode([
        'success' => false, 
        'message' => 'Error al crear el tema: ' . $e->getMessage()
    ]);
}