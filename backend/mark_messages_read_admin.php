
<?php

 // Endpoint para que el admin marque mensajes de ayuda como leídos

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

header('Content-Type: application/json; charset=utf-8');

// Solo permitir método PUT
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

// Obtener el ID del mensaje (acepta ?id= o JSON)
parse_str(file_get_contents("php://input"), $put_vars);
$id = $put_vars['id'] ?? $_GET['id'] ?? null;

if (!$id || !is_numeric($id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID no proporcionado o inválido']);
    exit;
}

try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("UPDATE mensajes_ayuda SET estado = 'leido' WHERE id = ?");
    $stmt->execute([$id]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Mensaje marcado como leído']);
    } else {
        // Puede que ya estuviera leído o no exista
        echo json_encode(['success' => false, 'message' => 'No se encontró el mensaje o ya estaba leído']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error en el servidor', 'error' => $e->getMessage()]);
}