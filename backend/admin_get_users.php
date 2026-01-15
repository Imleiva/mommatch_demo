<?php
/**
 * Endpoint del panel de administración para obtener usuarios
 * 
 * Este script devuelve una lista paginada de usuarios para el panel de admin.
 * Implementé búsqueda por diferentes campos y paginación, lo que me llevó
 * más tiempo del esperado por la complejidad de las consultas SQL con JOIN
 * El manejo de parámetros numéricos y texto también fue complejo
 */

ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: http://localhost:3000'); 
header('Access-Control-Allow-Credentials: true');

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

// Obtener todos los usuarios con información limitada
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
$offset = ($page - 1) * $limit;
$search = isset($_GET['search']) ? $_GET['search'] : '';

$query = "SELECT 
            u.id, 
            u.name, 
            u.email, 
            pp.city, 
            pp.mother_age,
            pp.family_type, 
            pp.number_of_children, 
            u.created_at 
          FROM users u
          LEFT JOIN profile_preferences pp ON u.id = pp.user_id";

$params = [];

if (!empty($search)) {
    if (is_numeric($search)) {
        // Si el término de búsqueda es un número, buscar también por ID
        $query .= " WHERE u.id = :search_id 
                    OR pp.number_of_children = :search_number";
        $params[':search_id'] = (int)$search;
        $params[':search_number'] = (int)$search;
    } else {
        // Búsqueda por texto
        $query .= " WHERE u.name LIKE :search 
                    OR u.email LIKE :search 
                    OR pp.city LIKE :search 
                    OR pp.mother_age LIKE :search
                    OR pp.family_type LIKE :search";
        $params[':search'] = "%{$search}%";
    }
}

$query .= " ORDER BY u.created_at DESC LIMIT :limit OFFSET :offset";
$params[':limit'] = $limit;
$params[':offset'] = $offset;

try {
    $stmt = $pdo->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $countQuery = "SELECT COUNT(*) as total FROM users u 
                   LEFT JOIN profile_preferences pp ON u.id = pp.user_id";
    if (!empty($search)) {
        if (is_numeric($search)) {
            $countQuery .= " WHERE u.id = :search_id 
                             OR pp.number_of_children = :search_number";
        } else {
            $countQuery .= " WHERE u.name LIKE :search 
                             OR u.email LIKE :search 
                             OR pp.city LIKE :search
                             OR pp.mother_age LIKE :search
                             OR pp.family_type LIKE :search";
        }
    }
    $countStmt = $pdo->prepare($countQuery);
    if (!empty($search)) {
        if (is_numeric($search)) {
            $countStmt->bindValue(':search_id', (int)$search, PDO::PARAM_INT);
            $countStmt->bindValue(':search_number', (int)$search, PDO::PARAM_INT);
        } else {
            $countStmt->bindValue(':search', "%{$search}%", PDO::PARAM_STR);
        }
    }
    $countStmt->execute();
    $totalUsers = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

    echo json_encode([
        "success" => true,
        "users" => $users,
        "pagination" => [
            "total" => $totalUsers,
            "pages" => ceil($totalUsers / $limit),
            "current" => $page,
            "limit" => $limit
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Error al obtener usuarios: " . $e->getMessage()]);
}
