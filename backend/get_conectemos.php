<?php
/**
 * API para obtener perfiles pendientes de conexión
 * 
 * Este script recupera todos los perfiles a los que la usuaria ha
 * mostrado interés (ha dado "Conectemos") pero que aún no han aceptado
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

    // Obtener perfiles a los que la usuaria ha dado "Conectemos" (status = pending)
    $stmt = $pdo->prepare("SELECT u.id, u.name, pp.city, pp.family_type, pp.number_of_children, pp.profile_photo, pp.presentation
                            FROM matches m
                            JOIN users u ON m.user_id_2 = u.id
                            JOIN profile_preferences pp ON u.id = pp.user_id
                            WHERE m.user_id_1 = :user_id AND m.status = 'pending'");
    $stmt->execute([':user_id' => $userId]);

    $connectemos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Obtener intereses para cada perfil
    foreach ($connectemos as &$profile) {
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
            if (!str_starts_with($profile['profile_photo'], 'http')) {
                $profile['profile_photo'] = $profile['profile_photo'];
            }
        } else {
            $profile['profile_photo'] = '/public/uploads/profiles/default_profile.jpg';
        }
    }

    echo json_encode([
        'success' => true,
        'profiles' => $connectemos,
        'timestamp' => date('c')
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('c')
    ]);
    error_log("Error en get_conectemos: " . $e->getMessage());
}