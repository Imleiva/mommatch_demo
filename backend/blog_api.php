<?php
/**
 * API para obtener artículos del blog
 * 
 * Este script recupera los artículos del blog para mostrarlos en el frontend
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';


// Configuración de errores para desarrollo
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

try {
    // Obtener conexión a la base de datos
    $pdo = getDatabaseConnection();
    
    // Manejar CORS
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit();
    }
    
    // Validar acción
    $action = $_GET['action'] ?? '';
    if ($action !== 'get_articles') {
        throw new InvalidArgumentException('Acción no válida', 400);
    }
    
    // Consulta segura con prepared statements
    $stmt = $pdo->query("
    SELECT 
        id, 
        title, 
        category, 
        CONCAT('/images/blog/', image) as image,
        excerpt, 
        date 
    FROM articles
    ORDER BY date DESC
");
    $articles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Formatear respuesta
    echo json_encode([
        'status' => 'success',
        'data' => $articles,
        'count' => count($articles),
        'timestamp' => date('c')
    ]);
    
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'code' => $e->getCode()
    ]);
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Error del servidor',
        'error' => $e->getMessage(),
        'code' => $e->getCode()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Error inesperado',
        'error' => $e->getMessage()
    ]);
}