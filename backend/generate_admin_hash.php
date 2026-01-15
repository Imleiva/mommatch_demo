<?php
/**
 * Herramienta para generar hashes de contraseñas para admin
 * 
 * Este script es una utilidad que uso para crear hashes seguros de contraseñas
 * para cuentas de administrador. No es accesible desde la interfaz web y sólo
 * se ejecuta manualmente cuando necesito crear o actualizar credenciales.
 * La implementación me resultó muy útil para evitar guardar contraseñas en texto plano
 */

// Cambia 'admin123' por la contraseña que quieras hashear
echo password_hash('admin123', PASSWORD_DEFAULT);
