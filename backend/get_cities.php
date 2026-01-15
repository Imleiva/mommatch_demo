<?php
/**
 * API para autocompletado de ciudades
 * 
 * Funcionalidad de búsqueda de ciudades
 * para el componente de autocompletado en los formularios. La búsqueda
 * insensible a mayúsculas/minúsculas y espacios extra fue complicada
 * de implementar correctamente con MySQL. Al final usé LOWER() y TRIM()
 * para asegurar resultados consistentes
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

try {
    // Obtener la conexión a la base de datos
    $pdo = getDatabaseConnection();

    // Verificar si se envió un término de búsqueda
    $searchTerm = $_GET['search'] ?? '';
    $query = "SELECT 
                c.id,
                c.name AS city
              FROM cities c";

    if (!empty($searchTerm)) {
        // Usar búsqueda flexible con LOWER y TRIM
        $query .= " WHERE LOWER(TRIM(c.name)) LIKE :searchTerm";
    }

    $query .= " ORDER BY c.name";
    $query .= " LIMIT 15"; // Limitar resultados para mejor rendimiento

    $stmt = $pdo->prepare($query);

    if (!empty($searchTerm)) {
        $stmt->bindValue(':searchTerm', '%' . strtolower($searchTerm) . '%', PDO::PARAM_STR);
    }

    $stmt->execute();
    $cities = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Formatear los resultados para incluir la provincia
    $formattedCities = [];
    foreach ($cities as $city) {
        // Usar solo la ciudad para el campo full_name
        $city['full_name'] = $city['city'];
        $formattedCities[] = $city;
    }

    // Validar si la tabla `cities` está vacía
    if (empty($formattedCities)) {
        echo json_encode([
            'success' => true,
            'data' => [],
            'message' => 'No se encontraron ciudades.',
            'timestamp' => date('c')
        ]);
        exit;
    }

    echo json_encode([
        'success' => true,
        'data' => $formattedCities ?: [],
        'timestamp' => date('c')
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error de base de datos',
        'timestamp' => date('c')
    ]);
    error_log("Error en get_cities: " . $e->getMessage());
}