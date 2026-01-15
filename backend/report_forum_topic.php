<?php
/**
 * Archivo para gestionar los reportes de temas en el foro
 * 
 * Este archivo permite a los usuarios reportar temas inapropiados en el foro
 * y a los admin revisar estos reportes. Los usuarios normales pueden
 * crear reportes, mientras que solo los admin pueden ver la lista
 * completa de reportes existentes.
 * 
 * Funcionalidades:
 * - GET: Permite a los admin ver todos los reportes (solo admin)
 * - POST: Permite a cualquier usuario autenticado reportar un tema
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

header('Content-Type: application/json; charset=UTF-8');


// Primero verificamos si hay una sesión de usuaria regular
session_name('MomMatchSession');
session_start();

$isUserAuthenticated = isset($_SESSION['user_id']);
$userId = $isUserAuthenticated ? $_SESSION['user_id'] : null;
$isAdmin = false;

// Si no hay sesión de usuaria, verificamos si hay sesión de admin
if (!$isUserAuthenticated) {
    session_write_close();
    session_name('MomMatchAdminSession');
    session_start();
    
    $isAdmin = isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true;
    $userId = $isAdmin && isset($_SESSION['admin_id']) ? $_SESSION['admin_id'] : null;
}

// Para GET (obtener reportes) solo permitimos admin
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!$isAdmin) {
        http_response_code(403);
        echo json_encode(["success" => false, "error" => "Acceso denegado"]);
        exit;
    }
    
    try {
        $pdo = getDatabaseConnection();
        $stmt = $pdo->prepare("SELECT fr.id, fr.topic_id, fr.user_id, fr.reason, fr.created_at, 
                                      ft.title AS topic_title, u.name AS user_name 
                               FROM forum_reports fr
                               JOIN forum_topics ft ON fr.topic_id = ft.id
                               JOIN users u ON fr.user_id = u.id
                               ORDER BY fr.created_at DESC");
        $stmt->execute();
        $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'reports' => $reports
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al obtener los reportes del foro: ' . $e->getMessage()
        ]);
        error_log("Error en report_forum_topic.php: " . $e->getMessage());
    }
    exit;
}

// Para POST (crear reportes) permitimos cualquier usuario autenticado
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Verificar que el usuario esté autenticado
    if (!$isUserAuthenticated && !$isAdmin) {
        http_response_code(401);
        echo json_encode(["success" => false, "error" => "Debe iniciar sesión para reportar contenido"]);
        exit;
    }
    
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (!$data || !isset($data['topicId']) || !isset($data['reason'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Datos incompletos"]);
        exit;
    }

    $topicId = $data['topicId'];
    $reason = $data['reason'];

    try {
        $pdo = getDatabaseConnection();
        $stmt = $pdo->prepare("INSERT INTO forum_reports (topic_id, user_id, reason, created_at) VALUES (?, ?, ?, NOW())");
        $stmt->execute([$topicId, $userId, $reason]);

        echo json_encode(['success' => true, 'message' => 'Reporte enviado correctamente']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        error_log("Error en report_forum_topic.php: " . $e->getMessage());
    }
    exit;
}

http_response_code(405);
echo json_encode(["success" => false, "error" => "Método no permitido"]);