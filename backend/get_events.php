<?php
/**
 * API para obtener eventos
 * 
 * Este script proporciona una lista de eventos filtrable por ciudad.
 * Tuve problemas para obtener el recuento de participantes junto con la
 * información del evento en una sola consulta. La solución con GROUP BY
 * funcionó, pero tuve que asegurarme de que la cuenta se realizara correctamente.
 */

require_once __DIR__ . '/cors.php'; 
require_once __DIR__ . '/db.php';

// Configuración de sesión
session_set_cookie_params([
    'lifetime' => 0, 
    'path' => '/', 
    'domain' => 'localhost',
    'secure' => false, 
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start([
    'name' => 'MomMatchSession',
]);

header('Content-Type: application/json; charset=UTF-8');

$pdo = getDatabaseConnection();
$userId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;

// Capturar el parámetro city explícitamente
$city = isset($_GET['city']) ? trim($_GET['city']) : '';

try {
    // Consulta SQL base
    $query = "SELECT e.*, 
             u.name as creator_name, 
             pp.profile_photo as creator_photo, 
             COUNT(ep.id) as participants_count
             FROM events e
             LEFT JOIN users u ON e.user_id = u.id
             LEFT JOIN profile_preferences pp ON u.id = pp.user_id
             LEFT JOIN event_participants ep ON e.id = ep.event_id
             WHERE 1=1";
    
    $params = [];
    
    // Filtrar por ciudad solamente si tiene un valor
    if (!empty($city)) {
        $query .= " AND e.city = ?";
        $params[] = $city;
    }
    
    // Agrupar y ordenar
    $query .= " GROUP BY e.id ORDER BY e.event_date ASC, e.event_time ASC";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Obtener participación del usuario actual
    $registeredEvents = [];
    if ($userId && !empty($events)) {
        $eventIds = array_column($events, 'id');
        $placeholders = str_repeat('?,', count($eventIds) - 1) . '?';
        
        $registrationQuery = "SELECT event_id FROM event_participants 
                              WHERE user_id = ? AND event_id IN ($placeholders)";
        
        $registrationParams = array_merge([$userId], $eventIds);
        $registrationStmt = $pdo->prepare($registrationQuery);
        $registrationStmt->execute($registrationParams);
        
        $registeredEvents = $registrationStmt->fetchAll(PDO::FETCH_COLUMN);
    }
    
    // Procesar los resultados
    foreach ($events as &$event) {
        // Calcular plazas disponibles
        if ($event['max_participants'] === null) {
            $event['remaining_slots'] = null; // Sin límite
        } else {
            $event['remaining_slots'] = $event['max_participants'] - $event['participants_count'];
        }
        
        // Formatear fechas
        $event['formatted_date'] = date('d/m/Y', strtotime($event['event_date']));
        $event['formatted_time'] = date('H:i', strtotime($event['event_time']));
        
        // Verificar si el usuario está registrado
        $event['is_current_user_registered'] = in_array($event['id'], $registeredEvents);
    }
    
    // Devolver respuesta exitosa con los eventos
    echo json_encode([
        'success' => true,
        'events' => $events,
        'filter' => [
            'city' => $city
        ]
    ]);
    
} catch (Exception $e) {
    // Devolver error
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error al obtener los eventos: ' . $e->getMessage()
    ]);
}
