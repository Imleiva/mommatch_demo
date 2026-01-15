import React from "react";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

// Componente de inicio de sesión simplificado para la versión demo
function Login() {
  const { login } = useAuth();

  // Maneja el envío del formulario - en demo simplemente carga la usuaria demo
  const handleSubmit = async (e) => {
    e.preventDefault();

    // En la demo, cargar directamente la usuaria demo "Ana"
    login({
      email: "ana@example.com",
      password: "demo123",
    });
  };

  return (
    <div className="mommatch-login-page">
      <div className="mommatch-login-container">
        <h2>Iniciar Sesión</h2>

        <form onSubmit={handleSubmit}>
          <div className="mommatch-login-form-group">
            <p
              style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}
            >
              Versión Demo - Ana (ana@example.com)
            </p>
            <input
              type="text"
              value="ana@example.com"
              readOnly
              className="mommatch-login-input"
              style={{ marginBottom: "10px" }}
            />
            <input
              type="password"
              value="demo123"
              readOnly
              className="mommatch-login-input"
            />
          </div>

          <button type="submit" className="mommatch-login-button">
            Iniciar Sesión
          </button>
        </form>

        <a
          href="/register"
          className="mommatch-login-link"
          style={{ marginTop: "20px" }}
        >
          ¿No tienes cuenta? Regístrate aquí
        </a>

        <div style={{ marginTop: "16px" }}>
          <a href="/admin/login" className="mommatch-login-admin-link">
            ¿Eres administrador? Accede aquí
          </a>
        </div>
      </div>
    </div>
  );
}

export default Login;
