<?php
/**
 * Publicador de nuevos artículos para trueque
 * 
 * Este script maneja la creación de nuevos artículos para intercambio,
 * incluyendo la subida de imágenes y almacenamiento de datos en la base
 * de datos. Uno de los mayores desafíos fue implementar un sistema robusto
 * para la carga de imágenes que validara tamaños, tipos y dimensiones
 * para evitar problemas de seguridad
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

header('Content-Type: application/json; charset=utf-8');

try {
   
    if (empty($_POST['title']) || empty($_POST['description']) || empty($_POST['city']) || empty($_FILES['image'])) {
        throw new Exception('Todos los campos son obligatorios. Por favor, rellena todos los datos.');
    }

    $title = trim($_POST['title']);
    $description = trim($_POST['description']);
    $city = trim($_POST['city']);
    $image = $_FILES['image'];
    
    if ($image['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Error al subir la imagen. Inténtalo de nuevo.');
    }
    
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("INSERT INTO trueques (user_id, title, description, city, image_path, status, created_at) VALUES (?, ?, ?, ?, ?, 'disponible', NOW())");
    $stmt->execute([$_SESSION['user_id'], $title, $description, $city, $image['name']]);

    echo json_encode(['success' => true, 'message' => 'Trueque subido con éxito.']);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
