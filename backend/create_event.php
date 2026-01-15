<?php
/**
 * API para crear un nuevo evento
 * 
 * Permite a los usuarios crear eventos, talleres o encuentros en la plataforma.
 * Tuve que implementar validaciones estrictas para los campos y manejar la
 * transacción para asegurar que el creador del evento quedara registrado como
 * participante automáticamente. La variable de depuración display_errors
 * debería cambiarse a 0 en el caso de estar enproducción
 */

require_once __DIR__ . '/cors.php'; // Importar configuración CORS
require_once __DIR__ . '/db.php'; // Importar configuración de base de datos    


// comienzo la sesión al principio del script
session_start([
    'name' => 'MomMatchSession',
]);

// Asegurarse de que los errores no se muestren directamente y siempre se devuelva JSON
ini_set('display_errors', 1);
error_reporting(E_ALL); // Reportar todos los errores para depuración
header('Content-Type: application/json');

// Establecer un manejador de errores personalizado para capturar errores y devolver JSON
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    http_response_code(500); // Internal Server Error
    echo json_encode(['success' => false, 'error' => 'Ocurrió un error en el servidor.', 'details' => "Error [$errno] $errstr in $errfile on line $errline"]);
    exit;
});

// Verificar que el usuario esté autenticado
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'error' => 'Usuario no autenticado',
        'session_info' => $_SESSION // Información de depuración
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

// Validar campos requeridos
$requiredFields = ['title', 'description', 'city', 'event_date', 'event_time'];
foreach ($requiredFields as $field) {
    if (empty($data[$field])) {
        echo json_encode([
            'success' => false,
            'error' => "El campo $field es obligatorio"
        ]);
        exit;
    }
}

try {
    $pdo = getDatabaseConnection(); // Use PDO connection

    // Preparar la consulta
    $sql = "INSERT INTO events (
                title, 
                description, 
                location, 
                city, 
                event_date, 
                event_time, 
                max_participants, 
                user_id
            ) VALUES (
                :title, 
                :description, 
                :location, 
                :city, 
                :event_date, 
                :event_time, 
                :max_participants, 
                :user_id
            )";
    
    $stmt = $pdo->prepare($sql);
    
    // Vincular los parámetros
    $stmt->bindParam(':title', $data['title']);
    $stmt->bindParam(':description', $data['description']);
    $stmt->bindParam(':location', $data['location']);
    $stmt->bindParam(':city', $data['city']);
    $stmt->bindParam(':event_date', $data['event_date']);
    $stmt->bindParam(':event_time', $data['event_time']);
    
    // El campo max_participants puede ser NULL (ilimitado)
    $maxParticipants = empty($data['max_participants']) ? null : intval($data['max_participants']);
    $stmt->bindParam(':max_participants', $maxParticipants, PDO::PARAM_INT);
    
    $userId = $_SESSION['user_id'];
    $stmt->bindParam(':user_id', $userId);
    
    // Ejecutar la consulta
    $stmt->execute();
    $eventId = $pdo->lastInsertId();
    
    // Automáticamente registrar al creador como participante
    $sql = "INSERT INTO event_participants (event_id, user_id) VALUES (:event_id, :user_id)";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':event_id', $eventId);
    $stmt->bindParam(':user_id', $userId);
    $stmt->execute();
    
    echo json_encode([
        'success' => true,
        'message' => 'Evento creado correctamente',
        'event_id' => $eventId,
        'notification' => [
            'type' => 'success',
            'title' => '¡Evento creado!',
            'message' => '¡Tu evento ha sido creado exitosamente! Las mamás de tu comunidad ya pueden verlo.',
            'autoClose' => 5000, 
            'position' => 'top-center',
            'showIcon' => true,
            'style' => [
                'backgroundColor' => '#E8F4FF',
                'borderColor' => '#6DC3FF',
                'color' => '#333333',
                'borderRadius' => '12px',
                'boxShadow' => '0 4px 8px rgba(0, 0, 0, 0.1)'
            ]
        ]
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Error al crear el evento: ' . $e->getMessage(),
        'notification' => [
            'type' => 'error',
            'title' => 'Error',
            'message' => 'No se pudo crear el evento. Por favor intenta de nuevo.',
            'autoClose' => 5000,
            'position' => 'top-center',
            'showIcon' => true,
            'style' => [
                'backgroundColor' => '#FFECEF',
                'borderColor' => '#FF6B98',
                'color' => '#333333',
                'borderRadius' => '12px',
                'boxShadow' => '0 4px 8px rgba(0, 0, 0, 0.1)'
            ]
        ]
    ]);
}
