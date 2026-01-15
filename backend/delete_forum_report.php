<?php
/**
 * Endpoint para eliminar reportes del foro
 * 
 * Este script permite a los admins eliminar reportes sobre
 * contenido inapropiado en el foro
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

header('Content-Type: application/json; charset=UTF-8');

session_start([
    'name' => 'MomMatchAdminSession',
]);

// Verificar si el usuario es administrador
if (!isset($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Acceso denegado"]);
    exit;
}

// Verificar si es una solicitud DELETE
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Método no permitido"]);
    exit;
}

// Obtener el ID del reporte a eliminar
$reportId = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($reportId <= 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "ID de reporte inválido"]);
    exit;
}

try {
    $pdo = getDatabaseConnection();
    
    // Verificar que el reporte existe
    $checkStmt = $pdo->prepare("SELECT id FROM forum_reports WHERE id = ?");
    $checkStmt->execute([$reportId]);
    
    if (!$checkStmt->fetch()) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Reporte no encontrado"]);
        exit;
    }
    
    // Eliminar el reporte
    $deleteStmt = $pdo->prepare("DELETE FROM forum_reports WHERE id = ?");
    $result = $deleteStmt->execute([$reportId]);
    
    if ($result) {
        echo json_encode(["success" => true]);
    } else {
        throw new Exception("Error al eliminar el reporte");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
    error_log("Error en delete_forum_report.php: " . $e->getMessage());
}
