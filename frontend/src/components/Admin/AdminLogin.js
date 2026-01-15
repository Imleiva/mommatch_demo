import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./AdminLogin.css";

// Este componente maneja el inicio de sesión del panel de admin
// Lo programé separado del login normal para tener una capa extra de seguridad
// y que solo administradores puedan acceder a esta parte de la aplicación.

const BACKEND_URL = "http://localhost/mommatch/backend";

const AdminLogin = () => {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser, setIsAuthenticated, logout } = useAuth(); // Añadimos logout

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/admin_login.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success) {
        sessionStorage.setItem("isAdminLoggedIn", "true");
        // Actualiza el estado global de autenticación
        if (setUser) setUser(data.user);
        if (setIsAuthenticated) setIsAuthenticated(true);
        navigate("/admin/dashboard");
      } else {
        setError(
          data.error === "Credenciales inválidas"
            ? "El correo o la contraseña no son correctos."
            : data.error || "Credenciales incorrectas"
        );
      }
    } catch (err) {
      console.error("Error en el inicio de sesión:", err);
      setError("Error de conexión. Inténtalo de nuevo más tarde.");
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar el clic en "Volver al sitio principal"
  const handleMainSiteReturn = async (e) => {
    e.preventDefault(); // Prevenir la navegación predeterminada

    try {
      // Cerrar cualquier sesión activa
      if (logout) {
        await logout();
      } else {
        // Limpieza manual si logout no está disponible
        setUser && setUser(null);
        setIsAuthenticated && setIsAuthenticated(false);
        sessionStorage.removeItem("isAdminLoggedIn");
      }

      // Asegurar que las cookies se eliminen
      document.cookie =
        "MomMatchAdminSession=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      // Vuelta al homepage
      window.location.href = "/"; // Usar window.location para recarga completa
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Redirigir de todos modos en caso de error
      window.location.href = "/";
    }
  };

  return (
    <div className="admin-login-container">
      {/* Ocultamos el header global */}
      <div className="admin-login-box">
        <div className="admin-login-header">
          <h1>MomMatch</h1>
          <h2>Panel de Administración</h2>
        </div>

        {error && <div className="admin-login-error">{error}</div>}

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              type="email"
              id="email"
              name="email"
              value={credentials.email}
              onChange={handleChange}
              required
              autoComplete="email"
              placeholder="admin@example.com"
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="admin-login-button"
            disabled={loading}
          >
            {loading ? "Cargando..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className="admin-login-footer">
          <p>Acceso exclusivo para administradores</p>
          <a
            href="/"
            className="admin-back-link"
            onClick={handleMainSiteReturn}
          >
            Volver al sitio principal
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
