<?php
/**
 * Herramienta de diagnóstico de sesiones
 * 
 * Este script proporciona una interfaz para diagnosticar y resolver problemas
 * comunes relacionados con sesiones y autenticación. Fue creado después de
 * enfrentar problemas recurrentes con sesiones que expiraban de golpe
 * o no se compartían correctamente entre subdominios
 */

// Habilitar todos los errores para diagnóstico
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Requerir archivos necesarios de MomMatch
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cors.php';

// Iniciar la sesión con los mismos parámetros que la aplicación principal
session_start([
    'name' => 'MomMatchSession',
    'cookie_httponly' => true,
    'cookie_secure' => false, 
    'cookie_samesite' => 'Lax',
]);

// Función para mostrar un valor como string con formato seguro
function formatValue($value) {
    if ($value === null) return 'NULL';
    if (is_bool($value)) return $value ? 'true' : 'false';
    if (is_array($value) || is_object($value)) return htmlspecialchars(json_encode($value));
    return htmlspecialchars((string)$value);
}

// Función para ejecutar tests de base de datos
function runDatabaseTests() {
    $results = [
        'connection' => false,
        'users_table' => false,
        'tables' => [],
        'error' => null
    ];
    
    try {
        $pdo = getDatabaseConnection();
        $results['connection'] = true;
        
        // Verificar tabla de usuarios
        $stmt = $pdo->query("SHOW TABLES LIKE 'users'");
        $results['users_table'] = $stmt->rowCount() > 0;
        
        // Obtener todas las tablas
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $results['tables'] = $tables;
        
        // Verificar estructura de la tabla users
        if ($results['users_table']) {
            $stmt = $pdo->query("DESCRIBE users");
            $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $results['user_columns'] = $columns;
            
            // Contar usuarios
            $stmt = $pdo->query("SELECT COUNT(*) FROM users");
            $results['user_count'] = $stmt->fetchColumn();
        }
    } catch (Exception $e) {
        $results['error'] = $e->getMessage();
    }
    
    return $results;
}

// Función para ejecutar diagnóstico de sesión
function runSessionTests() {
    $results = [
        'session_active' => session_status() === PHP_SESSION_ACTIVE,
        'session_id' => session_id(),
        'session_name' => session_name(),
        'session_cookie_params' => session_get_cookie_params(),
        'session_save_path' => session_save_path(),
        'session_data' => $_SESSION,
        'cookie_exists' => isset($_COOKIE[session_name()]),
    ];
    
    // Verificar permisos del directorio de sesiones
    $sessionPath = session_save_path();
    if (!empty($sessionPath)) {
        $results['session_dir_exists'] = is_dir($sessionPath);
        if ($results['session_dir_exists']) {
            $results['session_dir_writable'] = is_writable($sessionPath);
            $results['session_dir_permissions'] = substr(sprintf('%o', fileperms($sessionPath)), -4);
        }
    }
    
    return $results;
}

// Función para comprobar estado del usuario
function checkUserStatus() {
    $results = [
        'logged_in' => false,
        'user_id' => null,
        'user_data' => null,
        'error' => null,
        'diagnosis' => []
    ];
    
    // Comprobar si hay sesión activa de usuario
    if (isset($_SESSION['user_id'])) {
        $results['logged_in'] = true;
        $results['user_id'] = $_SESSION['user_id'];
        
        // Intentar obtener datos del usuario desde la base de datos
        try {
            $pdo = getDatabaseConnection();
            
            // Buscar el usuario específicamente por ID para diagnóstico
            $directQuery = "SELECT * FROM users WHERE id = " . (int)$_SESSION['user_id'];
            $results['diagnosis']['direct_query'] = $directQuery;
            $directResult = $pdo->query($directQuery)->fetchAll(PDO::FETCH_ASSOC);
            $results['diagnosis']['direct_result'] = $directResult;
            
            // Prueba alternativa usando técnica diferente para verificar si el usuario existe
            $checkQuery = "SELECT COUNT(*) FROM users WHERE id = " . (int)$_SESSION['user_id'];
            $results['diagnosis']['check_query'] = $checkQuery;
            $userExists = $pdo->query($checkQuery)->fetchColumn() > 0;
            $results['diagnosis']['user_exists'] = $userExists;
            
            // Intentar buscar por otros criterios si conocemos el email
            if (!empty($_SESSION['email'])) {
                $emailQuery = "SELECT * FROM users WHERE email = " . $pdo->quote($_SESSION['email']);
                $results['diagnosis']['email_query'] = $emailQuery;
                $emailResult = $pdo->query($emailQuery)->fetchAll(PDO::FETCH_ASSOC);
                $results['diagnosis']['email_result'] = $emailResult;
            }
            
            // Ejecutar la consulta con seguridad - MODIFICADO para usar columnas que existen
            $stmt = $pdo->prepare("SELECT id, name, email, last_active, created_at, updated_at, profile_completed FROM users WHERE id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            $userData = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($userData) {
                $results['user_data'] = $userData;
            } else {
                $results['error'] = "Usuario en sesión no encontrado en la base de datos";
                
                // Verificar la estructura de la tabla users
                try {
                    $structureQuery = "DESCRIBE users";
                    $usersStructure = $pdo->query($structureQuery)->fetchAll(PDO::FETCH_ASSOC);
                    $results['diagnosis']['users_structure'] = $usersStructure;
                    
                    // Buscar a ver si el usuario tiene un formato especial o hay algo raro en la tabla
                    $sampleQuery = "SELECT * FROM users WHERE id <= 30 ORDER BY id";
                    $results['diagnosis']['sample_query'] = $sampleQuery;
                    $sampleUsers = $pdo->query($sampleQuery)->fetchAll(PDO::FETCH_ASSOC);
                    $results['diagnosis']['sample_users'] = $sampleUsers;
                    
                    // Ver si hay algún problema con el tipo de datos del ID
                    $typeCheckQuery = "SELECT id FROM users WHERE id = '" . (int)$_SESSION['user_id'] . "'";
                    $results['diagnosis']['type_check_query'] = $typeCheckQuery;
                    $typeCheckResult = $pdo->query($typeCheckQuery)->fetchAll(PDO::FETCH_ASSOC);
                    $results['diagnosis']['type_check_result'] = $typeCheckResult;
                    
                    // Comprobar si hay algún problema con la codificación
                    $encodingQuery = "SHOW VARIABLES LIKE 'character_set%'";
                    $results['diagnosis']['encoding_check'] = $pdo->query($encodingQuery)->fetchAll(PDO::FETCH_ASSOC);
                } catch (Exception $e) {
                    $results['diagnosis']['structure_error'] = $e->getMessage();
                }
                
                // Si existe el usuario según la verificación alternativa pero no se obtienen los datos
                if ($userExists) {
                    $results['diagnosis']['conclusion'] = "El usuario existe en la base de datos (ID: {$_SESSION['user_id']}), pero la consulta preparada no devuelve resultados, lo que podría indicar un problema de tipos de datos o codificación.";
                    
                    // Verificar los datos crudos
                    $rawUserData = $pdo->query("SELECT * FROM users WHERE id = " . (int)$_SESSION['user_id'])->fetch(PDO::FETCH_ASSOC);
                    $results['diagnosis']['raw_user_data'] = $rawUserData;
                }
            }
        } catch (Exception $e) {
            $results['error'] = $e->getMessage();
            $results['diagnosis']['exception'] = [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ];
        }
    }
    
    return $results;
}

// Ejecutar acciones según se solicite
$action = $_POST['action'] ?? '';
$message = '';

if ($action === 'set_test_session') {
    $_SESSION['test_value'] = 'TEST_' . time();
    $message = "Valor de prueba establecido en la sesión: " . $_SESSION['test_value'];
}
else if ($action === 'clear_session') {
    session_unset();
    session_destroy();
    setcookie("MomMatchSession", "", time() - 3600, "/");
    $message = "Sesión eliminada. Recargando...";
    header("Refresh: 1"); // Recargar después de 1 segundo
}
else if ($action === 'test_login') {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    
    try {
        $pdo = getDatabaseConnection();
        $stmt = $pdo->prepare("SELECT id, email, password FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['email'] = $user['email'];
            $message = "Login exitoso con ID: " . $user['id'];
        } else {
            $message = "Error de login: Credenciales inválidas";
        }
    } catch (Exception $e) {
        $message = "Error de login: " . $e->getMessage();
    }
}
else if ($action === 'fix_db_connection') {
    // No implementado - requeriría cambiar configuración
    $message = "Esta acción requiere edición manual del archivo db.php";
}
else if ($action === 'create_test_user') {
    $testEmail = 'test_' . time() . '@mommatch.test';
    $testPassword = password_hash('test123', PASSWORD_DEFAULT);
    
    try {
        $pdo = getDatabaseConnection();
        $stmt = $pdo->prepare("INSERT INTO users (email, password, name, role, created_at) VALUES (?, ?, ?, ?, NOW())");
        $result = $stmt->execute([$testEmail, $testPassword, 'Usuario de Prueba', 'user']);
        
        if ($result) {
            $userId = $pdo->lastInsertId();
            $message = "Usuario de prueba creado. Email: $testEmail, Contraseña: test123, ID: $userId";
        } else {
            $message = "Error al crear usuario de prueba";
        }
    } catch (Exception $e) {
        $message = "Error al crear usuario: " . $e->getMessage();
    }
}

// Ejecutar diagnósticos
$dbTests = runDatabaseTests();
$sessionTests = runSessionTests();
$userStatus = checkUserStatus();

// Obtener encabezados HTTP para diagnóstico
$headers = getallheaders();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Diagnóstico de Sesión - MomMatch</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            color: #9c27b0;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
        }
        h2 {
            color: #6a1b9a;
            margin-top: 30px;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
        }
        .card {
            background: #fff;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            padding: 15px;
            margin-bottom: 20px;
        }
        .success {
            color: #2e7d32;
            font-weight: bold;
        }
        .error {
            color: #c62828;
            font-weight: bold;
        }
        .warning {
            color: #f57c00;
            font-weight: bold;
        }
        code {
            background: #f5f5f5;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: monospace;
            font-size: 0.9em;
        }
        pre {
            background: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 0.9em;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        th, td {
            text-align: left;
            padding: 8px 12px;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f5f5f5;
        }
        button, input[type="submit"] {
            background: #9c27b0;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 10px;
            margin-bottom: 10px;
        }
        button:hover, input[type="submit"]:hover {
            background: #7b1fa2;
        }
        input[type="text"], input[type="password"], input[type="email"] {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            min-width: 250px;
            margin-bottom: 10px;
        }
        .message {
            padding: 10px 15px;
            background: #e8f5e9;
            border-left: 4px solid #2e7d32;
            margin-bottom: 20px;
        }
        .message.error {
            background: #ffebee;
            border-left-color: #c62828;
            color: #c62828;
        }
        .action-buttons {
            margin: 20px 0;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        .tabbed {
            display: flex;
            border-bottom: 1px solid #ddd;
        }
        .tab {
            padding: 10px 15px;
            cursor: pointer;
            border: 1px solid transparent;
        }
        .tab.active {
            border: 1px solid #ddd;
            border-bottom-color: white;
            border-radius: 4px 4px 0 0;
            margin-bottom: -1px;
            font-weight: bold;
        }
        .tab-content {
            display: none;
            padding: 15px 0;
        }
        .tab-content.active {
            display: block;
        }
    </style>
</head>
<body>
    <h1>Diagnóstico de Sesión - MomMatch</h1>
    
    <?php if (!empty($message)): ?>
    <div class="message <?php echo strpos($message, 'Error') !== false ? 'error' : ''; ?>">
        <?php echo $message; ?>
    </div>
    <?php endif; ?>
    
    <div class="card">
        <h2>Resumen de Estado</h2>
        <table>
            <tr>
                <th width="30%">Componente</th>
                <th width="20%">Estado</th>
                <th>Detalle</th>
            </tr>
            <tr>
                <td>Conexión a base de datos</td>
                <td>
                    <?php if ($dbTests['connection']): ?>
                    <span class="success">✓ Conectado</span>
                    <?php else: ?>
                    <span class="error">✗ Error</span>
                    <?php endif; ?>
                </td>
                <td>
                    <?php if ($dbTests['error']): ?>
                    <span class="error"><?php echo $dbTests['error']; ?></span>
                    <?php else: ?>
                    Conexión establecida correctamente
                    <?php endif; ?>
                </td>
            </tr>
            <tr>
                <td>Sesión PHP</td>
                <td>
                    <?php if ($sessionTests['session_active']): ?>
                    <span class="success">✓ Activa</span>
                    <?php else: ?>
                    <span class="error">✗ Inactiva</span>
                    <?php endif; ?>
                </td>
                <td>
                    ID: <code><?php echo $sessionTests['session_id'] ?: 'N/A'; ?></code><br>
                    Cookie: <?php echo $sessionTests['cookie_exists'] ? '<span class="success">Presente</span>' : '<span class="error">No presente</span>'; ?>
                </td>
            </tr>
            <tr>
                <td>Usuario actual</td>
                <td>
                    <?php if ($userStatus['logged_in']): ?>
                    <span class="success">✓ Autenticado</span>
                    <?php else: ?>
                    <span class="warning">⚠ No autenticado</span>
                    <?php endif; ?>
                </td>
                <td>
                    <?php if ($userStatus['logged_in']): ?>
                    ID: <code><?php echo $userStatus['user_id']; ?></code><br>
                    <?php if ($userStatus['user_data']): ?>
                    Usuario: <strong><?php echo htmlspecialchars($userStatus['user_data']['name']); ?></strong><br>
                    Email: <?php echo htmlspecialchars($userStatus['user_data']['email']); ?>
                    <?php else: ?>
                    <span class="error">Usuario en sesión no encontrado en la base de datos</span>
                    <h3>Diagnóstico adicional</h3>
                    <pre><?php print_r($userStatus['diagnosis']); ?></pre>
                    <?php endif; ?>
                    <?php else: ?>
                    No hay sesión activa
                    <?php endif; ?>
                </td>
            </tr>
        </table>
    </div>
    
    <div class="card">
        <h2>Acciones de Diagnóstico</h2>
        <div class="action-buttons">
            <form method="post">
                <input type="hidden" name="action" value="set_test_session">
                <button type="submit">Probar Escritura en Sesión</button>
            </form>
            
            <form method="post">
                <input type="hidden" name="action" value="clear_session">
                <button type="submit">Borrar Sesión Actual</button>
            </form>
            
            <form method="post">
                <input type="hidden" name="action" value="create_test_user">
                <button type="submit">Crear Usuario de Prueba</button>
            </form>
        </div>
        
        <h3>Probar Login</h3>
        <form method="post">
            <input type="hidden" name="action" value="test_login">
            <div>
                <label for="email">Email:</label><br>
                <input type="email" name="email" id="email" placeholder="usuario@ejemplo.com" required>
            </div>
            <div>
                <label for="password">Contraseña:</label><br>
                <input type="password" name="password" id="password" required>
            </div>
            <button type="submit">Probar Login</button>
        </form>
    </div>
    
    <div class="tabbed">
        <div class="tab active" data-tab="session">Sesión</div>
        <div class="tab" data-tab="database">Base de Datos</div>
        <div class="tab" data-tab="cookies">Cookies</div>
        <div class="tab" data-tab="headers">Encabezados HTTP</div>
    </div>
    
    <div class="tab-content active" id="session-tab">
        <div class="card">
            <h2>Detalles de Sesión</h2>
            
            <h3>Parámetros de Sesión</h3>
            <table>
                <tr>
                    <th>Parámetro</th>
                    <th>Valor</th>
                </tr>
                <tr>
                    <td>Estado de sesión</td>
                    <td><?php echo $sessionTests['session_active'] ? 'Activa' : 'Inactiva'; ?></td>
                </tr>
                <tr>
                    <td>ID de sesión</td>
                    <td><code><?php echo $sessionTests['session_id'] ?: 'N/A'; ?></code></td>
                </tr>
                <tr>
                    <td>Nombre de sesión</td>
                    <td><code><?php echo $sessionTests['session_name']; ?></code></td>
                </tr>
                <tr>
                    <td>Ruta de guardado</td>
                    <td><code><?php echo $sessionTests['session_save_path']; ?></code></td>
                </tr>
                <tr>
                    <td>Existe directorio de sesiones</td>
                    <td>
                        <?php if (isset($sessionTests['session_dir_exists'])): ?>
                            <?php echo $sessionTests['session_dir_exists'] ? '<span class="success">Sí</span>' : '<span class="error">No</span>'; ?>
                        <?php else: ?>
                            <span class="warning">No verificado</span>
                        <?php endif; ?>
                    </td>
                </tr>
                <tr>
                    <td>Permisos de escritura</td>
                    <td>
                        <?php if (isset($sessionTests['session_dir_writable'])): ?>
                            <?php echo $sessionTests['session_dir_writable'] ? '<span class="success">Sí</span>' : '<span class="error">No</span>'; ?>
                        <?php else: ?>
                            <span class="warning">No verificado</span>
                        <?php endif; ?>
                    </td>
                </tr>
                <tr>
                    <td>Cookie configurada</td>
                    <td>
                        <?php echo $sessionTests['cookie_exists'] ? '<span class="success">Sí</span>' : '<span class="error">No</span>'; ?>
                    </td>
                </tr>
            </table>
            
            <h3>Parámetros de la Cookie</h3>
            <pre><?php print_r($sessionTests['session_cookie_params']); ?></pre>
            
            <h3>Datos en $_SESSION</h3>
            <pre><?php print_r($sessionTests['session_data']); ?></pre>
        </div>
    </div>
    
    <div class="tab-content" id="database-tab">
        <div class="card">
            <h2>Diagnóstico de Base de Datos</h2>
            
            <?php if ($dbTests['connection']): ?>
                <p class="success">✓ Conexión a la base de datos establecida correctamente</p>
                
                <h3>Tablas encontradas (<?php echo count($dbTests['tables']); ?>)</h3>
                <ul>
                    <?php foreach ($dbTests['tables'] as $table): ?>
                        <li><?php echo $table; ?></li>
                    <?php endforeach; ?>
                </ul>
                
                <?php if ($dbTests['users_table']): ?>
                    <h3>Tabla 'users' (<?php echo $dbTests['user_count']; ?> usuarios)</h3>
                    <table>
                        <tr>
                            <th>Campo</th>
                            <th>Tipo</th>
                            <th>Nulo</th>
                            <th>Clave</th>
                            <th>Predeterminado</th>
                            <th>Extra</th>
                        </tr>
                        <?php foreach ($dbTests['user_columns'] as $column): ?>
                            <tr>
                                <td><?php echo $column['Field']; ?></td>
                                <td><?php echo $column['Type']; ?></td>
                                <td><?php echo $column['Null']; ?></td>
                                <td><?php echo $column['Key']; ?></td>
                                <td><?php echo $column['Default']; ?></td>
                                <td><?php echo $column['Extra']; ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </table>
                <?php else: ?>
                    <p class="error">✗ La tabla 'users' no existe</p>
                <?php endif; ?>
                
            <?php else: ?>
                <p class="error">✗ Error al conectar con la base de datos</p>
                <p><?php echo $dbTests['error']; ?></p>
            <?php endif; ?>
        </div>
    </div>
    
    <div class="tab-content" id="cookies-tab">
        <div class="card">
            <h2>Cookies Recibidas</h2>
            
            <?php if (empty($_COOKIE)): ?>
                <p class="error">✗ No se recibieron cookies</p>
            <?php else: ?>
                <table>
                    <tr>
                        <th>Nombre</th>
                        <th>Valor</th>
                    </tr>
                    <?php foreach ($_COOKIE as $name => $value): ?>
                        <tr>
                            <td><?php echo htmlspecialchars($name); ?></td>
                            <td><code><?php echo htmlspecialchars(substr($value, 0, 50)) . (strlen($value) > 50 ? '...' : ''); ?></code></td>
                        </tr>
                    <?php endforeach; ?>
                </table>
            <?php endif; ?>
            
            <h3>Test de cookie</h3>
            <button onclick="document.cookie='TestCookie=TestValue; path=/'; alert('Cookie de prueba creada. Recargue la página para verificar.'); location.reload();">Crear cookie de prueba</button>
        </div>
    </div>
    
    <div class="tab-content" id="headers-tab">
        <div class="card">
            <h2>Encabezados HTTP</h2>
            
            <table>
                <tr>
                    <th>Encabezado</th>
                    <th>Valor</th>
                </tr>
                <?php foreach ($headers as $name => $value): ?>
                    <tr>
                        <td><?php echo htmlspecialchars($name); ?></td>
                        <td><code><?php echo htmlspecialchars($value); ?></code></td>
                    </tr>
                <?php endforeach; ?>
            </table>
        </div>
    </div>
    
    <div class="card">
        <h2>Recomendaciones</h2>
        <ul>
            <?php if (!$sessionTests['session_active']): ?>
                <li class="error">Las sesiones no están funcionando correctamente. Verifica la configuración de PHP.</li>
            <?php endif; ?>
            
            <?php if (!$sessionTests['cookie_exists']): ?>
                <li class="error">La cookie de sesión no está presente. Verifica la configuración de cookies en PHP y en el navegador.</li>
            <?php endif; ?>
            
            <?php if (!$dbTests['connection']): ?>
                <li class="error">No se pudo conectar a la base de datos. Verifica los parámetros de conexión en db.php.</li>
            <?php endif; ?>
            
            <?php if ($dbTests['connection'] && !$dbTests['users_table']): ?>
                <li class="error">La tabla 'users' no existe. Es necesaria para el funcionamiento del login.</li>
            <?php endif; ?>
            
            <?php if ($userStatus['logged_in'] && !$userStatus['user_data']): ?>
                <li class="error">Hay un ID de usuario en la sesión pero no se encontró en la base de datos. La sesión podría estar corrupta.</li>
            <?php endif; ?>
            
            <?php if (isset($sessionTests['session_dir_writable']) && !$sessionTests['session_dir_writable']): ?>
                <li class="error">El directorio de sesiones no tiene permisos de escritura. PHP no puede guardar datos de sesión.</li>
            <?php endif; ?>
        </ul>
    </div>
    
    <script>
        // Código para cambiar entre pestañas
        document.addEventListener('DOMContentLoaded', function() {
            const tabs = document.querySelectorAll('.tab');
            
            tabs.forEach(tab => {
                tab.addEventListener('click', function() {
                    // Desactivar todas las pestañas
                    tabs.forEach(t => t.classList.remove('active'));
                    
                    // Desactivar todos los contenidos
                    const contents = document.querySelectorAll('.tab-content');
                    contents.forEach(c => c.classList.remove('active'));
                    
                    // Activar la pestaña actual
                    this.classList.add('active');
                    
                    // Activar el contenido correspondiente
                    const tabName = this.getAttribute('data-tab');
                    document.getElementById(tabName + '-tab').classList.add('active');
                });
            });
        });
    </script>
</body>
</html>
