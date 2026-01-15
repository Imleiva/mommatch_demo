<?php
/**
 * Motor central del sistema de matches
 * 
 * Este script gestiona el corazón de la funcionalidad de MomMatch: registrar las
 * interacciones entre usuarios (likes, rechazos) y detectar cuando se produce un
 * match. La implementación del algoritmo de matching bidireccional fue compleja,
 * especialmente para manejar correctamente las diversas acciones que se
 * pueden realizar (like, reject, reinsert, remove_like)
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

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Datos JSON inválidos']);
        exit;
    }

    $targetUserId = $input['target_user_id'] ?? null;
    $action = $input['action'] ?? null;

    if (!$targetUserId || !$action) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Faltan parámetros']);
        exit;
    }

    try {
        $userId = $_SESSION['user_id'] ?? null;
        if (!$userId) {
            throw new RuntimeException('No autenticado', 401);
        }

        $pdo = getDatabaseConnection();

        if ($action === 'reinsert') {
            // Eliminar el perfil de la tabla de descartados
            $stmt = $pdo->prepare("DELETE FROM matches WHERE user_id_1 = :user_id AND user_id_2 = :target_user_id AND status = 'rejected'");
            $stmt->execute([
                ':user_id' => $userId,
                ':target_user_id' => $targetUserId,
            ]);

            echo json_encode(['success' => true, 'message' => 'Perfil reinsertado correctamente']);
            exit;
        }

        if ($action === 'remove_like') {
            // Validar que el usuario objetivo existe
            $stmt = $pdo->prepare("SELECT id FROM users WHERE id = :target_user_id");
            $stmt->execute([':target_user_id' => $targetUserId]);
            if ($stmt->rowCount() === 0) {
                throw new RuntimeException("El usuario objetivo no existe");
            }

            // Eliminar el registro de "conectemos" del usuario
            $stmt = $pdo->prepare("
                DELETE FROM matches 
                WHERE user_id_1 = :user_id 
                AND user_id_2 = :target_user_id 
                AND status = 'pending'
            ");
            $stmt->execute([
                ':user_id' => $userId,
                ':target_user_id' => $targetUserId,
            ]);

            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'Perfil eliminado de "Conectemos" correctamente']);
            } else {
                echo json_encode(['success' => false, 'error' => 'No se encontró el perfil en "Conectemos"']);
            }
            exit;
        }

        // Registrar interacción
        if (!in_array($action, ['like', 'reject'])) {
            throw new InvalidArgumentException('Datos inválidos', 400);
        }

        $status = $action === 'like' ? 'pending' : 'rejected';
        $stmt = $pdo->prepare("
            INSERT INTO matches (user_id_1, user_id_2, status)
            VALUES (:user_id_1, :user_id_2, :status)
            ON DUPLICATE KEY UPDATE status = :status
        ");
        $stmt->execute([
            ':user_id_1' => $userId,
            ':user_id_2' => $targetUserId,
            ':status' => $status
        ]);

        error_log("Intentando registrar match entre usuario $userId y $targetUserId con acción $action");

        // Verificar si hay match
        if ($action === 'like') {
            $stmt = $pdo->prepare("
                SELECT 1 FROM matches
                WHERE user_id_1 = :target_user_id
                AND user_id_2 = :user_id
                AND status = 'pending'
            ");
            $stmt->execute([
                ':target_user_id' => $targetUserId,
                ':user_id' => $userId
            ]);

            if ($stmt->fetch()) {
                error_log("¡Es un match entre usuario $userId y $targetUserId!");
                // Actualizar ambos a 'matched'
                $pdo->prepare("
                    UPDATE matches
                    SET status = 'matched'
                    WHERE (user_id_1 = :user_id AND user_id_2 = :target_user_id)
                    OR (user_id_1 = :target_user_id AND user_id_2 = :user_id)
                ")->execute([
                    ':user_id' => $userId,
                    ':target_user_id' => $targetUserId
                ]);

                echo json_encode([
                    'success' => true,
                    'message' => '¡Es un match!'
                ]);
                exit;
            } else {
                error_log("No se encontró match pendiente para usuario $userId y $targetUserId");
            }
        }

        echo json_encode(['success' => true]);
    } catch (RuntimeException $e) {
        error_log("Error en register_match.php: " . $e->getMessage());
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    } catch (Exception $e) {
        error_log("Error inesperado en register_match.php: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Error interno del servidor']);
        exit;
    }
}