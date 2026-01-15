<?php
/**
 * Gestor de estados para artículos de trueque
 * 
 * Este script maneja la actualización de estados de los artículos publicados
 * para intercambio (disponible, reservado, entregado). Implementa verificaciones
 * de seguridad para asegurar que solo la propietaria del artículo pueda 
 * modificar su estado
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/verify_session.php';

// Verificar sesión y obtener ID de usuario
$user_id = verify_session();
if (!$user_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No autenticado']);
    exit;
}

// Verificar método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

// Obtener datos del cuerpo de la petición
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || empty($data['trueque_id']) || empty($data['status'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Datos incompletos o inválidos']);
    exit;
}

$trueque_id = $data['trueque_id'];
$status = $data['status'];

// Validar que el estado sea válido
if (!in_array($status, ['disponible', 'reservado', 'entregado'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Estado no válido']);
    exit;
}

try {
    $pdo = getDatabaseConnection();
    
    // Verificar que el usuario sea el propietario del trueque
    $stmt = $pdo->prepare("SELECT user_id FROM trueques WHERE id = ?");
    $stmt->execute([$trueque_id]);
    $trueque = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$trueque) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Trueque no encontrado']);
        exit;
    }
    
    if ($trueque['user_id'] != $user_id) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'No tienes permiso para modificar este trueque']);
        exit;
    }
    
    // Actualizar el estado del trueque
    $updateStmt = $pdo->prepare("UPDATE trueques SET status = ? WHERE id = ?");
    $updateStmt->execute([$status, $trueque_id]);
    
    echo json_encode(['success' => true]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error del servidor: ' . $e->getMessage()]);
    error_log("Error en update_trueque_status.php: " . $e->getMessage());
}