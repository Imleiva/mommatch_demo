<?php
/**
 * Endpoint para estadísticas del panel de administración
 * 
 * Genera todas las estadísticas para el dashboard de admin
 * La parte más desafiante fue optimizar las consultas para que la página
 * cargara rápido incluso con muchos datos. Al final tuve que separar algunas
 * estadísticas en endpoints diferentes para mejorar el rendimiento
 */

ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';
header('Content-Type: application/json; charset=UTF-8');

global $conn;

session_start( 
    [
        'name' => 'MomMatchAdminSession',
    ]
);

$pdo = getDatabaseConnection();

// Si es una solicitud OPTIONS, simplemente responde con 200 OK
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Verificar que la solicitud sea GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode(["success" => false, "error" => "Método no permitido"]);
    exit;
}

// Verificar si el usuario es administrador
if (!isset($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
    echo json_encode(["success" => false, "error" => "Acceso denegado"]);
    exit;
}

try {
    // Obtener número total de usuarios
    $usersQuery = "SELECT COUNT(*) as total FROM users";
    $usersStmt = $pdo->prepare($usersQuery);
    $usersStmt->execute();
    $totalUsers = $usersStmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Obtener número total de matches
    $matchesQuery = "SELECT COUNT(*) as total FROM matches WHERE status = 'matched'";
    $matchesStmt = $pdo->prepare($matchesQuery);
    $matchesStmt->execute();
    $totalMatches = $matchesStmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Obtener número total de mensajes
    $messagesQuery = "SELECT COUNT(*) as total FROM chat_messages";
    $messagesStmt = $pdo->prepare($messagesQuery);
    $messagesStmt->execute();
    $totalMessages = $messagesStmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Obtener número total de eventos
    $eventsQuery = "SELECT COUNT(*) as total FROM events";
    $eventsStmt = $pdo->prepare($eventsQuery);
    $eventsStmt->execute();
    $totalEvents = $eventsStmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Obtener usuarias registradas en los últimos 7 días
    $recentUsersQuery = "SELECT COUNT(*) as total FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
    $recentUsersStmt = $pdo->prepare($recentUsersQuery);
    $recentUsersStmt->execute();
    $recentUsers = $recentUsersStmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Obtener estadísticas de tipos de familia
    $familyTypesQuery = "SELECT family_type, COUNT(*) as count FROM profile_preferences GROUP BY family_type";
    $familyTypesStmt = $pdo->prepare($familyTypesQuery);
    $familyTypesStmt->execute();
    $familyTypes = $familyTypesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    $ageStatisticsQuery = "SELECT mother_age, COUNT(*) as count FROM profile_preferences GROUP BY mother_age";
    $ageStatisticsStmt = $pdo->prepare($ageStatisticsQuery);
    $ageStatisticsStmt->execute();
    $ageStatistics = $ageStatisticsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Obtener número de eventos próximos
    $upcomingEventsQuery = "SELECT COUNT(*) as total FROM events WHERE event_date >= CURDATE()";
    $upcomingEventsStmt = $pdo->prepare($upcomingEventsQuery);
    $upcomingEventsStmt->execute();
    $upcomingEvents = $upcomingEventsStmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Obtener número de mensajes de ayuda no leídos
    $unreadHelpMessagesQuery = "SELECT COUNT(*) as total FROM mensajes_ayuda WHERE estado = 'pendiente'";
    $unreadHelpMessagesStmt = $pdo->prepare($unreadHelpMessagesQuery);
    $unreadHelpMessagesStmt->execute();
    $unreadHelpMessages = $unreadHelpMessagesStmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Obtener número de reportes de foro pendientes
    $pendingReportsQuery = "SELECT COUNT(*) as total FROM forum_reports";
    $pendingReportsStmt = $pdo->prepare($pendingReportsQuery);
    $pendingReportsStmt->execute();
    $pendingReports = $pendingReportsStmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Devolver todos los datos estadísticos
    echo json_encode([
        "success" => true,
        "statistics" => [
            "totalUsers" => $totalUsers,
            "totalMatches" => $totalMatches,
            "totalMessages" => $totalMessages,
            "totalEvents" => $totalEvents,
            "recentUsers" => $recentUsers,
            "familyTypes" => $familyTypes,
            "ageStatistics" => $ageStatistics, 
            "upcomingEvents" => $upcomingEvents,
            "unreadHelpMessages" => $unreadHelpMessages,
            "pendingReports" => $pendingReports,
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => "Error al obtener estadísticas: " . $e->getMessage()]);
}

