<?php
/**
 * Gestor unificado de sesiones
 * 
 * Este script proporciona una capa de abstracción para gestionar diferentes
 * tipos de sesiones (usuario regular y administrador) de forma transparente
 */

// Check if URL is for admin area
$isAdminRoute = strpos($_SERVER['REQUEST_URI'], '/admin/') !== false;

// Prioritize admin session for admin routes
if ($isAdminRoute) {
    session_name('MomMatchAdminSession');
    session_start();
    
    $isAuthenticated = isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true;
    $current_user_id = $isAuthenticated ? $_SESSION['admin_id'] : null;
    $isAdmin = $isAuthenticated;
} else {
    // For regular user routes, first try user session
    session_name('MomMatchSession');
    session_start();
    
    if (isset($_SESSION['user_id'])) {
        $isAuthenticated = true;
        $current_user_id = $_SESSION['user_id'];
        $isAdmin = false;
    } else {
        // If no user session, try admin session as fallback
        session_write_close();
        session_name('MomMatchAdminSession');
        session_start();
        
        $isAuthenticated = isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true;
        $current_user_id = $isAuthenticated ? $_SESSION['admin_id'] : null;
        $isAdmin = $isAuthenticated;
    }
}