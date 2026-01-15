<?php
/**
 * Sistema de búsqueda y filtrado de perfiles para matchmaking
 * 
 * Este archivo implementa la funcionalidad principal de búsqueda de perfiles compatibles
 * entre usuarias. Fue probablemente el script más complejo de toda la aplicación,
 * con una lógica de filtrado avanzada que incluye compatibilidad por edad de hijos, tipo de conexion
 * condiciones especiales y ubicación
 */

// Importar la configuración CORS antes de cualquier output
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

// Verificar si el usuario está autenticado mediante sesión
session_start([
    'name' => 'MomMatchSession',
]);
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

$user_id = $_SESSION['user_id']; // ID del usuario actual autenticado

// Obtener parámetros de filtro desde la URL (GET)
$connectionType = isset($_GET['connectionType']) ? $_GET['connectionType'] : null;
$specialConditions = isset($_GET['specialConditions']) ? $_GET['specialConditions'] : '[]';
$city = isset($_GET['city']) ? trim($_GET['city']) : null;
$childAgeStages = isset($_GET['childAgeStages']) ? $_GET['childAgeStages'] : '[]';

// Mejor logging para debugging
error_log("Filtrado - Ciudad: '$city', ConnectionType: " . ($connectionType ?? "any"));
error_log("childAgeStages (raw): " . print_r($childAgeStages, true));

// Convertir los parámetros JSON a objetos/arrays PHP
try {
    // Procesar condiciones especiales
    if (!is_array($specialConditions)) {
        $specialConditions = json_decode($specialConditions, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("Error decodificando specialConditions: " . json_last_error_msg());
            $specialConditions = [];
        }
    }
    
    // Procesar etapas de edad de hijos - Manejo mejorado
    if (!is_array($childAgeStages)) {
        // Verificar si es una cadena con formato de array o CSV
        if (is_string($childAgeStages)) {
            if (strpos($childAgeStages, '[') === 0) {
                // Formato JSON array, intentar decodificar
                $childAgeStages = json_decode($childAgeStages, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    error_log("Error decodificando childAgeStages como JSON: " . json_last_error_msg());
                    $childAgeStages = [];
                }
            } elseif (strpos($childAgeStages, ',') !== false) {
                // Formato CSV, dividir por comas
                $childAgeStages = array_map('trim', explode(',', $childAgeStages));
            } elseif (is_numeric($childAgeStages)) {
                // Un solo ID numérico
                $childAgeStages = [$childAgeStages];
            } else {
                $childAgeStages = [];
            }
        } else {
            $childAgeStages = [];
        }
    }
    
    // Asegurar que todos los valores son enteros
    $childAgeStages = array_map('intval', array_filter($childAgeStages, 'is_numeric'));
    
    // Registrar los valores procesados para debugging
    error_log("childAgeStages (procesado): " . print_r($childAgeStages, true));
    
} catch (Exception $e) {
    error_log("Error procesando parámetros: " . $e->getMessage());
}

try {
    // Establecer conexión a la base de datos
    $pdo = getDatabaseConnection();

    /**
     * Consulta SQL para obtener perfiles compatibles
     */
    $sql = "SELECT 
                u.id, 
                u.name, 
                mp.connection_type, 
                mp.prioritize_conditions, 
                pp.city, 
                pp.special_conditions, 
                pp.profile_photo, 
                pp.presentation
            FROM users u
            LEFT JOIN profile_preferences pp ON u.id = pp.user_id
            LEFT JOIN match_preferences mp ON u.id = mp.user_id
            WHERE u.id != :user_id
            AND u.id NOT IN (SELECT user_id_2 FROM matches WHERE user_id_1 = :user_id)
            AND u.name IS NOT NULL 
            AND u.name != ''";

    // Parámetros base para la consulta parametrizada
    $params = [':user_id' => $user_id];

    // Aplicar filtro de ciudad si está definido y no está vacío
    if ($city !== null && $city !== '') {
        // Filtro exacto por ciudad (case-insensitive)
        $sql .= " AND LOWER(TRIM(pp.city)) = LOWER(TRIM(:city))";
        $params[':city'] = $city;
        error_log("Aplicando filtro de ciudad: $city");
    } else {
        // Si no hay filtro de ciudad, ordenar aleatoriamente
        $orderClause = " ORDER BY RAND()";
    }

    // Corregir el filtro de tipo de conexión preferida
    if ($connectionType !== null && $connectionType !== 'any') {
        $sql .= " AND (mp.connection_type = :connection_type OR mp.connection_type IS NULL)";
        $params[':connection_type'] = $connectionType;
    }

    // Aplicar filtro de condiciones especiales si está definido
    if (!empty($specialConditions)) {
        $sql .= " AND (" . implode(" OR ", array_map(function ($index) {
            return "pp.special_conditions LIKE :condition_$index";
        }, array_keys($specialConditions))) . ")";
        foreach ($specialConditions as $index => $condition) {
            $params[":condition_$index"] = "%$condition%";
        }
    }    // Aplicar filtro de etapas de edad de hijos si está definido
    if (!empty($childAgeStages)) {
        $placeholders = array_map(function($i) { return ":stage_$i"; }, array_keys($childAgeStages));
        
        // Buscar perfiles que tengan al menos una de las etapas seleccionadas
        $sql .= " AND u.id IN (
            SELECT DISTINCT ucs.user_id 
            FROM user_child_stages ucs 
            WHERE ucs.stage_id IN (" . implode(',', $placeholders) . ")
        )";
        
        // Agregar cada ID de etapa como un parámetro
        foreach ($childAgeStages as $i => $stageId) {
            $params[":stage_$i"] = $stageId;
        }
        
        error_log("Aplicando filtro de etapas: " . implode(", ", $childAgeStages));
    }

    // Asegurarse de agrupar por ID de usuario cuando se usan JOINs con relaciones muchos a muchos
    $sql .= " GROUP BY u.id";

    // Agregar la cláusula ORDER BY al final de la consulta
    $sql .= $orderClause ?? " ORDER BY RAND()";
    
    // Loguear la consulta final para debugging
    error_log("SQL generado: " . $sql);
    error_log("Parámetros: " . print_r($params, true));

    // Ejecutar la consulta principal para obtener perfiles
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    error_log("Perfiles encontrados (antes de filtrado): " . count($profiles));

    // Filtrar perfiles inválidos antes de procesarlos
    $profiles = array_filter($profiles, function($profile) {
        // Filtrar perfiles sin ID o sin nombre
        return isset($profile['id']) && !empty($profile['id']) && 
               isset($profile['name']) && !empty($profile['name']);
    });

    // Reindexar después del filtrado inicial
    $profiles = array_values($profiles);
    error_log("Perfiles válidos después de filtrado: " . count($profiles));

    // Para cada perfil, agregar sus datos mediante consultas adicionales
    foreach ($profiles as &$profile) {
        // Asegurar que los campos esenciales estén definidos
        $profile['id'] = $profile['id'] ?? null;
        $profile['name'] = $profile['name'] ?? 'Nombre no disponible';
        $profile['city'] = $profile['city'] ?? 'Ciudad no especificada';
        $profile['presentation'] = $profile['presentation'] ?? '';
        $profile['connection_type'] = $profile['connection_type'] ?? 'any';
        $profile['special_conditions'] = $profile['special_conditions'] ?? '';
        
        // Procesar la foto de perfil
        if (isset($profile['profile_photo']) && !empty($profile['profile_photo'])) {
            // Convertir rutas relativas a URL completas
            if (strpos($profile['profile_photo'], 'http') !== 0) {
                if (strpos($profile['profile_photo'], '/') === 0) {
                    $profile['profile_photo'] = 'http://localhost/mommatch/backend' . $profile['profile_photo'];
                } else {
                    $profile['profile_photo'] = 'http://localhost/mommatch/backend/' . $profile['profile_photo'];
                }
            }
        } else {
            // Foto por defecto
            $profile['profile_photo'] = 'http://localhost/mommatch/backend/public/uploads/profiles/default_profile.jpg';
        }

        // Obtener intereses (asegurando que el ID sea válido)
        if (isset($profile['id']) && !empty($profile['id'])) {
            $interestsStmt = $pdo->prepare("
                SELECT i.name 
                FROM user_interests ui
                JOIN interests i ON ui.interest_id = i.id
                WHERE ui.user_id = :user_id
            ");
            $interestsStmt->execute([':user_id' => $profile['id']]);
            $interests = $interestsStmt->fetchAll(PDO::FETCH_COLUMN);
            $profile['interests'] = $interests;
        } else {
            $profile['interests'] = [];
        }

        // Obtener etapas de edad de los hijos (si hay un ID válido)
        if (isset($profile['id']) && !empty($profile['id'])) {
            $stagesStmt = $pdo->prepare("
                SELECT cs.id, cs.stage_name, cs.age_range 
                FROM user_child_stages ucs
                JOIN child_age_stages cs ON ucs.stage_id = cs.id
                WHERE ucs.user_id = :user_id
                ORDER BY cs.id
            ");
            $stagesStmt->execute([':user_id' => $profile['id']]);
            $childStages = $stagesStmt->fetchAll(PDO::FETCH_ASSOC);
            $profile['child_stages'] = $childStages;
            
            // Logging para depuración
            error_log("Etapas para usuario {$profile['id']} ({$profile['name']}): " . 
                      json_encode($childStages));
        } else {
            $profile['child_stages'] = [];
        }
    }
    
    // Filtrar perfiles sin ID válido
    $profiles = array_filter($profiles, function($profile) {
        return isset($profile['id']) && !empty($profile['id']);
    });
    
    // Reindexar el array para JSON consistente
    $profiles = array_values($profiles);
    error_log("Perfiles finales a retornar: " . count($profiles));

    // Devolver los perfiles encontrados como respuesta JSON
    echo json_encode(['success' => true, 'profiles' => $profiles]);
    exit;
} catch (Exception $e) {
    error_log("Error completo en get_matches.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al filtrar perfiles',
        'error' => $e->getMessage(),
    ]);
    exit;
}