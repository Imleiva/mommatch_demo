import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Register.css";
import "../styles/animated-backgrounds.css"; // Importamos los estilos animados
import LoadingSpinner from "../components/LoadingSpinner";
import CustomAutocomplete from "./CustomAutocomplete"; // Importar el nuevo componente

// Este componente gestiona el registro de nuevas usuarias
// Incluye un formulario para capturar los datos básicos
// Valida el email y la contraseña, muestra mensajes de error y
// calcula la seguridad de la contraseña ingresada

const Register = () => {
  const validateEmail = (email) => {
    const re =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };

  const validatePassword = (password) => {
    // Requiere mínimo 8 caracteres, una mayúscula y un carácter especial
    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,}$/;
    return passwordRegex.test(password);
  };

  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: "Vacío" };

    let score = 0;

    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) return { score: 1, label: "Débil" };
    if (score <= 4) return { score: 2, label: "Media" };
    return { score: 3, label: "Fuerte" };
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [formErrors, setFormErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: "Vacío",
  });

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    let error = "";

    if (name === "email" && value) {
      if (!validateEmail(value)) {
        error = "Por favor, introduce un email válido";
      }
    }

    if (name === "password") {
      const strength = getPasswordStrength(value);
      setPasswordStrength(strength);

      if (value && !validatePassword(value)) {
        error =
          "La contraseña debe tener al menos 8 caracteres, una mayúscula y un carácter especial";
      }

      if (formData.confirmPassword && value !== formData.confirmPassword) {
        setFormErrors((prev) => ({
          ...prev,
          confirmPassword: "Las contraseñas no coinciden",
        }));
      } else if (formData.confirmPassword) {
        setFormErrors((prev) => ({
          ...prev,
          confirmPassword: "",
        }));
      }
    }

    if (name === "confirmPassword" && value) {
      if (value !== formData.password) {
        error = "Las contraseñas no coinciden";
      }
    }

    setFormErrors({
      ...formErrors,
      [name]: error,
    });
  };

  // Función para manejar el envío del formulario de registro.
  // Valida los datos ingresados y los envía al backend para crear una nueva cuenta.
  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {
      name: !formData.name ? "El nombre es obligatorio" : "",
      email: !formData.email
        ? "El email es obligatorio"
        : !validateEmail(formData.email)
        ? "Email no válido"
        : "",
      password: !formData.password
        ? "La contraseña es obligatoria"
        : !validatePassword(formData.password)
        ? "La contraseña no cumple los requisitos"
        : "",
      confirmPassword: !formData.confirmPassword
        ? "Confirma tu contraseña"
        : formData.password !== formData.confirmPassword
        ? "Las contraseñas no coinciden"
        : "",
    };

    setFormErrors(errors);

    const hasErrors = Object.values(errors).some((error) => error);
    if (hasErrors) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "http://localhost/mommatch/backend/register.php",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
          }),
        }
      );

      if (response.status === 409) {
        throw new Error("El email ya está registrado. Por favor, usa otro.");
      } else if (response.status === 400) {
        throw new Error("Todos los campos son obligatorios.");
      } else if (!response.ok) {
        throw new Error("Error en el servidor. Inténtalo más tarde.");
      }

      const data = await response.json();

      if (data.success === true) {
        await login({
          email: formData.email,
          password: formData.password,
        });
        navigate("/perfil/editar");
      } else {
        throw new Error("Error en la respuesta del servidor");
      }
    } catch (error) {
      setMessage(error.message);
      console.error("Error de registro:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Renderiza el formulario de registro con campos como nombre, email y contraseña.
  // Incluye mensajes de error en caso de validaciones fallidas.
  return (
    <div className="register-page">
      {/* Fondo con gradiente animado */}
      <div className="bg-gradient-animated"></div>

      <div className="mommatch-register-container">
        <h2>Crear Cuenta</h2>

        {message && (
          <div className="mommatch-register-message error">{message}</div>
        )}

        <form onSubmit={handleSubmit} className="mommatch-register-form">
          <div className="mommatch-register-form-grid">
            {/* Campo de nombre */}
            <div className="mommatch-register-form-group">
              <label htmlFor="name" className="mommatch-register-label">
                Nombre
              </label>
              <CustomAutocomplete
                inputProps={{
                  id: "name",
                  name: "name",
                  className: formErrors.name
                    ? "mommatch-register-input error"
                    : "mommatch-register-input",
                  onChange: handleChange,
                  value: formData.name,
                }}
                placeholder="Ingresa tu nombre"
                onSelect={(value) => {
                  setFormData({
                    ...formData,
                    name: value,
                  });
                  setFormErrors({
                    ...formErrors,
                    name: "",
                  });
                }}
              />
              {formErrors.name && (
                <span className="mommatch-register-error-message">
                  {formErrors.name}
                </span>
              )}
            </div>
            {/* Campo de email */}
            <div className="mommatch-register-form-group">
              <label htmlFor="email" className="mommatch-register-label">
                Email
              </label>
              <CustomAutocomplete
                suggestions={[
                  "example@gmail.com",
                  "info@domain.com",
                  "contact@example.com",
                ]}
                inputProps={{
                  id: "email",
                  name: "email",
                  className: formErrors.email
                    ? "mommatch-register-input error"
                    : "mommatch-register-input",
                  type: "email",
                  onChange: handleChange,
                  value: formData.email,
                }}
                placeholder="Ingresa tu email"
                onSelect={(value) => {
                  setFormData({
                    ...formData,
                    email: value,
                  });
                  if (!validateEmail(value)) {
                    setFormErrors({
                      ...formErrors,
                      email: "Por favor, introduce un email válido",
                    });
                  } else {
                    setFormErrors({
                      ...formErrors,
                      email: "",
                    });
                  }
                }}
              />
              {formErrors.email && (
                <span className="mommatch-register-error-message">
                  {formErrors.email}
                </span>
              )}
            </div>
            {/* Campo de contraseña */}
            <div className="mommatch-register-form-group mommatch-register-form-group-full">
              <label htmlFor="password" className="mommatch-register-label">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={
                  formErrors.password
                    ? "mommatch-register-input error"
                    : "mommatch-register-input"
                }
              />
              {formData.password && (
                <div className="mommatch-password-strength">
                  <div className="mommatch-strength-meter">
                    <div
                      className={`mommatch-strength-meter-fill strength-${passwordStrength.score}`}
                      style={{
                        width: `${(passwordStrength.score / 3) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <span
                    className={`mommatch-strength-text strength-${passwordStrength.score}`}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
              )}
              {formErrors.password && (
                <span className="mommatch-register-error-message">
                  {formErrors.password}
                </span>
              )}
              <small className="mommatch-password-hint">
                La contraseña debe tener al menos 8 caracteres, una mayúscula y
                un carácter especial.
              </small>
            </div>
            {/* Confirmar contraseña */}
            <div className="mommatch-register-form-group mommatch-register-form-group-full">
              <label
                htmlFor="confirmPassword"
                className="mommatch-register-label"
              >
                Confirmar Contraseña
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={
                  formErrors.confirmPassword
                    ? "mommatch-register-input error"
                    : "mommatch-register-input"
                }
              />
              {formErrors.confirmPassword && (
                <span className="mommatch-register-error-message">
                  {formErrors.confirmPassword}
                </span>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="mommatch-register-button"
          >
            {isLoading ? (
              <LoadingSpinner text="Registrando..." />
            ) : (
              "Registrarse"
            )}
          </button>
        </form>
        <a href="/login">¿Ya tienes una cuenta? Inicia sesión</a>
      </div>
    </div>
  );
};

export default Register;
