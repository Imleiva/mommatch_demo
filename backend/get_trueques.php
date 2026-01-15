<?php
/**
 * Listado de artículos disponibles para trueque
 * 
 * Este script muestra todos los artículos disponibles para intercambio 
 * en el sistema de trueques, con opciones de filtrado por ciudad y estado.
 * Fue complicado implementar los filtros dinámicos en la consulta SQL
 * manteniendo la seguridad contra inyecciones
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

header('Content-Type: application/json; charset=utf-8');

$cityFilter = $_GET['city'] ?? null;
$statusFilter = $_GET['status'] ?? null;

try {
    $pdo = getDatabaseConnection();

    $query = "SELECT * FROM trueques WHERE 1";

    if ($cityFilter) {
        $query .= " AND city = :city";
    }
    if ($statusFilter) {
        $query .= " AND status = :status";
    }

    $query .= " ORDER BY created_at DESC";

    $stmt = $pdo->prepare($query);

    if ($cityFilter) {
        $stmt->bindParam(':city', $cityFilter);
    }
    if ($statusFilter) {
        $stmt->bindParam(':status', $statusFilter);
    }

    $stmt->execute();
    $trueques = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'trueques' => $trueques]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}