<?php
/**
 * Sistema de respuesta a mensajes de ayuda
 * 
 * Este script maneja las respuestas a mensajes de ayuda enviados por las usuarias
 * Implementa un sistema flexible que funciona bien en entorno de desarrollo
 * (simulando el envío de correos)
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Método no permitido"]);
    exit;
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "JSON inválido"]);
    exit;
}

if (empty($data['messageId']) || empty($data['email']) || empty($data['reply'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Datos incompletos"]);
    exit;
}

$messageId = $data['messageId'];
$email = $data['email'];
$reply = $data['reply'];

// Validar el correo electrónico
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Correo electrónico no válido"]);
    exit;
}

// Simular el envío de correos en un entorno de desarrollo
$isDevelopment = true; // Se tendría que cambiar a false en producción

if ($isDevelopment) {
    // Registrar el intento de envío en un archivo de registro
    $logMessage = "Simulación de envío de correo:\n";
    $logMessage .= "Para: $email\n";
    $logMessage .= "Asunto: Respuesta a tu mensaje de ayuda\n";
    $logMessage .= "Mensaje: $reply\n";
    file_put_contents(__DIR__ . '/email_log.txt', $logMessage, FILE_APPEND);

    echo json_encode(["success" => true, "message" => "Correo simulado en entorno de desarrollo"]);
    exit;
}

// Enviar el correo en producción
$subject = "Respuesta a tu mensaje de ayuda";
$headers = "From: soporte@mommatch.com\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

if (mail($email, $subject, $reply, $headers)) {
    echo json_encode(["success" => true]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Error al enviar el correo"]);
}

