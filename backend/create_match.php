<?php
/**
 * Endpoint para crear match entre usuarios
 * 
 * Este script maneja la lógica principal de la app: permitir a ls usuarias
 * mostrar interés en otros perfiles o rechazarlos. La implementación de la
 * transacción para la conexión bidireccional fue compleja, ya que tuve que garantizar
 * que al coincidir dos usuarios se creara una conversación automáticamente
 * sin generar duplicados o inconsistencias en la base de datos
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

// Iniciar sesión y verificar autenticación
session_start(['name' => 'MomMatchSession']);
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false, 
        'error' => 'No autenticado',
        'notification' => [
            'type' => 'error',
            'title' => 'Error',
            'message' => 'Debes iniciar sesión para esta acción.',
            'autoClose' => 5000,
            'position' => 'top-center',
            'showIcon' => true
        ]
    ]);
    exit;
}

// Configuración de encabezados para respuesta JSON
header('Content-Type: application/json; charset=utf-8');

$user_id = $_SESSION['user_id'];
$data = json_decode(file_get_contents('php://input'), true);

// Validar datos de entrada
if (!isset($data['profile_id']) || empty($data['profile_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID de perfil no proporcionado']);
    exit;
}

$profile_id = intval($data['profile_id']);
$action = isset($data['action']) ? $data['action'] : 'like';

try {
    $pdo = getDatabaseConnection();

    // Verificar que el perfil destino existe
    $checkStmt = $pdo->prepare("SELECT id, name FROM users WHERE id = ?");
    $checkStmt->execute([$profile_id]);
    $targetProfile = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$targetProfile) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'El perfil no existe']);
        exit;
    }

    // Determinar el estado de la conexión
    $status = ($action === 'like') ? 'pending' : 'rejected';

    // Comprobar si ya existe una conexión en la dirección opuesta
    $matchCheckStmt = $pdo->prepare("
        SELECT * FROM matches 
        WHERE user_id_1 = ? AND user_id_2 = ?
    ");
    $matchCheckStmt->execute([$profile_id, $user_id]);
    $existingMatch = $matchCheckStmt->fetch(PDO::FETCH_ASSOC);

    // Iniciar transacción
    $pdo->beginTransaction();

    // Insertar o actualizar el match
    $stmt = $pdo->prepare("
        INSERT INTO matches (user_id_1, user_id_2, status, created_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE status = ?, updated_at = NOW()
    ");
    $stmt->execute([$user_id, $profile_id, $status, $status]);

    // Si ambos usuarios se dieron like, crear conversación
    $isMatched = false;
    if ($status === 'pending' && $existingMatch && $existingMatch['status'] === 'pending') {
        // Es un match completo, actualizar ambos estados
        $updateStmt = $pdo->prepare("
            UPDATE matches SET status = 'matched', updated_at = NOW()
            WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)
        ");
        $updateStmt->execute([$user_id, $profile_id, $profile_id, $user_id]);
        
        // Crear conversación
        $convStmt = $pdo->prepare("
            INSERT INTO chat_conversations (user1_id, user2_id, created_at)
            VALUES (?, ?, NOW())
        ");
        $convStmt->execute([$user_id, $profile_id]);
        
        $isMatched = true;
    }

    $pdo->commit();

    // Determinar el tipo de mensaje según la acción y resultado
    $notificationTitle = $isMatched ? '¡Nueva conexión!' : ($action === 'like' ? 'Interés enviado' : 'Perfil rechazado');
    $notificationMessage = $isMatched ? 
        '¡Has conectado con este perfil! Ya pueden comenzar a chatear.' : 
        ($action === 'like' ? 
            'Has mostrado interés en este perfil. Te notificaremos si hay coincidencia.' : 
            'Has rechazado este perfil. No lo volverás a ver en tu búsqueda.'
        );

    echo json_encode([
        'success' => true,
        'action' => $action,
        'isMatched' => $isMatched,
        'message' => $isMatched ? '¡Nuevo match creado!' : 'Acción procesada correctamente',
        'notification' => [
            'type' => $isMatched ? 'success' : ($action === 'like' ? 'info' : 'warning'),
            'title' => $notificationTitle,
            'message' => $notificationMessage,
            'autoClose' => 5000,
            'position' => 'top-center',
            'showIcon' => true
        ]
    ]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    error_log("Error en create_match.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error al procesar la acción']);
}
