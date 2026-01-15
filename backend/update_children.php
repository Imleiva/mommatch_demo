<?php
/**
 * Actualizador del número de hijos
 * 
 * Este script se especializa en actualizar el número de hijos en el perfil 
 * de una usuaria
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

// Iniciar sesión
session_start([
    'name' => 'MomMatchSession',
]);

// Verificar que el usuario esté autenticado
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'No autenticado',
    ]);
    exit;
}

$userId = $_SESSION['user_id']; // ID del usuario desde la sesión
error_log("update_children.php - Usuario ID: $userId");

// Procesar la solicitud
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Obtener los datos JSON enviados
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Verificar si se proporcionó el número de hijos
        if (!isset($data['number_of_children'])) {
            throw new Exception("No se proporcionó el número de hijos", 400);
        }
        
        // Convertir a entero
        $numberOfChildren = (int)$data['number_of_children'];
        error_log("Actualizando número de hijos a: $numberOfChildren");
        
        // Conectar a la base de datos
        $pdo = getDatabaseConnection();
        
        // Actualizar directamente el número de hijos
        $stmt = $pdo->prepare("
            UPDATE profile_preferences 
            SET number_of_children = :number_of_children 
            WHERE user_id = :user_id
        ");
        
        $result = $stmt->execute([
            ':number_of_children' => $numberOfChildren,
            ':user_id' => $userId
        ]);
        
        // Verificar si se afectó alguna fila
        if ($stmt->rowCount() === 0) {
            // Si no se actualizó ninguna fila, puede que no exista el registro
            // Intentamos insertar uno nuevo
            $insertStmt = $pdo->prepare("
                INSERT INTO profile_preferences 
                (user_id, number_of_children) 
                VALUES (:user_id, :number_of_children)
                ON DUPLICATE KEY UPDATE number_of_children = :number_of_children
            ");
            
            $insertResult = $insertStmt->execute([
                ':user_id' => $userId,
                ':number_of_children' => $numberOfChildren
            ]);
            
            if (!$insertResult) {
                throw new Exception("No se pudo crear el registro de perfil", 500);
            }
        }
        
        // Verificar que el valor se guardó correctamente
        $verifyStmt = $pdo->prepare("
            SELECT number_of_children 
            FROM profile_preferences 
            WHERE user_id = :user_id
        ");
        
        $verifyStmt->execute([':user_id' => $userId]);
        $storedValue = $verifyStmt->fetchColumn();
        
        error_log("Número de hijos almacenado: $storedValue");
        
        // Devolver respuesta exitosa
        echo json_encode([
            'success' => true,
            'data' => [
                'number_of_children' => (int)$storedValue,
                'message' => 'Número de hijos actualizado correctamente'
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code($e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
        
        error_log("Error en update_children.php: " . $e->getMessage());
    }
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Método no permitido'
    ]);
}