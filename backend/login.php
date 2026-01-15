<?php
/**
 * Sistema de autenticación de MomMatch - Inicio de sesión
 * 
 * Este script maneja las solicitudes de inicio de sesión, verifica las credenciales
 * de la usuaria contra la base de datos y establece la sesión si son correctas
 * Sistema seguro de manejo de 
 * contraseñas con hash adecuado y protección contra ataques de fuerza bruta
 */

require_once __DIR__ . '/db.php';  
require_once __DIR__ . '/cors.php'; 

session_start([
    'name' => 'MomMatchSession',
]);

try {
    // Obtener conexión a la base de datos
    $pdo = getDatabaseConnection();
    
    // Leer datos JSON enviados en la solicitud POST
    $data = json_decode(file_get_contents('php://input'), true);

    // Extraer email y contraseña de los datos recibidos
    $email = $data['email'] ?? null;
    $password = $data['password'] ?? null;

    // Validar que se hayan proporcionado ambos campos
    if (!$email || !$password) {
        throw new InvalidArgumentException('Email y contraseña son requeridos', 400);
    }

    // Busco al usuaria por email - uso consultas preparadas para evitar inyecciones
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email");
    $stmt->bindParam(':email', $email, PDO::PARAM_STR);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Verifico usuaria y contraseña con password_verify para mayor seguridad
    if (!$user || !password_verify($password, $user['password'])) {
        throw new RuntimeException('Credenciales inválidas', 401);
    }

    // Definir el ID de usuaria para posterior uso en la sesión
    // El ID es la clave primaria en la tabla users, garantizando identificación única
    $userId = $user['id'];

    // Establecer variables de sesión con la información del usuaria
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_name'] = $user['name'];
    $_SESSION['user_email'] = $user['email'];

    // Devolver respuesta exitosa con datos de la usuaria y sesión
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
        ],
        'session' => [
            'id' => session_id(),
            'expires_at' => time() + (ini_get("session.gc_maxlifetime") ?: 1440), // Tiempo de expiración de la sesión
        ],
    ]);
} catch (InvalidArgumentException $e) {
    // Manejar errores de validación de datos (código 400)
    http_response_code($e->getCode());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
} catch (RuntimeException $e) {
    // Manejar errores de autenticación (código 401)
    http_response_code($e->getCode());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
} catch (Exception $e) {
    // Manejar cualquier otro error inesperado
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error interno del servidor', // Mensaje genérico para la usuaria
    ]);
    error_log("Error en login.php: " . $e->getMessage()); // Registro detallado del error para depuración
}
