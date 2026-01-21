import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useNavigate } from "react-router-dom";

// Este contexto implementa todo el sistema de autenticación de la aplicación
// Gestiona el inicio de sesión, cierre de sesión, verificación de sesión
// y mantiene la información del usuario logueado disponible globalmente
//--
// El mayor desafío fue la verificación periódica de sesión para mantenerla
// activa sin interrumpir la experiencia del usuario

const AuthContext = createContext();

// Proveedor del contexto de autenticación
//  Envuelve la aplicación y proporciona funciones y estados de autenticación a todos los hijos
export const AuthProvider = ({ children }) => {
  // Estados para gestionar la autenticación
  const [user, setUser] = useState(null); // Datos del usuario autenticado
  const [isLoading, setIsLoading] = useState(true); // Estado de carga
  const [error, setError] = useState(null); // Mensajes de error
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Estado de autenticación
  const [sessionChecked, setSessionChecked] = useState(false); // Estado para controlar si ya se verificó la sesión

  // Hooks de navegación de React Router
  const navigate = useNavigate();

  // Verifica si existe una sesion activa en el servidor
  //  @returns {Promise<boolean>} - true si la sesión es válida, false si no

  const verifySession = useCallback(async (isInitialCheck = false) => {
    // En la versión demo, siempre cargar la usuaria demo
    if (isInitialCheck) {
      const demoUser = {
        id: 1,
        name: "Ana",
        email: "ana@example.com",
        profile_completed: 1,
        last_active: "2025-06-10T01:53:09",
        created_at: "2025-04-07T16:07:42",
        updated_at: "2025-06-10T01:53:09",
        photo: "/mommatch_demo/images/profiles/ana.jpg",
      };
      setUser(demoUser);
      setIsAuthenticated(true);
      setSessionChecked(true);
      setIsLoading(false);
      console.log("Usuaria demo cargada en verificación de sesión");
    }
    return true;
  }, []);

  //Inicia sesión con credenciales de usuario
  // @param {Object} credentials - Credenciales del usuario (email y password)
  // @returns {Promise<Object>} - Datos del usuario autenticado
  // @throws {Error} - Error en caso de fallo en la autenticación

  const login = async (credentials) => {
    try {
      setIsLoading(true);
      setError(null);

      // En la versión demo, siempre cargar la usuaria demo sin validaciones
      const demoUser = {
        id: 1,
        name: "Ana",
        email: "ana@example.com",
        profile_completed: 1,
        last_active: "2025-06-10T01:53:09",
        created_at: "2025-04-07T16:07:42",
        updated_at: "2025-06-10T01:53:09",
        photo: "/mommatch_demo/images/profiles/ana.jpg",
      };

      setUser(demoUser);
      setIsAuthenticated(true);
      setSessionChecked(true);
      setIsLoading(false);
      navigate("/perfil");
      console.log("Sesión de demo iniciada con la usuaria Ana");
      return { user: demoUser };
    } catch (error) {
      setError(error.message);
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      throw error;
    }
  };

  // Cierra la sesión del usuario actua
  //  Realiza una petición al servidor para invalidar la sesión y limpia el estado local

  const logout = async () => {
    // En la versión demo, simplemente limpiar el estado local
    setUser(null);
    setIsAuthenticated(false);
    setSessionChecked(true);
    console.log("Sesión de demo cerrada");
    navigate("/login");
  };

  // Efecto para verificar la sesión al cargar la aplicación
  useEffect(() => {
    const checkAuth = async () => {
      await verifySession(true);
    };

    if (!sessionChecked) {
      checkAuth();
    }
  }, [verifySession, sessionChecked]);

  // Proveedor del contexto con todos los valores y funciones necesarios
  return (
    <AuthContext.Provider
      value={{
        user, // Datos del usuario actual
        isAuthenticated, // Estado de autenticación
        isLoading, // Indicador de carga
        error, // Mensajes de error
        login, // Función para iniciar sesión
        logout, // Función para cerrar sesión
        verifySession, // Función para verificar sesión
        sessionChecked, // Nuevo estado para controlar si ya se verificó la sesión
        setUser,
        setIsAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

//Hook personalizado para acceder al contexto de autenticación desde cualquier componente
// @returns {Object} - El contexto de autenticación con todos sus valores y funciones
//@throws {Error} - Si se usa fuera de un AuthProvider

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
};
