<?php
/**
 * API para obtener las etapas de edad de hijos disponibles
 * 
 * Este script proporciona un catálogo de etapas de edad para niños 
 * que se usa en los formularios y filtros de búsqueda. Tuve que implementar
 * controles estrictos de caché para evitar que los navegadores guardaran 
 * versiones antiguas cuando actualizaba las etapas en la base de datos.
 * El uso de ob_start y ob_clean fue necesario para evitar problemas con salida 
 * no deseada antes del JSON
 */

// Evitar que se muestren errores PHP en la salida
ini_set('display_errors', 0);
error_reporting(0);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

// Definir encabezados HTTP específicos para evitar problemas de CORS y caché
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');

session_start([
    'name' => 'MomMatchSession',
]);

// Asegurarse de que no haya salida previa al JSON
ob_start();

try {
    $pdo = getDatabaseConnection();
    
    $stmt = $pdo->query("SELECT id, stage_name, age_range FROM child_age_stages ORDER BY id");
    $stages = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Limpiar cualquier salida anterior
    if (ob_get_length()) ob_clean();
    
    echo json_encode([
        "success" => true,
        "stages" => $stages
    ]);
    
} catch (Exception $e) {
    // Limpiar cualquier salida anterior
    if (ob_get_length()) ob_clean();
    
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Error al obtener las etapas de edad: " . $e->getMessage()
    ]);
    
    // Registrar el error para debugging
    error_log("Error en get_child_age_stages.php: " . $e->getMessage());
}
