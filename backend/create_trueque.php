<?php
/**
 * Endpoint para crear anuncios de trueque
 * 
 * Este script permite a las usuarias crear anuncios para intercambiar
 * artículos infantiles y de maternidad
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

header('Content-Type: application/json; charset=utf-8');

session_start([
    'name' => 'MomMatchSession',
]);

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No autenticado']);
    exit;
}

$user_id = $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

$title = $_POST['title'] ?? '';
$description = $_POST['description'] ?? '';
$city = $_POST['city'] ?? '';
$image = $_FILES['image'] ?? null;

if (empty($title) || empty($city)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Título y ciudad son obligatorios']);
    exit;
}

try {
    $pdo = getDatabaseConnection();

    $imagePath = null;
    if ($image && $image['error'] === UPLOAD_ERR_OK) {
        $uploadDir = __DIR__ . '/public/uploads/trueques/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true); // Crear la carpeta si no existe
        }
        $imageName = uniqid('trueque_') . '.' . pathinfo($image['name'], PATHINFO_EXTENSION);
        $imagePath = 'trueques/' . $imageName; // Guardar ruta relativa en la base de datos
        move_uploaded_file($image['tmp_name'], $uploadDir . $imageName);
    }

    $stmt = $pdo->prepare("INSERT INTO trueques (user_id, title, description, city, image_path) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$user_id, $title, $description, $city, $imagePath]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}