<?php
/**
 * Endpoint para actualizar el perfil de usuario
 * 
 * Este script maneja la actualización del perfil de usuario en MomMatch,
 * incluyendo la subida de fotos de perfil y actualización de datos personales.
 * La gestión de archivos me dio varios problemas por los permisos
 * de escritura en diferentes entornos y la validación de tipos
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';


session_start([
    'name' => 'MomMatchSession',
]);

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'No autenticado',
    ]);
    exit;
}

$userId = $_SESSION['user_id']; // Obtén el ID del usuario desde la sesión

error_log("Inicio de actualizar_perfil.php");
error_log("Session ID: " . session_id());
error_log("Session user_id: " . ($_SESSION['user_id'] ?? 'No session'));
error_log("POST data: " . print_r($_POST, true));
error_log("FILES data: " . print_r($_FILES, true));

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function sendJsonResponse($success, $data = [], $error = null, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'error' => $error,
        'timestamp' => date('c')
    ]);
    exit;
}

// Configuración
$allowedFamilyTypes = [
    'monoparental', 'biparental', 'reconstituida', 'extendida',
    'adoptiva', 'acogida', 'coparentalidad', 'lgtbi', 'subrogada',
    'custodia_compartida', 'multicultural', 'necesidades_especiales', 'nomada_digital', 'otro'
];
$maxFileSize = 5 * 1024 * 1024; // 5MB
$allowedMimeTypes = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
$allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

try {
    $pdo = getDatabaseConnection();

    // Verificar método HTTP
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJsonResponse(false, [], 'Método no permitido', 405);
    }

    // Validar edad de la madre
    if (isset($_POST['mother_age'])) {
        $motherAge = intval($_POST['mother_age']);
        if ($motherAge < 18 || $motherAge > 99) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'La edad debe estar entre 18 y 99 años.']);
            exit();
        }
    }

    // Inicializar variables
    $profilePhotoPath = null;
    $input = [];
    $baseDir = realpath(__DIR__ . '/../../') . '/';
    $uploadDir = realpath(__DIR__ . '/public/uploads/profiles/') . '/';

    // Detectar tipo de solicitud: multipart/form-data (para archivos) o application/json (para datos)
    $contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
  
    // 1. Manejar subida de archivo (multipart/form-data)
    if (!empty($_FILES['profile_photo']) && $_FILES['profile_photo']['error'] == UPLOAD_ERR_OK) {
        $file = $_FILES['profile_photo'];
        $tempName = $file['tmp_name'];
        $fileSize = $file['size'];
        $fileType = $file['type'];
        $fileName = $file['name']; 
        
        // Validar tamaño y tipo
        if ($fileSize > $maxFileSize) {
            throw new RuntimeException("El tamaño del archivo excede el límite permitido (5MB)");
        }
        
        if (!in_array($fileType, array_keys($allowedMimeTypes))) {
            throw new RuntimeException("Tipo de archivo no permitido. Sólo se aceptan JPG, PNG y WebP");
        }
        
        // Asegurar que el directorio existe y tiene permisos de escritura
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0755, true);
            error_log("Directorio de carga creado: " . $uploadDir);
        } elseif (!is_writable($uploadDir)) {
            error_log("El directorio de carga no tiene permisos de escritura: " . $uploadDir);
            chmod($uploadDir, 0755);
        }
        
        // Generar nombre de archivo único para evitar colisiones
        // Simplificar el nombre del archivo para evitar problemas de compatibilidad
        $fileExt = $allowedMimeTypes[$fileType];
        $newFileName = 'user_' . $userId . '.' . $fileExt;
        $targetPath = $uploadDir . $newFileName;
        
        error_log("Intentando guardar archivo en: " . $targetPath);
        
        // Mover el archivo
        if (!move_uploaded_file($tempName, $targetPath)) {
            error_log("Error al mover archivo de " . $tempName . " a " . $targetPath);
            throw new RuntimeException("Error al guardar el archivo");
        }
        
        error_log("Archivo guardado exitosamente en " . $targetPath);
        
        // Establecer la ruta para guardar en la base de datos
        $profilePhotoPath = '/public/uploads/profiles/' . $newFileName;
        
        // Actualizar sólo la foto de perfil en la base de datos
        $stmt = $pdo->prepare("
            INSERT INTO profile_preferences (user_id, profile_photo) 
            VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE profile_photo = VALUES(profile_photo)
        ");
        $stmt->execute([$userId, $profilePhotoPath]);
        
        // Corregir la construcción de la URL de la foto de perfil
        $photoUrl = $profilePhotoPath;
        if ($profilePhotoPath && !str_starts_with($profilePhotoPath, "http")) {
            $photoUrl = "http://localhost/mommatch/backend/" . ltrim($profilePhotoPath, '/');
        }
        error_log("Constructed photo_url: " . $photoUrl);

        // Responder con éxito
        sendJsonResponse(true, [
            'message' => 'Foto de perfil actualizada correctamente',
            'profile' => [
                'photo_url' => $photoUrl,
            ]
        ]);
    }
    
    // 2. Manejar datos JSON (application/json)
    else if (strpos($contentType, 'application/json') !== false) {
        // Procesar datos JSON
        $input = json_decode(file_get_contents('php://input'), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Datos JSON inválidos: ' . json_last_error_msg(),
            ]);
            exit;
        }

        // Si no se sube una nueva foto, usa la actual (si existe)
        if (!isset($input['profile_photo']) || empty($input['profile_photo'])) {
            // Verificar si el usuario ya tiene una foto de perfil
            $stmt = $pdo->prepare("SELECT profile_photo FROM profile_preferences WHERE user_id = ?");
            $stmt->execute([$userId]);
            $currentPhoto = $stmt->fetchColumn();
            
            // Si tiene una foto existente, la mantenemos
            if ($currentPhoto && $currentPhoto != '/public/uploads/profiles/default_profile.jpg') {
                $profilePhotoPath = $currentPhoto;
                error_log("Manteniendo foto de perfil existente: " . $profilePhotoPath);
            }
            // Solo si no tiene foto, usamos la predeterminada
            else {
                $profilePhotoPath = '/public/uploads/profiles/default_profile.jpg';
                error_log("Usando foto predeterminada");
            }
        } else {
            // Si se proporciona una foto, la usamos
            $profilePhotoPath = $input['profile_photo'];
            error_log("Usando foto proporcionada: " . $profilePhotoPath);
        }

        // Continúa con el resto del código existente para procesar datos del perfil

        // Filtrar campos innecesarios del payload
        $allowedFields = [
            'city', 'country', 'specialConditions', 'numberOfChildren', 'interests',
            'user_id', 'current_photo', 'mother_age', 'family_type', 'presentation', 'connection_type', 'child_age_stages'
        ];

        $input = array_filter(
            $input,
            fn($key) => in_array($key, $allowedFields, true),
            ARRAY_FILTER_USE_KEY
        );

        error_log("Datos recibidos en actualizar_perfil.php:");
        error_log(print_r($_POST, true));
        error_log("Datos JSON decodificados:");
        error_log(print_r($input, true));

        // Validaciones de datos
        if (isset($input['family_type']) && !in_array($input['family_type'], $allowedFamilyTypes)) {
            throw new RuntimeException("Tipo de familia no válido", 400);
        }

        // Validar que ciudad y país solo contengan caracteres alfabéticos y espacios
        if (!empty($input['city']) && !preg_match('/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s\-\'.]+$/', $input['city'])) {
            throw new RuntimeException("La ciudad solo debe contener letras y espacios", 400);
        }

        if (!empty($input['country']) && !preg_match('/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s\-\'.]+$/', $input['country'])) {
            throw new RuntimeException("El país solo debe contener letras y espacios", 400);
        }

        // Verificar si es primera completación
        $stmt = $pdo->prepare("SELECT profile_completed FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $isFirstCompletion = $stmt->fetchColumn() == 0;

        // Obtener o crear city_id si se proporcionó city
        $cityId = null;
        if (!empty($input['city'])) {
            $stmt = $pdo->prepare("SELECT id FROM cities WHERE name = ? LIMIT 1");
            $stmt->execute([$input['city']]);
            $cityId = $stmt->fetchColumn();

            if (!$cityId) {
                // Insertar nueva ciudad
                $stmt = $pdo->prepare("INSERT INTO cities (name) VALUES (?)");
                $stmt->execute([$input['city']]);
                $cityId = $pdo->lastInsertId();
            }
        }

        // Procesar condiciones especiales
        $specialConditions = !empty($input['specialConditions']) 
            ? $input['specialConditions'] 
            : [];

        // Asegurar que los datos de specialConditions sean un array JSON
        if (is_array($specialConditions)) {
            // Guardamos directamente el array como JSON
            $specialConditionsJson = json_encode($specialConditions);
        } else if (is_string($specialConditions) && !empty($specialConditions)) {
            // Si ya es una cadena JSON, intentamos decodificarla para validar
            $decoded = json_decode($specialConditions, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $specialConditionsJson = $specialConditions; // ya es una cadena JSON válida
            } else {
                // Si no es JSON válido, pero es una cadena, podría ser un solo valor
                $specialConditionsJson = json_encode([$specialConditions]);
            }
        } else {
            // Si no hay condiciones especiales o no son válidas
            $specialConditionsJson = json_encode([]);
        }

        // Guardar en la tabla `match_preferences`
        $stmt = $pdo->prepare("UPDATE match_preferences SET prioritize_conditions = ? WHERE user_id = ?");
        $stmt->execute([intval(!empty($specialConditions)), $userId]); // Solo guardamos si hay condiciones

        $profileData = [
            'user_id' => $userId,
            'profile_photo' => $profilePhotoPath,
            'mother_age' => isset($input['mother_age']) ? (int)$input['mother_age'] : null,
            'family_type' => $input['family_type'] ?? null,
            'city' => !empty($input['city']) ? $input['city'] : null,
            'country' => !empty($input['country']) ? $input['country'] : null,
            'city_id' => $cityId ?? null,
            'special_conditions' => $specialConditionsJson,
            'presentation' => $input['presentation'] ?? null, 
        ];

        // Si el tipo de conexión está definido, actualizar también la tabla match_preferences
        if (isset($input['connection_type'])) {
            $stmtPref = $pdo->prepare("
                INSERT INTO match_preferences (user_id, connection_type) 
                VALUES (:user_id, :connection_type)
                ON DUPLICATE KEY UPDATE 
                connection_type = VALUES(connection_type)
            ");
            $stmtPref->execute([
                ':user_id' => $userId,
                ':connection_type' => $input['connection_type']
            ]);
        }

        // Filtrar datos vacíos o nulos antes de actualizar
        $profileData = array_filter($profileData, function ($value) {
            return $value !== null && $value !== '';
        });

        // NO incluimos number_of_children en la actualización

        // Construir y ejecutar consulta UPSERT para `profile_preferences`
        $stmt = $pdo->prepare("
            INSERT INTO profile_preferences (
                user_id, city, country, special_conditions,  
                profile_photo, mother_age, family_type, presentation, city_id
            ) VALUES (
                :user_id, :city, :country, :special_conditions,  
                :profile_photo, :mother_age, :family_type, :presentation, :city_id
            )
            ON DUPLICATE KEY UPDATE
                city = VALUES(city),
                country = VALUES(country),
                special_conditions = VALUES(special_conditions),
                profile_photo = VALUES(profile_photo),
                mother_age = VALUES(mother_age),
                family_type = VALUES(family_type),
                presentation = VALUES(presentation),
                city_id = VALUES(city_id)
        ");
        
        // Preparar los parámetros asegurando que existan todas las claves necesarias
        $params = [
            ':user_id' => $userId,
            ':city' => $profileData['city'] ?? null,
            ':country' => $profileData['country'] ?? null,
            ':special_conditions' => $profileData['special_conditions'] ?? null,
            ':profile_photo' => $profileData['profile_photo'] ?? null,
            ':mother_age' => $profileData['mother_age'] ?? null,
            ':family_type' => $profileData['family_type'] ?? null,
            ':presentation' => $profileData['presentation'] ?? null,
            ':city_id' => $profileData['city_id'] ?? null,
        ];
        
        $stmt->execute($params);

        // Manejar intereses de manera transaccional
        if (!empty($input['interests']) && is_array($input['interests'])) {
           
            $pdo->beginTransaction();
            try {
                // Validar si los intereses son nombres o IDs
                $interestIds = [];
                foreach ($input['interests'] as $interest) {
                    if (is_numeric($interest)) {
                        $interestIds[] = (int)$interest;
                    } else {
                        // Buscar el ID del interés por su nombre
                        $stmt = $pdo->prepare("SELECT id FROM interests WHERE name = ? LIMIT 1");
                        $stmt->execute([$interest]);
                        $id = $stmt->fetchColumn();

                        if ($id) {
                            $interestIds[] = (int)$id;
                        } else {
                            // Insertar el nuevo interés y obtener su ID
                            $stmt = $pdo->prepare("INSERT INTO interests (name, created_by) VALUES (?, ?)");
                            $stmt->execute([$interest, $userId]);
                            $interestIds[] = (int)$pdo->lastInsertId();
                        }
                    }
                }

                // Insertar intereses asociados al usuario
                if (!empty($interestIds)) {
                    // Primero eliminar todos los intereses existentes para este usuario
                    // para asegurar que solo queden los que están seleccionados actualmente
                    $deleteStmt = $pdo->prepare("DELETE FROM user_interests WHERE user_id = ?");
                    $deleteStmt->execute([$userId]);
                    error_log("Eliminados intereses previos del usuario: " . $userId);
                    
                    // Ahora insertar los intereses seleccionados actualmente
                    $insertSql = "INSERT IGNORE INTO user_interests (user_id, interest_id) VALUES ";
                    $insertValues = [];
                    $params = [];

                    foreach ($interestIds as $id) {
                        $insertValues[] = "(?, ?)";
                        array_push($params, $userId, $id);
                    }
                  
                    if (!empty($insertValues)) {
                        $insertSql .= implode(", ", $insertValues);
                        error_log($insertSql);
                        $pdo->prepare($insertSql)->execute($params);
                        error_log("Insertados nuevos intereses para el usuario: " . $userId);
                    }
                }
                $pdo->commit();
            } catch (Exception $e) {
                $pdo->rollBack();
                error_log("Error al manejar intereses: " . $e->getMessage());
                throw $e; // Relanzar la excepción para que sea manejada en el bloque principal
            }
        }

        // Procesar las etapas de edad de los hijos 
        if (isset($input['child_age_stages'])) {
            try {
                // Depuración más detallada
                error_log("actualizar_perfil.php - Procesando child_age_stages para usuario $userId");
                error_log("actualizar_perfil.php - Valor original: " . print_r($input['child_age_stages'], true));
                
                // Asegurar que sea un array y verificar su contenido
                if (!is_array($input['child_age_stages'])) {
                    error_log("actualizar_perfil.php - child_age_stages no es un array: " . gettype($input['child_age_stages']));
                    // Intentar convertir
                    if (is_string($input['child_age_stages']) && strlen($input['child_age_stages']) > 0) {
                        $childAgeStages = json_decode($input['child_age_stages'], true);
                        if (json_last_error() !== JSON_ERROR_NONE) {
                            error_log("actualizar_perfil.php - Error decodificando child_age_stages: " . json_last_error_msg());
                            $childAgeStages = []; // En caso de error, usamos array vacío
                        }
                    } else {
                        $childAgeStages = []; // Si no es string ni array, usamos array vacío
                    }
                } else {
                    $childAgeStages = $input['child_age_stages'];
                }
                
                // Asegurar que todos los valores son enteros
                $childAgeStages = array_map('intval', $childAgeStages);
                
                // Depuración detallada del contenido
                error_log("actualizar_perfil.php - Etapas normalizadas para usuario $userId: " . json_encode($childAgeStages));
                
                // Verificar si es una actualización intencional o un formulario vacío
                $isIntentionalUpdate = isset($input['profile_update']) && $input['profile_update'] === true;
                
                // CAMBIO IMPORTANTE: Solo eliminar etapas anteriores si:
                // 1. Hay nuevas etapas para insertar, o
                // 2. Es una actualización intencional con un array vacío (quiere borrar todo)
                if (!empty($childAgeStages) || $isIntentionalUpdate) {
                    $deleteStmt = $pdo->prepare("DELETE FROM user_child_stages WHERE user_id = ?");
                    $deleteStmt->execute([$userId]);
                    $deletedCount = $deleteStmt->rowCount();
                    error_log("actualizar_perfil.php - Eliminadas $deletedCount etapas anteriores para usuario $userId");
                } else {
                    error_log("actualizar_perfil.php - No se eliminan etapas existentes porque parece una carga de formulario sin cambios");
                }
                
                // PASO 2: Insertar las nuevas etapas SOLO si hay alguna seleccionada
                if (!empty($childAgeStages)) {
                    // Preparar la consulta para inserción múltiple
                    $insertValues = [];
                    $params = [];
                    $validStageCount = 0;
                    
                    foreach ($childAgeStages as $stageId) {
                        // Convertir a entero y validar
                        $stageId = (int)$stageId;
                        if ($stageId < 1 || $stageId > 6) {
                            error_log("actualizar_perfil.php - ID de etapa inválido: $stageId - Debe estar entre 1 y 6");
                            continue;
                        }
                        
                        $insertValues[] = "(?, ?)";
                        $params[] = $userId;
                        $params[] = $stageId;
                        $validStageCount++;
                        error_log("actualizar_perfil.php - Preparando inserción: user_id=$userId, stage_id=$stageId");
                    }
                    
                    if ($validStageCount > 0) {
                        // Usar una transacción para asegurar la integridad
                        $pdo->beginTransaction();
                        
                        try {
                            // Insertar todas las etapas de una vez
                            $sql = "INSERT INTO user_child_stages (user_id, stage_id, created_at) VALUES " . 
                                   implode(", ", array_map(function() { return "(?, ?, CURRENT_TIMESTAMP)"; }, $insertValues));
                            $stmt = $pdo->prepare($sql);
                            $executeResult = $stmt->execute($params);
                            
                            if (!$executeResult) {
                                throw new Exception("Error ejecutando inserción: " . json_encode($stmt->errorInfo()));
                            }
                            
                            $insertedCount = $stmt->rowCount();
                            error_log("actualizar_perfil.php - Insertadas $insertedCount etapas para usuario $userId");
                            
                            // Verificar que se insertaron correctamente con consulta explícita
                            $verifyStmt = $pdo->prepare("SELECT stage_id FROM user_child_stages WHERE user_id = ? ORDER BY stage_id");
                            $verifyStmt->execute([$userId]);
                            $insertedStages = $verifyStmt->fetchAll(PDO::FETCH_COLUMN);
                            error_log("actualizar_perfil.php - Etapas verificadas después de inserción: " . json_encode($insertedStages));
                            
                            if (count($insertedStages) !== $validStageCount) {
                                throw new Exception("Discrepancia en etapas insertadas. Solicitadas: $validStageCount, Insertadas: " . count($insertedStages));
                            }
                            
                            // Comparar los arrays para asegurarnos de que se insertaron exactamente las etapas solicitadas
                            $expectedStages = array_values(array_filter($childAgeStages, function($stage) {
                                return $stage >= 1 && $stage <= 6;
                            }));
                            sort($expectedStages);
                            sort($insertedStages);
                            
                            if (json_encode($expectedStages) !== json_encode($insertedStages)) {
                                error_log("actualizar_perfil.php - ALERTA: Discrepancia en etapas. Esperadas: " . json_encode($expectedStages) . ", Encontradas: " . json_encode($insertedStages));
                            }
                            
                            $pdo->commit();
                        } catch (Exception $e) {
                            $pdo->rollBack();
                            throw $e; // Re-lanzar para manejar en el catch externo
                        }
                    } else {
                        error_log("actualizar_perfil.php - No hay etapas válidas para insertar después de validación");
                    }
                } else {
                    error_log("actualizar_perfil.php - Array de etapas vacío. No se insertarán etapas (esto es válido).");
                }
                
                // PASO 3: Verificación final inmediata
                $finalVerifyStmt = $pdo->prepare("
                    SELECT cs.id, cs.stage_name 
                    FROM user_child_stages ucs
                    JOIN child_age_stages cs ON ucs.stage_id = cs.id
                    WHERE ucs.user_id = ?
                    ORDER BY cs.id
                ");
                $finalVerifyStmt->execute([$userId]);
                $finalStages = $finalVerifyStmt->fetchAll(PDO::FETCH_ASSOC);
                error_log("actualizar_perfil.php - VERIFICACIÓN FINAL - Etapas para usuario $userId: " . json_encode($finalStages));
                
            } catch (Exception $e) {
                error_log("actualizar_perfil.php - Error al procesar etapas: " . $e->getMessage() . "\n" . $e->getTraceAsString());
                // No lanzar excepción para permitir que el resto del perfil se actualice
            }
        } else {
            error_log("actualizar_perfil.php - Campo 'child_age_stages' no está presente en el payload");
        }

        // Marcar perfil como completado si es la primera vez
        if ($isFirstCompletion) {
            $pdo->prepare("UPDATE users SET profile_completed = 1 WHERE id = ?")
                ->execute([$userId]);
        }

        // Corregir la construcción de la URL de la foto de perfil
        $photoUrl = $profilePhotoPath;
        if ($profilePhotoPath && !str_starts_with($profilePhotoPath, "http")) {
            $photoUrl = "http://localhost/mommatch/backend" . ltrim($profilePhotoPath, '/');
        }
        error_log("Constructed photo_url: " . $photoUrl);
        
        // Respuesta exitosa con datos actualizados
        sendJsonResponse(true, [
            'message' => 'Perfil actualizado correctamente',
            'profile' => [
                'photo_url' => $photoUrl,
            ]
        ]);
    }
    // 3. Si no es ninguno de los tipos anteriores, error
    else {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Tipo de contenido no válido o no se detectó archivo ni datos de perfil',
        ]);
        exit;
    }

} catch (JsonException $e) {
    sendJsonResponse(false, [], 'Datos JSON inválidos', 400);
} catch (PDOException $e) {
    error_log("Error PDO en actualizar_perfil.php: " . $e->getMessage());
    sendJsonResponse(false, [], 'Error de base de datos', 500);
} catch (RuntimeException $e) {
    error_log("Error Runtime en actualizar_perfil.php: " . $e->getMessage());
    sendJsonResponse(false, [], $e->getMessage(), $e->getCode() ?: 400);
} catch (Exception $e) {
    error_log("Error inesperado: " . $e->getMessage());
    sendJsonResponse(false, [], 'Error interno del servidor', 500);
}
