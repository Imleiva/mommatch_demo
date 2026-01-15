<?php
/**
 * API para obtener preferencias de coincidencia de la usuaria
 * 
 * Este script recupera las preferencias de búsqueda que la usuaria
 * ha configurado para encontrar otras mamás. Tuve que implementar
 * un sistema de valores predeterminados para usuarias nuevas y resolver
 * problemas de codificación JSON en la columna preferred_child_stages.
 * Los logs de depuración me ayudaron a identificar valores incorrectos
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

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
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

try {
    $pdo = getDatabaseConnection();
    
    error_log("Obteniendo preferencias para el usuario ID: $userId");
    
    // Comprobar primero si el usuario existe en la tabla match_preferences
    $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM match_preferences WHERE user_id = :user_id");
    $checkStmt->execute([':user_id' => $userId]);
    $exists = $checkStmt->fetchColumn() > 0;
    
    if (!$exists) {
        error_log("No se encontraron preferencias para el usuario $userId. Usando valores predeterminados.");
    }
    
    // Obtener las preferencias de coincidencia
    $stmt = $pdo->prepare("
        SELECT mp.*, 
               pp.city
        FROM match_preferences mp
        LEFT JOIN profile_preferences pp ON mp.user_id = pp.user_id
        WHERE mp.user_id = :user_id
    ");
    $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
    $stmt->execute();

    $preferences = $stmt->fetch(PDO::FETCH_ASSOC);    // Obtener las etapas de edad directamente en formato de objetos completos
    if ($preferences) {
        // Decodificar preferred_child_stages si existe
        if (isset($preferences['preferred_child_stages']) && !empty($preferences['preferred_child_stages'])) {
            try {
                $decodedStages = json_decode($preferences['preferred_child_stages'], true);
                if (is_array($decodedStages)) {
                    $preferences['preferred_child_stages'] = $decodedStages;
                } else {
                    // Si no es un array después de decodificar, establecerlo como array vacío
                    $preferences['preferred_child_stages'] = [];
                }
            } catch (Exception $e) {
                // Si hay un error al decodificar, convertir a array vacío
                error_log('Error al decodificar preferred_child_stages: ' . $e->getMessage());
                $preferences['preferred_child_stages'] = [];
            }
        } else {
            // Asegurar que este campo siempre sea un array (incluso vacío)
            $preferences['preferred_child_stages'] = [];
        }

        try {
            // Obtener las etapas de edad de los hijos del usuario actual
            $stagesQuery = $pdo->prepare("
                SELECT cs.id, cs.stage_name, cs.age_range 
                FROM user_child_stages ucs
                JOIN child_age_stages cs ON ucs.stage_id = cs.id
                WHERE ucs.user_id = :user_id
                ORDER BY cs.id
            ");
            $stagesQuery->execute([':user_id' => $userId]);
            $childStages = $stagesQuery->fetchAll(PDO::FETCH_ASSOC);
            
            $preferences['child_stages'] = $childStages ?: [];
            
            error_log("Etapas de edad encontradas para usuario $userId: " . count($childStages));
        } catch (Exception $e) {
            error_log('Error al obtener las etapas de edad: ' . $e->getMessage());
            $preferences['child_stages'] = [];
        }
    } else {
        // Si no hay preferencias, crear un objeto predeterminado
        $preferences = [
            'user_id' => $userId,
            'connection_type' => 'any',
            'prioritize_conditions' => 0,
            'prioritize_city' => 0,
            'preferred_child_stages' => [],
            'child_stages' => [],
            'city' => null
        ];
        
        error_log("Creando preferencias predeterminadas para el usuario $userId");
        
        // Intentar obtener las etapas de edad incluso si no hay preferencias
        try {
            $stagesQuery = $pdo->prepare("
                SELECT cs.id, cs.stage_name, cs.age_range 
                FROM user_child_stages ucs
                JOIN child_age_stages cs ON ucs.stage_id = cs.id
                WHERE ucs.user_id = :user_id
                ORDER BY cs.id
            ");
            $stagesQuery->execute([':user_id' => $userId]);
            $childStages = $stagesQuery->fetchAll(PDO::FETCH_ASSOC);
            
            $preferences['child_stages'] = $childStages ?: [];
            
            error_log("Etapas de edad encontradas para usuario nuevo $userId: " . count($childStages));
        } catch (Exception $e) {
            error_log('Error al obtener las etapas de edad para usuario nuevo: ' . $e->getMessage());
            // No modificar el array vacío default
        }
    }

    echo json_encode(['success' => true, 'preferences' => $preferences]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => 'Error interno del servidor', 
        'details' => $e->getMessage()
    ]);
    error_log('Error al obtener las preferencias de coincidencia: ' . $e->getMessage());
}