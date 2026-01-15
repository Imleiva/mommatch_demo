<?php
/**
 * Configuración CORS (Cross-Origin Resource Sharing)
 * 
 * Este archivo centraliza la configuración de CORS para todos los endpoints
 * de la API. Configurar correctamente CORS fue complicado, especialmente para
 * asegurar que las cookies de sesión funcionaran con peticiones entre dominios
 * El tiempo de caché de preflight de 3600 segundos fue agregado para mejorar el rendimiento
 */

// Especificar origen permitido
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Cache-Control, Origin, Accept-Encoding, Accept-Language, Connection");
header("Access-Control-Max-Age: 3600"); // Añadido para reducir preflight requests (1 hora)

// Manejar solicitudes OPTIONS (preflight) de forma explícita
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Devolver 200 OK para OPTIONS en lugar de 204 para mayor compatibilidad
    http_response_code(200);
    exit();
}
