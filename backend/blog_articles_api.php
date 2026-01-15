<?php
/**
 * API para la gestión de artículos del blog
 * 
 * Este endpoint permite al admin crear, editar, listar y eliminar
 * artículos del blog. La subida de imágenes me dio algunos problemas por los
 * permisos de carpetas y manejo de tipos MIME. También me resultó complejo implementar el
 * método PUT usando X-HTTP-Method-Override debido a limitaciones del frontend
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

header('Content-Type: application/json; charset=UTF-8');

ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

session_start(
    [
        'name' => 'MomMatchAdminSession',
    ]
);

try {
    $pdo = getDatabaseConnection();
    
    // GET: Obtener todos los artículos
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->query("SELECT * FROM articles ORDER BY date DESC");
        $articles = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'articles' => $articles]);
    } 
    // POST: Crear un nuevo artículo o actualizar uno existente
    else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Comprobar si es una solicitud PUT usando el header X-HTTP-Method-Override
        $method = $_SERVER['REQUEST_METHOD'];
        if (isset($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']) && $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] === 'PUT') {
            $method = 'PUT';
        }
        
        // Para depuración
        error_log("Método de solicitud: " . $method);
        error_log("POST recibido: " . print_r($_POST, true));
        error_log("FILES recibido: " . print_r($_FILES, true));
        
        // Si es una actualización (edición) usando action=update
        if (isset($_POST['action']) && $_POST['action'] === 'update') {
            // Validar ID
            if (!isset($_POST['id']) || !is_numeric($_POST['id'])) {
                echo json_encode(['success' => false, 'error' => 'ID no válido']);
                exit;
            }
            $id = $_POST['id'];
            // Obtener el artículo original
            $stmt = $pdo->prepare("SELECT * FROM articles WHERE id = ?");
            $stmt->execute([$id]);
            $article = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$article) {
                echo json_encode(['success' => false, 'error' => 'Artículo no encontrado']);
                exit;
            }
            // Actualizar los campos
            $title = isset($_POST['title']) && trim($_POST['title']) !== '' ? trim($_POST['title']) : $article['title'];
            $category = isset($_POST['category']) && trim($_POST['category']) !== '' ? trim($_POST['category']) : $article['category'];
            $excerpt = isset($_POST['excerpt']) && trim($_POST['excerpt']) !== '' ? trim($_POST['excerpt']) : $article['excerpt'];
            $date = isset($_POST['date']) && trim($_POST['date']) !== '' ? trim($_POST['date']) : $article['date'];

            // Por defecto, mantener la imagen anterior
            $imageUrl = $article['image'];
            // Si se indica que se actualiza la imagen y se subió una nueva
            $updateImage = isset($_POST['update_image']) && $_POST['update_image'] === '1';
            if ($updateImage && isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = __DIR__ . '/../frontend/public/images/blog/';
                if (!file_exists($uploadDir)) {
                    if (!mkdir($uploadDir, 0777, true)) {
                        echo json_encode(['success' => false, 'error' => 'Error al crear el directorio de uploads']);
                        exit;
                    }
                }
                $fileExtension = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
                $filename = uniqid() . '.' . $fileExtension;
                $targetFile = $uploadDir . $filename;
                if (move_uploaded_file($_FILES['image']['tmp_name'], $targetFile)) {
                    $imageUrl = $filename;
                } else {
                    echo json_encode(['success' => false, 'error' => 'Error al subir la imagen']);
                    exit;
                }
            }
            // Actualizar en la base de datos
            $stmt = $pdo->prepare("UPDATE articles SET title = ?, category = ?, image = ?, excerpt = ?, date = ? WHERE id = ?");
            $stmt->execute([$title, $category, $imageUrl, $excerpt, $date, $id]);
            // Si no se modificó ninguna fila, pero el artículo existe, igual devolvemos éxito
            if ($stmt->rowCount() === 0) {
                echo json_encode(['success' => true, 'message' => 'No se realizaron cambios, pero el artículo existe.']);
            } else {
                echo json_encode(['success' => true, 'message' => 'Artículo actualizado correctamente']);
            }
        }
        // Si es un POST normal para crear un nuevo artículo
        else {
            // Validar campos obligatorios
            if (!isset($_POST['title']) || trim($_POST['title']) === '') {
                echo json_encode(['success' => false, 'error' => 'El título es obligatorio']);
                exit;
            }
            
            if (!isset($_POST['category']) || trim($_POST['category']) === '') {
                echo json_encode(['success' => false, 'error' => 'La categoría es obligatoria']);
                exit;
            }
            
            if (!isset($_POST['excerpt']) || trim($_POST['excerpt']) === '') {
                echo json_encode(['success' => false, 'error' => 'El resumen es obligatorio']);
                exit;
            }
            
            // Si no se proporciona una fecha, usar la fecha actual
            if (!isset($_POST['date']) || trim($_POST['date']) === '') {
                $_POST['date'] = date('Y-m-d');
            }
            
            // Validar imagen
            if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
                echo json_encode(['success' => false, 'error' => 'La imagen es obligatoria']);
                exit;
            }
            
            // Procesar la imagen
            $uploadDir = __DIR__ . '/../frontend/public/images/blog/';
            
            if (!file_exists($uploadDir)) {
                if (!mkdir($uploadDir, 0777, true)) {
                    echo json_encode(['success' => false, 'error' => 'Error al crear el directorio de uploads']);
                    exit;
                }
            }
            
            $fileExtension = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
            $filename = uniqid() . '.' . $fileExtension;
            $targetFile = $uploadDir . $filename;
            
            if (move_uploaded_file($_FILES['image']['tmp_name'], $targetFile)) {
                $imageUrl = $filename;
                
                // Insertar en la base de datos
                $title = trim($_POST['title']);
                $category = trim($_POST['category']);
                $excerpt = trim($_POST['excerpt']);
                $date = trim($_POST['date']);
                
                $stmt = $pdo->prepare("INSERT INTO articles (title, category, image, excerpt, date) VALUES (?, ?, ?, ?, ?)");
                $result = $stmt->execute([$title, $category, $imageUrl, $excerpt, $date]);
                
                if ($result) {
                    echo json_encode(['success' => true, 'message' => 'Artículo creado correctamente']);
                } else {
                    echo json_encode(['success' => false, 'error' => 'Error al insertar en la base de datos']);
                }
            } else {
                echo json_encode(['success' => false, 'error' => 'Error al subir la imagen']);
            }
        }
    }
    // DELETE: Eliminar un artículo
    else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            echo json_encode(['success' => false, 'error' => 'ID del artículo no proporcionado']);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM articles WHERE id = ?");
        $stmt->execute([$id]);

        echo json_encode(['success' => true, 'message' => 'Artículo eliminado correctamente']);
    } 
    // Other methods not allowed
    else {
        echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Error en la base de datos: ' . $e->getMessage()]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Error del servidor: ' . $e->getMessage()]);
}
?>
