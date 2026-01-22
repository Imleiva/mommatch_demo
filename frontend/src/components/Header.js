import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Header.css";

// Este componente es la barra de navegación principal de la aplicación.
// Incluye el logo, enlaces de navegación y opciones de autenticación
//--
// Lo más interesante fue implementar la lógica para mostrar diferentes
// opciones según si la usuaria ha iniciado sesión o no. También añadí
// una verificación para ocultar completamente el header en las rutas de
// administración, que tienen su propio sistema de navegación
//--
// El mensaje de bienvenida personalizado es un pequeño detalle
// que mejora la experiencia de la usuaria

function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Ocultar el header en rutas de administración
  if (location.pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="mommatch-header">
      <div className="mommatch-header__top-row">
        <div className="mommatch-header__logo-container">
          <Link to="/" className="mommatch-header__logo-link">
            <img
              src={`${process.env.PUBLIC_URL}/assets/Logo.png`}
              alt="Logo"
              className="mommatch-header__logo"
            />
            <h1 className="mommatch-header__app-name">MomMatch</h1>
          </Link>
        </div>

        {user && (
          <button onClick={logout} className="mommatch-header__logout-button-top">
            Cerrar sesión
          </button>
        )}
      </div>

      <nav className="mommatch-header__nav-menu">
        <ul>
          <li>
            <Link to="/conocenos" className="mommatch-header__nav-link">
              Conócenos
            </Link>
          </li>
          <li>
            <Link to="/blog" className="mommatch-header__nav-link">
              Blog
            </Link>
          </li>
          <li>
            <Link to="/ayuda" className="mommatch-header__nav-link">
              Ayuda
            </Link>
          </li>
        </ul>

        {user ? (
          <div className="mommatch-header__auth-links">
            <ul>
              <li>
                <Link to="/perfil" className="mommatch-header__nav-link">
                  Mi Perfil
                </Link>
              </li>
              <li>
                <Link to="/matches" className="mommatch-header__nav-link">
                  Matches
                </Link>
              </li>
              <li>
                <Link to="/comunidad" className="mommatch-header__nav-link">
                  Comunidad
                </Link>
              </li>
            </ul>
            <span className="mommatch-header__welcome-message">
              ¡Hola, {user.name}!
            </span>
          </div>
        ) : (
          <div className="mommatch-header__auth-links">
            <Link to="/login" className="mommatch-header__login-link">
              Iniciar sesión
            </Link>
            <Link to="/register" className="mommatch-header__register-link">
              Registrarse
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}

export default Header;
