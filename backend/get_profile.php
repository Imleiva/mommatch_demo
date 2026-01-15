<?php
/**
 * API para obtener el perfil completo de una usuaria
 * 
 * Este script devuelve toda la información del perfil de una usuaria,
 * incluyendo sus preferencias, intereses y etapas de edad de sus hijos.
 * El manejo de buffer de salida me dio muchos problemas, ya que
 * cualquier carácter adicional rompía el JSON. También tuve que implementar
 * la creación automática de perfiles para usuarias nuevas
 */

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

session_set_cookie_params([
    'lifetime' => 0, // La sesión expira al cerrar el navegador
    'path' => '/',
    'domain' => 'localhost',
    'secure' => false, 
    'httponly' => true,
    'samesite' => 'Lax',
]);

session_start([
    'name' => 'MomMatchSession',
]);

// Asegurar que no haya salida previa al JSON
ob_start();

try {
    $pdo = getDatabaseConnection();
    
    $userId = $_GET['user_id'] ?? json_decode(file_get_contents('php://input'), true)['user_id'] ?? null;
    
    if (!$userId) {
        throw new InvalidArgumentException('ID de usuario no proporcionado', 400);
    }

    // Consulta actualizada - Manteng solo child_stages con toda la información necesaria
    $stmt = $pdo->prepare("
        SELECT 
            pp.*, 
            mp.connection_type,
            GROUP_CONCAT(DISTINCT i.name) AS interest_names
        FROM profile_preferences pp
        LEFT JOIN match_preferences mp ON pp.user_id = mp.user_id
        LEFT JOIN user_interests ui ON pp.user_id = ui.user_id
        LEFT JOIN interests i ON ui.interest_id = i.id
        WHERE pp.user_id = :user_id
        GROUP BY pp.user_id
    ");
    $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
    $stmt->execute();
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);

    // Si no existe un perfil para este usuario, creamos uno predeterminado
    if (!$profile) {
        // Verificar que el usuario exista en la tabla users
        $userStmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
        $userStmt->execute([$userId]);
        $userExists = $userStmt->fetch();
        
        if (!$userExists) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Usuario no encontrado',
                'timestamp' => date('c')
            ]);
            exit;
        }
        
        // Crear una entrada predeterminada en profile_preferences
        $defaultProfileStmt = $pdo->prepare("
            INSERT INTO profile_preferences 
            (user_id, city, country, special_conditions, number_of_children) 
            VALUES (?, NULL, NULL, NULL, 0)
        ");
        $defaultProfileStmt->execute([$userId]);
        
        error_log("Perfil predeterminado creado para el usuario ID: $userId");
        
        // Obtener el perfil recién creado
        $stmt->execute();
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if ($profile) {
        // Procesar intereses
        $profile['interests'] = isset($profile['interest_names']) 
            ? array_map('trim', explode(',', $profile['interest_names'])) 
            : [];

        // Procesar condiciones especiales
        $profile['special_conditions'] = isset($profile['special_conditions']) 
            ? (is_string($profile['special_conditions']) && $profile['special_conditions'][0] === '[' 
                ? json_decode($profile['special_conditions'], true)
                : array_map('trim', explode(',', $profile['special_conditions']))) 
            : [];

        // Asegurar que number_of_children sea un entero
        $profile['number_of_children'] = isset($profile['number_of_children']) 
            ? (int)$profile['number_of_children'] 
            : 0;

        // Corregir el manejo de las URLs de las fotos de perfil para evitar duplicación de rutas
        if (empty($profile['profile_photo'])) {
            // Si no hay foto, usar la predeterminada
            $profile['profile_photo'] = '/mommatch/backend/public/uploads/profiles/default_profile.jpg';
        } else if (strpos($profile['profile_photo'], 'http') === 0) {
            // Si ya es una URL completa (comienza con http), dejarla tal cual
            // No hacer nada aquí
        } else if (strpos($profile['profile_photo'], '/') === 0) {
            // Si ya comienza con /, asegurar que tenga el prefijo correcto
            if (strpos($profile['profile_photo'], '/mommatch/backend') !== 0) {
                $profile['profile_photo'] = '/mommatch/backend' . $profile['profile_photo'];
            }
        } else {
            // En cualquier otro caso, asegurar que tiene la ruta completa
            $profile['profile_photo'] = '/mommatch/backend/public/uploads/profiles/' . $profile['profile_photo'];
        }

        // Lógica de etapas de edad - solo se obtienen los datos completos una vez
        $childStagesQuery = $pdo->prepare("
            SELECT cs.id, cs.stage_name, cs.age_range 
            FROM user_child_stages ucs
            JOIN child_age_stages cs ON ucs.stage_id = cs.id
            WHERE ucs.user_id = :user_id
            ORDER BY cs.id
        ");
        $childStagesQuery->execute([':user_id' => $userId]);
        $childStages = $childStagesQuery->fetchAll(PDO::FETCH_ASSOC);
        
        // Extraer solo los IDs para facilitar la comparación
        $childStageIds = array_map(function($stage) {
            return (int)$stage['id'];
        }, $childStages);
    }

    // Validar que no haya salida previa
    if (ob_get_length()) {
        ob_end_clean();
    }

    // El perfil ahora siempre debería existir ya que lo creamos si no existe
    error_log("Foto de perfil para el usuario {$userId}: " . $profile['profile_photo']);
    error_log("Ruta generada para la foto de perfil: " . $profile['profile_photo']);
    error_log("Intereses seleccionados (IDs): " . json_encode($profile['interests']));
    
    // Antes de enviar la respuesta JSON, limpiar cualquier salida previa
    ob_end_clean();
    echo json_encode([
        'success' => true,
        'profile' => $profile,
        'interests' => $profile['interests'],
        'child_stages' => $childStages ?? [],
        'child_stage_ids' => $childStageIds ?? [], // Añadir array de solo IDs
        'timestamp' => date('c')
    ]);
    
} catch (InvalidArgumentException $e) {
    ob_end_clean();
    http_response_code($e->getCode());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('c')
    ]);
} catch (RuntimeException $e) {
    ob_end_clean();
    http_response_code($e->getCode());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('c')
    ]);
} catch (Exception $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error interno del servidor',
        'timestamp' => date('c')
    ]);
    error_log("Error en get_profile: " . $e->getMessage());
}