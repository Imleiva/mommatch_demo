<?php
/**
 * Endpoint para eliminar mensajes de soporte
 * 
 * Este script permite a los administradores eliminar mensajes del sistema
 * de soporte una vez resueltos
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';


// Si es una solicitud OPTIONS, simplemente responde con 200 OK
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

session_start([
    'name' => 'MomMatchAdminSession',
]);

// Verificar si el usuario es administrador
if (!isset($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Acceso denegado"]);
    exit;
}

// Verificar que la solicitud sea DELETE
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Método no permitido"]);
    exit;
}

// Obtener el ID del mensaje de ayuda
if (!isset($_GET['id']) || empty($_GET['id'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "ID de mensaje no proporcionado"]);
    exit;
}

$messageId = (int)$_GET['id'];

try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("DELETE FROM mensajes_ayuda WHERE id = ?");
    $stmt->execute([$messageId]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(["success" => true, "message" => "Mensaje eliminado correctamente"]);
    } else {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Mensaje no encontrado"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Error al eliminar el mensaje: " . $e->getMessage()]);
}
