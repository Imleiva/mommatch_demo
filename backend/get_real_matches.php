<?php
/**
 * API para obtener matches confirmados de la usuaria
 * 
 * Este script recupera los perfiles con los que la usuaria ha hecho match
 * completo (los dos partes han mostrado interés). La parte más complicada
 * fue la consulta SQL con múltiples JOIN y el cálculo de mensajes no leídos,
 * especialmente porque tuve que cambiar varias veces el formato de la respuesta
 * para adaptarla a los cambios en el frontend
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

session_start([
    'name' => 'MomMatchSession',
]);

header('Content-Type: application/json; charset=utf-8');

try {
    if (empty($_SESSION['user_id'])) {
        throw new RuntimeException('No autenticado', 401);
    }

    $userId = $_SESSION['user_id'];
    $pdo = getDatabaseConnection();

    // Obtener perfiles con los que la usuaria ha hecho match (status = 'matched') y verificar si hay mensajes nuevos
    $stmt = $pdo->prepare("
        SELECT u.id, u.name, pp.city, pp.family_type, pp.number_of_children, pp.profile_photo, pp.presentation,
               (SELECT COUNT(*) FROM chat_messages cm 
                WHERE cm.sender_id = u.id 
                AND cm.receiver_id = :user_id 
                AND cm.is_read = 0) as unread_count
        FROM matches m
        JOIN users u ON (
            (m.user_id_1 = :user_id AND m.user_id_2 = u.id) OR
            (m.user_id_2 = :user_id AND m.user_id_1 = u.id)
        )
        JOIN profile_preferences pp ON u.id = pp.user_id
        WHERE (m.user_id_1 = :user_id OR m.user_id_2 = :user_id)
        AND m.status = 'matched'
    ");
    
    $stmt->execute([':user_id' => $userId]);
    $real_matches = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Obtener intereses para cada perfil
    foreach ($real_matches as &$profile) {
        // Obtener intereses
        $interestsStmt = $pdo->prepare("
            SELECT i.name 
            FROM user_interests ui
            JOIN interests i ON ui.interest_id = i.id
            WHERE ui.user_id = :user_id
        ");
        $interestsStmt->execute([':user_id' => $profile['id']]);
        $interests = $interestsStmt->fetchAll(PDO::FETCH_COLUMN);
        $profile['interests'] = $interests;
        
        // Manejar la URL de la foto de perfil
        if (!empty($profile['profile_photo'])) {
            // Si ya es una URL completa (comienza con http), dejarla tal cual
            if (str_starts_with($profile['profile_photo'], 'http')) {
                // No hacer nada, ya está bien formateada
            }
            // Si comienza con /public/uploads/profiles/
            else if (str_starts_with($profile['profile_photo'], '/public/uploads/profiles/')) {
                $profile['profile_photo'] = 'http://localhost/mommatch/backend' . $profile['profile_photo'];
            }
            // Si comienza con /mommatch/backend
            else if (str_starts_with($profile['profile_photo'], '/mommatch/backend/')) {
                $profile['profile_photo'] = 'http://localhost' . $profile['profile_photo'];
            }
            // Cualquier otro caso
            else {
                $profile['profile_photo'] = 'http://localhost/mommatch/backend/public/uploads/profiles/' . ltrim($profile['profile_photo'], '/');
            }
        } else {
            $profile['profile_photo'] = 'http://localhost/mommatch/backend/public/uploads/profiles/default_profile.jpg';
        }

        // Añadir la información de mensajes nuevos
        $profile['hasNewMessages'] = ($profile['unread_count'] > 0);
        $profile['unreadCount'] = (int)$profile['unread_count'];
    }

    // Después de obtener los perfiles de la base de datos
    foreach ($real_matches as &$profile) {
        // Añadir esta sección para obtener las etapas de edad de los hijos
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
            
            // Añadir los resultados al array del perfil
            $profile['child_stages'] = $childStages;
            
            // Logging opcional para depuración
            error_log("Usuario {$profile['id']} ({$profile['name']}) - Etapas de hijos encontradas: " . count($childStages));
        } else {
            // Si no hay ID válido, asignar un array vacío
            $profile['child_stages'] = [];
        }
    }

    echo json_encode([
        'success' => true,
        'profiles' => $real_matches,
        'timestamp' => date('c')
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('c')
    ]);
    error_log("Error en get_real_matches: " . $e->getMessage());
}