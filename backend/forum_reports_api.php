<?php
/**
 * API para gestionar reportes de temas inapropiados en el foro
 * 
 * Este script permite a los admins ver todos los reportes
 * de contenido inapropiado enviados por los usuarios
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
    error_log("Error en forum_reports_api.php: " . $e->getMessage());
}
