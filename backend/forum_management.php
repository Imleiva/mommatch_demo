<?php
/**
 * Endpoint de administración del foro
 * 
 * Este script proporciona funciones para que los admin gestionen
 * el foro, como crear, editar y eliminar temas o respuestas. El manejo de
 * métodos HTTP me dio problemas, especialmente con el método PUT, que tuve
 * que procesar manualmente desde el JSON en el cuerpo de la solicitud
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

session_start([
    'name' => 'MomMatchAdminSession',
]);

if (!isset($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Acceso denegado"]);
    exit;
}

$pdo = getDatabaseConnection();

try {
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'OPTIONS') {
        // Manejar solicitud preflight
        http_response_code(200);
        exit;
    }

    if ($method === 'POST') {
        // Crear un nuevo tema
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (!isset($data['title'], $data['description'])) {
            throw new Exception("Datos incompletos");
        }

        $stmt = $pdo->prepare("INSERT INTO forum_topics (title, description, created_at) VALUES (?, ?, NOW())");
        $stmt->execute([$data['title'], $data['description']]);

        echo json_encode(["success" => true, "message" => "Tema creado correctamente"]);
    } elseif ($method === 'DELETE') {
        // Eliminar un tema o un mensaje
        $id = $_GET['id'] ?? null;
        $type = $_GET['type'] ?? null;

        if (!$id || !$type) {
            throw new Exception("Faltan parámetros");
        }

        if ($type === 'topic') {
            $stmt = $pdo->prepare("DELETE FROM forum_topics WHERE id = ?");
            $stmt->execute([$id]);
            $stmt = $pdo->prepare("DELETE FROM forum_replies WHERE topic_id = ?");
            $stmt->execute([$id]);
            echo json_encode(["success" => true, "message" => "Tema eliminado correctamente"]);
        } elseif ($type === 'reply') {
            $stmt = $pdo->prepare("DELETE FROM forum_replies WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(["success" => true, "message" => "Mensaje eliminado correctamente"]);
        } else {
            throw new Exception("Tipo no válido");
        }
    } elseif ($method === 'PUT' || $method === 'PATCH') {
        // Nueva funcionalidad para editar temas
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (!isset($data['id'], $data['title'], $data['description'])) {
            throw new Exception("Datos incompletos para la edición");
        }

        $stmt = $pdo->prepare("UPDATE forum_topics SET title = ?, description = ?, updated_at = NOW() WHERE id = ?");
        $result = $stmt->execute([$data['title'], $data['description'], $data['id']]);

        if ($result && $stmt->rowCount() > 0) {
            echo json_encode(["success" => true, "message" => "Tema actualizado correctamente"]);
        } else {
            throw new Exception("No se encontró el tema o no se realizaron cambios");
        }
    } elseif ($method === 'GET') {
        // Obtener todos los temas del foro
        $stmt = $pdo->prepare("SELECT id, title, description, created_at FROM forum_topics ORDER BY created_at DESC");
        $stmt->execute();
        $topics = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'topics' => $topics
        ]);
    } else {
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Método no permitido"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
