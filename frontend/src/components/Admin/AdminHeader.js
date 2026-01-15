import React from "react";
import { useAuth } from "../../context/AuthContext";

const AdminHeader = () => {
  const { logout } = useAuth();

  // Función para manejar el clic en "Volver al sitio principal"
  const handleMainSiteReturn = async (e) => {
    e.preventDefault(); // Prevenir la navegación predeterminada

    try {
      // Cerrar la sesión actual
      await logout();

      // Asegurar que las cookies se eliminen
      document.cookie =
        "MomMatchAdminSession=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      // Redirigir al homepage
      window.location.href = "/"; // Usar window.location para una recarga completa
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Redirigir de todos modos en caso de error
      window.location.href = "/";
    }
  };

  return (
    <header className="admin-header">
      <h1>Panel Administrativo</h1>
      <nav>
        <a
          className="admin-back-link"
          href="/"
          data-discover="true"
          onClick={handleMainSiteReturn}
        >
          Volver al sitio principal
        </a>
      </nav>
    </header>
  );
};

export default AdminHeader;
