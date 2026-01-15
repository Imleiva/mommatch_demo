<?php
/**
 * API para el sistema de ayuda y soporte
 * 
 * Este script maneja tanto la recepción de mensajes de ayuda como
 * la visualización de los mismos para los admin
 * La parte más complicada fue el envío de correos. Al final tuve que usar 
 * un registro de emails fallidos para depurar problemas
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

// Configuración de errores
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log');

try {
    // Obtener conexión a la base de datos
    $pdo = getDatabaseConnection();

    // Verificar método GET para obtener mensajes de ayuda
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        try {
            $stmt = $pdo->prepare("SELECT id, nombre, email, mensaje, fecha_creacion, estado FROM mensajes_ayuda ORDER BY fecha_creacion DESC");
            $stmt->execute();
            $mensajes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'mensajes' => $mensajes
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al obtener los mensajes de ayuda: ' . $e->getMessage()
            ]);
        }
        exit;
    }

    // Verificar método POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new RuntimeException("Método no permitido", 405);
    }

    // Obtener datos JSON
    $json = file_get_contents('php://input');
    if ($json === false) {
        throw new RuntimeException("Error al leer los datos de entrada", 400);
    }

    $data = json_decode($json, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new RuntimeException("JSON inválido: " . json_last_error_msg(), 400);
    }

    // Validar campos requeridos
    $required = ['nombre', 'email', 'mensaje'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            throw new RuntimeException("El campo $field es requerido", 400);
        }
    }

    // Validar email
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException("Email no válido", 400);
    }

    // Insertar en la base de datos
    $stmt = $pdo->prepare("INSERT INTO mensajes_ayuda (nombre, email, mensaje, fecha_creacion, estado) VALUES (?, ?, ?, NOW(), 'pendiente')");
    if (!$stmt->execute([$data['nombre'], $data['email'], $data['mensaje']])) {
        throw new RuntimeException("Error al guardar en la base de datos", 500);
    }

    // Enviar email de notificación
    $to = "soporte@mommatch.com";
    $subject = "Nuevo mensaje de ayuda: " . htmlspecialchars($data['nombre']);
    $message = "Nombre: " . htmlspecialchars($data['nombre']) . "\n";
    $message .= "Email: " . htmlspecialchars($data['email']) . "\n\n";
    $message .= "Mensaje:\n" . htmlspecialchars($data['mensaje']);
    $headers = "From: no-reply@mommatch.com\r\n";

    if (!mail($to, $subject, $message, $headers)) {
        error_log("Error al enviar email de notificación");
    }

    // Respuesta exitosa
    echo json_encode([
        'success' => true,
        'message' => 'Mensaje recibido correctamente',
        'timestamp' => date('c')
    ]);

} catch (RuntimeException $e) {
    http_response_code($e->getCode() ?: 500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => $e->getCode(),
        'timestamp' => date('c')
    ]);
    error_log("Error en ayuda_api: " . $e->getMessage());
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error interno del servidor',
        'timestamp' => date('c')
    ]);
    error_log("Error inesperado en ayuda_api: " . $e->getMessage());
}