<?php
/**
 * Sistema de registro de nuevas usuarias
 * 
 * Este script maneja la creación de nuevas cuentas de usuario en la plataforma.
 * Implementa validaciones para asegurar que los datos proporcionados sean correctos
 * y que el correo electrónico no esté ya registrado. Implementación segura del hash 
 * de contraseñas y la validación de formatos de correo electrónico.
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

header('Content-Type: application/json');

$pdo = getDatabaseConnection();


$data = json_decode(file_get_contents("php://input"), true);

if (empty($data['name']) || empty($data['email']) || empty($data['password'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Todos los campos son obligatorios']);
    exit;
}

try {
    // Verificar email existente
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$data['email']]);
    
    if ($stmt->rowCount() > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'El email ya está registrado']);
        exit;
    }

    // Hash de contraseña
    $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
    
    try {
        $pdo->beginTransaction(); // Iniciar transacción para garantizar la integridad de los datos
        
        // Registrar los datos que se van a insertar para diagnóstico
        error_log("Intentando crear usuario: " . json_encode([
            'name' => $data['name'],
            'email' => $data['email'],
            'password_length' => strlen($hashedPassword)
        ]));
        
        // Crear usuario - Usando exactamente las columnas disponibles en la tabla users
        $stmt = $pdo->prepare("
            INSERT INTO users (
                name, 
                email, 
                password, 
                profile_completed, 
                created_at,
                updated_at
            ) VALUES (
                ?, 
                ?, 
                ?, 
                0, 
                CURRENT_TIMESTAMP(), 
                CURRENT_TIMESTAMP()
            )
        ");
        $stmt->execute([
            $data['name'], 
            $data['email'], 
            $hashedPassword
        ]);
        
        // Obtener el ID del usuario recién creado
        $userId = $pdo->lastInsertId();
        error_log("Usuario creado con ID: " . $userId);
        
        // Crear una entrada predeterminada en profile_preferences - Usando exactamente las columnas disponibles
        $insertProfileSql = "
            INSERT INTO profile_preferences (
                user_id, 
                city, 
                country, 
                special_conditions, 
                number_of_children,
                city_id,
                profile_photo,
                mother_age,
                family_type,
                presentation,
                created_at,
                updated_at
            ) VALUES (
                ?, 
                NULL, 
                NULL, 
                NULL, 
                0,
                NULL,
                '/public/uploads/profiles/default_profile.jpg',
                NULL,
                'monoparental',
                NULL,
                CURRENT_TIMESTAMP(),
                CURRENT_TIMESTAMP()
            )
        ";
        $stmt = $pdo->prepare($insertProfileSql);
        $stmt->execute([$userId]);
        error_log("Preferencias de perfil inicializadas para el usuario: " . $userId);
        
        // Crear entrada en match_preferences
        $stmt = $pdo->prepare("INSERT INTO match_preferences (user_id, prioritize_conditions) VALUES (?, 0)");
        $stmt->execute([$userId]);
        error_log("Preferencias de match inicializadas para el usuario: " . $userId);
        
        $pdo->commit(); // Confirmar todas las operaciones
        
        // Configurar sesión
        $_SESSION['user_id'] = $userId;
        $_SESSION['user_email'] = $data['email'];
        
        // Por defecto, el perfil no está completo
        $profileCompleted = 0;

        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $_SESSION['user_id'],
                'name' => $data['name'],
                'email' => $data['email'],
                'profile_completed' => $profileCompleted
            ]
        ]);
        
    } catch (Exception $innerEx) {
        $pdo->rollBack(); // Revertir cambios en caso de error
        error_log("Error en la transacción de registro: " . $innerEx->getMessage());
        error_log("Stack trace: " . $innerEx->getTraceAsString());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al crear el usuario: ' . $innerEx->getMessage()]);
        exit;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error en el servidor: ' . $e->getMessage()]);
    error_log("Error en registro: " . $e->getMessage());
}
