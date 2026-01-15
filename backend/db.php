<?php
/**
 * Archivo de configuración y conexión a la base de datos
 * 
 * Este archivo centraliza la lógica de conexión a la base de datos
 * para todo el backend de la aplicación MomMatch. Implementé el patrón
 * Singleton para evitar múltiples conexiones innecesarias y mejorar el rendimiento
 */

// Configuración de la base de datos con parámetros de seguridad
define('DB_CONFIG', [
    'host' => 'localhost',      // Servidor de base de datos
    'dbname' => 'mommatch_db',  // Nombre de la base de datos
    'username' => 'root',       // Usuario de MySQL (por defecto en XAMPP)
    'password' => '',           // Contraseña (vacía por defecto en XAMPP)
    'charset' => 'utf8mb4',     // Codificación para soporte de caracteres especiales y emojis
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,             // Configurar PDO para lanzar excepciones en caso de error
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,        // Obtener resultados como arrays asociativos
        PDO::ATTR_EMULATE_PREPARES => false,                     // Usar preparación nativa de MySQL para consultas
        PDO::ATTR_PERSISTENT => false,                           // No usar conexiones persistentes
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"  // Configurar codificación
    ]
]);

/**
 * Obtiene una conexión a la base de datos usando el patrón Singleton
 * 
 * Esta función crea una única instancia de conexión PDO y la reutiliza
 * durante toda la ejecución del script, mejorando el rendimiento.
 * 
 * @return PDO Objeto de conexión a la base de datos
 * @throws RuntimeException Si no se puede establecer la conexión
 */
function getDatabaseConnection() {
    static $pdo = null;  // Variable estática para mantener la conexión entre llamadas
    
    if ($pdo === null) {
        try {
            // Crear una nueva conexión PDO si aún no existe
            $pdo = new PDO(
                'mysql:host=localhost;dbname=mommatch_db;charset=utf8mb4',
                'root', 
                '',
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,   // Lanzar excepciones en caso de error
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,   // Devolver resultados como arrays asociativos
                ]
            ); 
            // Verificación adicional de que la conexión funciona
            $pdo->query("SELECT 1")->fetch();
        } catch (PDOException $e) {
            // Registrar el error en el log y lanzar una excepción genérica
            // para no exponer detalles de la base de datos al usuario
            error_log("Database connection failed: " . $e->getMessage());
            throw new RuntimeException("Error de conexión a la base de datos", 500);
        }
    }
    
    return $pdo;
}