<?php
/**
 * Sistema de recuperación de perfiles rechazados
 * 
 * Este script permite recuperar perfiles que la usuaria había descartado
 * previamente, reintegrándolos a posibles matches. Uno de los
 * desafíos principales fue manejar la transacción de base de datos de forma
 * segura para evitar inconsistencias de datos cuando se elimina y recupera
 * información
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

// Responder a solicitudes OPTIONS para CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configurar encabezados para respuesta JSON
header('Content-Type: application/json');

// Iniciar sesión y verificar autenticación
session_start(['name' => 'MomMatchSession']);
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Usuario no autenticado']);
    exit;
}

$user_id = $_SESSION['user_id'];

// Obtener y validar datos de entrada
$data = json_decode(file_get_contents('php://input'), true);
if (!isset($data['profile_id'])) {
    echo json_encode(['success' => false, 'error' => 'ID de perfil no proporcionado']);
    exit;
}
$profile_id = (int)$data['profile_id'];

try {
    $pdo = getDatabaseConnection();
    
    // Usar una transacción para asegurar la integridad de los datos
    $pdo->beginTransaction();
    
    // Eliminar de la tabla matches
    $stmt = $pdo->prepare("DELETE FROM matches WHERE user_id_1 = ? AND user_id_2 = ? AND status = 'rejected'");
    $stmt->execute([$user_id, $profile_id]);
    
    // No necesito verificar si existía antes, solo importa el resultado final
    // Si se eliminó alguna fila, consideramos exitosa la operación
    $deleted = $stmt->rowCount() > 0;
    
    // Obtener información básica del perfil
    $profileStmt = $pdo->prepare("SELECT id, name FROM users WHERE id = ?");
    $profileStmt->execute([$profile_id]);
    $profile = $profileStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$profile) {
        // Si el perfil no existe, revertir la transacción
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => 'Perfil no encontrado']);
        exit;
    }
    
    // Asegurarse de que el perfil tenga un ID válido
    if (!isset($profile['id']) || !$profile['id']) {
        $profile['id'] = $profile_id; // Usar el ID proporcionado si no existe en los resultados
    }
    
    // Asegurarse de que el perfil tenga un nombre
    if (!isset($profile['name']) || !$profile['name']) {
        $profile['name'] = 'Nombre no disponible';
    }
    
    // Intentar obtener información adicional del perfil (si existe la tabla)
    $columnsQuery = $pdo->query("SHOW TABLES LIKE 'profile_preferences'");
    if ($columnsQuery->rowCount() > 0) {
        $additionalDataStmt = $pdo->prepare("SELECT profile_photo, presentation, city 
                                           FROM profile_preferences 
                                           WHERE user_id = ?");
        $additionalDataStmt->execute([$profile_id]);
        $additionalData = $additionalDataStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($additionalData) {
            $profile = array_merge($profile, $additionalData);
        }
    }
    
    // Asegurarse de que todos los campos esenciales estén presentes
    $profile['profile_photo'] = $profile['profile_photo'] ?? null;
    $profile['presentation'] = $profile['presentation'] ?? '';
    $profile['city'] = $profile['city'] ?? '';
    
    // Confirmar la transacción
    $pdo->commit();
    
    // Responder con éxito
    echo json_encode([
        'success' => true,
        'message' => $deleted ? 'Perfil reintegrado exitosamente' : 'El perfil ya no estaba rechazado',
        'profile' => $profile
    ]);
    
} catch (Exception $e) {
    // En caso de error, revertir la transacción
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    error_log("Error en reinsert_profile.php: " . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'error' => 'Error al reintegrar el perfil'
    ]);
}
