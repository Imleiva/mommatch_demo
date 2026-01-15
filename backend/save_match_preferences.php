<?php
/**
 * Gestor de preferencias para el algoritmo de matching
 * 
 * Este script maneja la configuración de preferencias de coincidencia de
 * cada usuaria, permitiéndoles personalizar los criterios de matching
 */

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

session_start([
    'name' => 'MomMatchSession',
]);

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No autenticado']);
    exit;
}

$userId = $_SESSION['user_id'];

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Datos no válidos']);
    exit;
}

$prioritizeConditions = isset($data['prioritize_conditions']) ? ($data['prioritize_conditions'] ? 1 : 0) : 0;
$connectionType = $data['connection_type'] ?? 'any';
$prioritizeCity = isset($data['prioritize_city']) ? ($data['prioritize_city'] ? 1 : 0) : 0;
$childAgeStages = $data['child_age_stages'] ?? [];

// Convertir el array de etapas a JSON para almacenamiento
$childAgeStagesJson = !empty($childAgeStages) ? json_encode($childAgeStages) : null;

try {
    $pdo = getDatabaseConnection();
    
    // Primero verificar si existe la columna preferred_child_stages en la tabla
    $columnsQuery = $pdo->query("DESCRIBE match_preferences");
    $columns = $columnsQuery->fetchAll(PDO::FETCH_COLUMN);
    $hasPreferredChildStages = in_array('preferred_child_stages', $columns);
    
    // Construir la consulta SQL basada en las columnas disponibles
    if ($hasPreferredChildStages) {
        $stmt = $pdo->prepare("
            INSERT INTO match_preferences (user_id, prioritize_conditions, connection_type, prioritize_city, preferred_child_stages)
            VALUES (:user_id, :prioritize_conditions, :connection_type, :prioritize_city, :preferred_child_stages)
            ON DUPLICATE KEY UPDATE
                prioritize_conditions = VALUES(prioritize_conditions),
                connection_type = VALUES(connection_type),
                prioritize_city = VALUES(prioritize_city),
                preferred_child_stages = VALUES(preferred_child_stages)
        ");
        
        $stmt->execute([
            ':user_id' => $userId,
            ':prioritize_conditions' => $prioritizeConditions,
            ':connection_type' => $connectionType,
            ':prioritize_city' => $prioritizeCity,
            ':preferred_child_stages' => $childAgeStagesJson
        ]);
    } else {
        // Si no existe la columna, usar la consulta original
        $stmt = $pdo->prepare("
            INSERT INTO match_preferences (user_id, prioritize_conditions, connection_type, prioritize_city)
            VALUES (:user_id, :prioritize_conditions, :connection_type, :prioritize_city)
            ON DUPLICATE KEY UPDATE
                prioritize_conditions = VALUES(prioritize_conditions),
                connection_type = VALUES(connection_type),
                prioritize_city = VALUES(prioritize_city)
        ");
        
        $stmt->execute([
            ':user_id' => $userId,
            ':prioritize_conditions' => $prioritizeConditions,
            ':connection_type' => $connectionType,
            ':prioritize_city' => $prioritizeCity
        ]);
      
    }

    // Si también necesitamos actualizar las etapas de edad de los hijos de la usuaria (no sus preferencias)
    if (!empty($childAgeStages)) {
        // Primero eliminar las etapas actuales para evitar duplicados
        $deleteStmt = $pdo->prepare("DELETE FROM user_child_stages WHERE user_id = :user_id");
        $deleteStmt->execute([':user_id' => $userId]);
        
        // Luego insertar las nuevas etapas
        $insertStmt = $pdo->prepare("
            INSERT INTO user_child_stages (user_id, stage_id, created_at) 
            VALUES (:user_id, :stage_id, NOW())
        ");
        
        foreach ($childAgeStages as $stageId) {
            if (is_numeric($stageId)) {
                $insertStmt->execute([
                    ':user_id' => $userId,
                    ':stage_id' => $stageId
                ]);
            }
        }
    }
    
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => 'Error interno del servidor',
        'details' => $e->getMessage()
    ]);
    error_log('Error al guardar las preferencias de coincidencia: ' . $e->getMessage());
}