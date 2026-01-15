<?php
/**
 * Actualizador de perfiles de usuario
 *
 * Actualización de los perfiles de usuarias, incluyendo
 * información personal, preferencias, intereses y datos de sus hijos
 * Lógica de actualización de fotos de perfil
 */

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

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

header('Content-Type: application/json; charset=utf-8');

// Asegurarse de que no haya salida previa al JSON
ob_start();

try {
    $pdo = getDatabaseConnection();
    
    $profileData = json_decode(file_get_contents('php://input'), true);
    $userId = $profileData['user_id'] ?? null;

    if (!$userId) {
        throw new InvalidArgumentException('ID de usuario no proporcionado', 400);
    }

    // Actualiza los datos básicos del perfil
    $updateStmt = $pdo->prepare("
        UPDATE profile_preferences
        SET city = :city,
            country = :country,
            special_conditions = :special_conditions,
            number_of_children = :number_of_children,
            profile_photo = :profile_photo,
            mother_age = :mother_age,
            family_type = :family_type,
            presentation = :presentation
        WHERE user_id = :user_id
    ");
    $updateStmt->execute([
        ':city' => $profileData['city'] ?? null,
        ':country' => $profileData['country'] ?? null,
        ':special_conditions' => json_encode($profileData['specialConditions'] ?? []),
        ':number_of_children' => $profileData['number_of_children'] ?? 0,
        ':profile_photo' => $profileData['profile_photo'] ?? null,
        ':mother_age' => $profileData['mother_age'] ?? null,
        ':family_type' => $profileData['family_type'] ?? 'monoparental',
        ':presentation' => $profileData['presentation'] ?? null,
        ':user_id' => $userId
    ]);
    

    // Actualiza los intereses del usuario
    if (isset($profileData['interests']) && is_array($profileData['interests'])) {
        // Primero eliminar los intereses existentes
        $deleteInterestsStmt = $pdo->prepare("DELETE FROM user_interests WHERE user_id = :user_id");
        $deleteInterestsStmt->execute([':user_id' => $userId]);

        // Luego insertar los nuevos intereses seleccionados
        if (!empty($profileData['interests'])) {
            $insertInterestsStmt = $pdo->prepare("
                INSERT INTO user_interests (user_id, interest_id)
                SELECT :user_id, i.id
                FROM interests i
                WHERE i.name = :interest_name
            ");
            
            foreach ($profileData['interests'] as $interestName) {
                $insertInterestsStmt->execute([
                    ':user_id' => $userId,
                    ':interest_name' => $interestName
                ]);
            }
        }
    }

    // Procesar las etapas de edad de los hijos si se proporcionan
    if (isset($profileData['child_age_stages']) && is_array($profileData['child_age_stages'])) {
        // Eliminar las etapas anteriores
        $stmt = $pdo->prepare("DELETE FROM user_child_stages WHERE user_id = :user_id");
        $stmt->execute([':user_id' => $userId]);
        
        // Insertar las nuevas etapas, solo si hay alguna seleccionada
        if (!empty($profileData['child_age_stages'])) {
            // Agregar más logs detallados para diagnóstico
            error_log("Processing child age stages for user: $userId");
            error_log("Received stages data: " . json_encode($profileData['child_age_stages']));
            
            try {
                $insertValues = [];
                $params = [];
                
                foreach ($profileData['child_age_stages'] as $stageId) {
                    // Convertir a entero y validar
                    $stageId = (int)$stageId;
                    if ($stageId < 1 || $stageId > 6) {
                        error_log("Skipping invalid stage ID: $stageId (must be between 1-6)");
                        continue;
                    }
                    
                    $insertValues[] = "(?, ?)";
                    $params[] = $userId;
                    $params[] = $stageId;
                    error_log("Preparing to insert: user_id=$userId, stage_id=$stageId");
                }
                
                if (!empty($insertValues)) {
                    // Construir una sola consulta para insertar todas las etapas
                    $sql = "INSERT INTO user_child_stages (user_id, stage_id) VALUES " . implode(", ", $insertValues);
                    $stmt = $pdo->prepare($sql);
                    
                    // Agregar verificación de errores
                    if (!$stmt) {
                        error_log("Error preparing statement: " . $pdo->errorInfo()[2]);
                        throw new Exception("Error preparing statement: " . $pdo->errorInfo()[2]);
                    }
                    
                    $result = $stmt->execute($params);
                    
                    if (!$result) {
                        error_log("Error executing statement: " . $stmt->errorInfo()[2]);
                        throw new Exception("Error executing statement: " . $stmt->errorInfo()[2]);
                    }
                    
                    $count = $stmt->rowCount();
                    error_log("Successfully inserted $count child stage records for user $userId");
                    
                    // Verificación adicional para confirmar la inserción
                    $verifyStmt = $pdo->prepare("SELECT stage_id FROM user_child_stages WHERE user_id = ?");
                    $verifyStmt->execute([$userId]);
                    $insertedStages = $verifyStmt->fetchAll(PDO::FETCH_COLUMN);
                    error_log("Verification - Inserted stages for user $userId: " . implode(", ", $insertedStages));
                } else {
                    error_log("No valid stages to insert for user $userId");
                }
            } catch (Exception $e) {
                error_log("Error processing child age stages: " . $e->getMessage());
                // No rethrow - permitir que se complete el resto del proceso
            }
        } else {
            error_log("No child stages provided for user $userId");
        }
    }

    // Validar que no haya salida previa
    if (ob_get_length()) {
        ob_end_clean();
    }

    echo json_encode([
        'success' => true,
        'message' => 'Perfil actualizado correctamente',
        'timestamp' => date('c')
    ]);
    
} catch (InvalidArgumentException $e) {
    ob_end_clean();
    http_response_code($e->getCode());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('c')
    ]);
} catch (RuntimeException $e) {
    ob_end_clean();
    http_response_code($e->getCode());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('c')
    ]);
} catch (Exception $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error interno del servidor',
        'timestamp' => date('c')
    ]);
    error_log("Error en update_profile: " . $e->getMessage());
}