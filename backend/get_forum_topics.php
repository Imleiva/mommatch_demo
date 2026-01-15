<?php
/**
 * API para obtener todos los temas del foro
 * 
 * Este script devuelve la lista completa de temas del foro para mostrarlos en la
 * página principal del foro
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

session_start([
    'name' => 'MomMatchSession',
]);

header('Content-Type: application/json; charset=utf-8');

// Check if the user is authenticated
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No autenticado']);
    exit;
}

$userId = $_SESSION['user_id'];
$pdo = getDatabaseConnection();

try {
    // Verificar la estructura de la tabla para entender sus columnas
    $tableStructureStmt = $pdo->query("DESCRIBE forum_topics");
    $columns = $tableStructureStmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Construir la consulta SQL basada en las columnas existentes
    $selectionFields = "t.id, t.created_at";
    
    // Comprobar si existe la columna title
    if (in_array('title', $columns)) {
        $selectionFields .= ", t.title";
    }
    
    // Comprobar columnas de contenido (content o description)
    $hasContent = in_array('content', $columns);
    $hasDescription = in_array('description', $columns);
    
    if ($hasContent) {
        $selectionFields .= ", t.content";
    }
    if ($hasDescription) {
        $selectionFields .= ", t.description";
    }
    
    // Comprobar si existe la columna category
    $hasCategory = in_array('category', $columns);
    if ($hasCategory) {
        $selectionFields .= ", t.category";
    }
    
    // Comprobar si existe la columna user_id
    $hasUserId = in_array('user_id', $columns);
    if ($hasUserId) {
        $selectionFields .= ", t.user_id";
    }
    
    // Seleccionar los temas sin intentar unirlos a la tabla de usuarios por ahora
    $stmt = $pdo->query("
        SELECT $selectionFields
        FROM forum_topics t
        ORDER BY t.created_at DESC
    ");
    $topicsRaw = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Procesar los resultados para asegurar compatibilidad con el frontend
    $topics = [];
    foreach ($topicsRaw as $topic) {
        $processedTopic = [
            'id' => $topic['id'],
            'created_at' => $topic['created_at'],
            'author_name' => 'Usuario' // Valor por defecto ya que no se une a la tabla de usuarios
        ];
        
        // Asignar título
        if (isset($topic['title'])) {
            $processedTopic['title'] = $topic['title'];
        } else {
            $processedTopic['title'] = "Tema sin título";
        }
        
        // Asignar contenido según las columnas disponibles
        if ($hasDescription) {
            $processedTopic['description'] = $topic['description'];
            // Proporcionar 'content' si el frontend lo espera
            $processedTopic['content'] = $topic['description'];
        } 
        if ($hasContent) {
            $processedTopic['content'] = $topic['content'];
            // Proporcionar 'description' si no existe
            if (!$hasDescription) {
                $processedTopic['description'] = $topic['content'];
            }
        }
        
        // Asignar categoría si existe
        if ($hasCategory && isset($topic['category'])) {
            $processedTopic['category'] = $topic['category'];
        } else {
            $processedTopic['category'] = "General";
        }
        
        // Asignar usuario_id si existe
        if ($hasUserId && isset($topic['user_id'])) {
            $processedTopic['user_id'] = $topic['user_id'];
            
            // Si tenemos user_id, podemos intentar obtener su nombre
            try {
                $userStmt = $pdo->prepare("SELECT name FROM users WHERE id = ?");
                $userStmt->execute([$topic['user_id']]);
                $user = $userStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($user && isset($user['name'])) {
                    $processedTopic['author_name'] = $user['name'];
                }
            } catch (Exception $ex) {
                // Si hay un error al obtener el nombre, simplemente lo dejamos como "Usuario"
                error_log("Error fetching user name: " . $ex->getMessage());
            }
        }
        
        $topics[] = $processedTopic;
    }

    echo json_encode(['success' => true, 'topics' => $topics]);
} catch (Exception $e) {
    error_log("Error in get_forum_topics.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error fetching topics: ' . $e->getMessage()]);
}