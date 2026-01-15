<?php
/**
 * API para obtener un tema específico del foro con sus respuestas
 * 
 * Este script recupera un tema individual del foro junto con todas sus respuestas
 * Tuve que hacer validaciones estrictas de los parámetros de entrada para
 * evitar inyección SQL, especialmente al convertir el ID de texto a entero
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Método no permitido"]);
    exit;
}

if (!isset($_GET['id']) || empty($_GET['id'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "ID del tema no proporcionado"]);
    exit;
}

$topicId = (int)$_GET['id'];

try {
    $pdo = getDatabaseConnection();

    // Obtener detalles del tema
    $stmt = $pdo->prepare("SELECT id, title, description, created_at FROM forum_topics WHERE id = ?");
    $stmt->execute([$topicId]);
    $topic = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$topic) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Tema no encontrado"]);
        exit;
    }

    // Obtener respuestas del tema
    $repliesStmt = $pdo->prepare("SELECT id, user_id, reply, created_at FROM forum_replies WHERE topic_id = ? ORDER BY created_at ASC");
    $repliesStmt->execute([$topicId]);
    $replies = $repliesStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "topic" => $topic,
        "replies" => $replies
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Error al obtener el tema: " . $e->getMessage()]);
}

