<?php
/**
 * Sistema de registro para eventos comunitarios
 * 
 * Este script permite a las usuarias registrarse o cancelar su participación 
 * en eventos comunitarios. Incluye validaciones para verificar disponibilidad 
 * de plazas y evitar duplicados
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

session_set_cookie_params([
    'lifetime' => 0, // La sesión expira al cerrar el navegador
    'path' => '/',
    'domain' => 'localhost',
    'secure' => false, 
    'httponly' => true,
    'samesite' => 'Lax',
]);

session_start([
    'name' => 'MomMatchSession',
]);

ini_set('display_errors', 0);
error_reporting(0);
header('Content-Type: application/json');

set_error_handler(function($errno, $errstr, $errfile, $errline) {
    http_response_code(500); 
    echo json_encode(['success' => false, 'error' => 'Server error occurred during event registration.', 'details' => "Error [$errno] $errstr in $errfile on line $errline"]);
    exit;
});

// Verificar la sesión del usuario
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'error' => 'No has iniciado sesión'
    ]);
    exit;
}

// Verificar que se haya enviado una solicitud POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'error' => 'Método no permitido'
    ]);
    exit;
}

// Obtener los datos del formulario
$data = json_decode(file_get_contents('php://input'), true);

// Validar que se proporcionó un ID de evento
if (empty($data['event_id'])) {
    echo json_encode([
        'success' => false,
        'error' => 'El ID del evento es obligatorio'
    ]);
    exit;
}

$eventId = intval($data['event_id']);
$userId = $_SESSION['user_id'];
$action = isset($data['action']) ? $data['action'] : 'register'; // 'register' o 'unregister'

try {
    $pdo = getDatabaseConnection(); // Use PDO connection

    // Verificar si el evento existe
    $stmt = $pdo->prepare("SELECT * FROM events WHERE id = ?");
    $stmt->execute([$eventId]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$event) {
        echo json_encode([
            'success' => false,
            'error' => 'El evento no existe'
        ]);
        exit;
    }
    
    // Verificar si el usuario ya está registrado
    $stmt = $pdo->prepare("SELECT * FROM event_participants WHERE event_id = ? AND user_id = ?");
    $stmt->execute([$eventId, $userId]);
    $registration = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($action === 'register') {
        // Registrarse al evento
        if ($registration) {
            echo json_encode([
                'success' => false,
                'error' => 'Ya estás registrada en este evento'
            ]);
            exit;
        }
        
        // Verificar si hay plazas disponibles
        if ($event['max_participants'] !== null) {
            $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM event_participants WHERE event_id = ?");
            $stmt->execute([$eventId]);
            $participantsCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            if ($participantsCount >= $event['max_participants']) {
                echo json_encode([
                    'success' => false,
                    'error' => 'No hay plazas disponibles para este evento'
                ]);
                exit;
            }
        }
        
        // Registrar al usuario
        $stmt = $pdo->prepare("INSERT INTO event_participants (event_id, user_id) VALUES (?, ?)");
        $stmt->execute([$eventId, $userId]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Te has registrado correctamente en el evento'
        ]);
    } else {
        // Cancelar registro
        if (!$registration) {
            echo json_encode([
                'success' => false,
                'error' => 'No estás registrada en este evento'
            ]);
            exit;
        }
        
        // No permitir al creador abandonar el evento
        if ($event['user_id'] == $userId) {
            echo json_encode([
                'success' => false,
                'error' => 'No puedes abandonar un evento que has creado'
            ]);
            exit;
        }
        
        // Eliminar al usuario de los participantes
        $stmt = $pdo->prepare("DELETE FROM event_participants WHERE event_id = ? AND user_id = ?");
        $stmt->execute([$eventId, $userId]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Has cancelado tu registro en el evento'
        ]);
    }
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Error al procesar la solicitud: ' . $e->getMessage()
    ]);
}
?>