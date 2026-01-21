import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

// Este componente controla el acceso a rutas protegidas que requieren autenticación
// Verifica si el usuario está autenticado y en caso contrario lo redirige al login
// También muestra un spinner mientras se verifica el estado de autenticación
// El componente recibe los hijos (children) que representan la ruta protegida
// y los renderiza solo si el usuario está autenticado

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  console.log("ProtectedRoute - isAuthenticated:", isAuthenticated);
  console.log("ProtectedRoute - isLoading:", isLoading);

  if (isLoading) {
    return (
      <div className="spinner-container">
        <LoadingSpinner text="Cargando..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log("Redirigiendo a /login debido a falta de autenticación");
    return (
      <Navigate
        to="/login"
        state={{
          from: location,
          message: "Por favor inicia sesión para acceder a esta página",
        }}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
