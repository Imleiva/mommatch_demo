import React, { useState } from "react";
import "./Ayuda.css";
import config from "../config";

// Componente para la sección de ayuda y soporte
// Incluye un formulario de contacto y preguntas frecuentes para resolver
// las dudas más comunes de las usuarias.
//--
// La validación del formulario fue interesante de implementar, sobre todo
// para dar feedback específico en cada campo. Estuve pensando si usar
// una librería de validación, pero al final lo hice manualmente
// teniendo más control sobre los mensajes de error
//--
// El manejo de estados de envío (cargando, éxito, error) me parece fundamental
// para una buena experiencia de usuario, así que añadí mensajes claros
// para cada situación

const Ayuda = () => {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    mensaje: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    if (errors[name]) setErrors({ ...errors, [name]: null });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = "Nombre requerido";
    if (!formData.email.trim()) {
      newErrors.email = "Email requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email no válido";
    }
    if (!formData.mensaje.trim()) newErrors.mensaje = "Mensaje requerido";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus(null);
    setMessage("");

    try {
      // En GitHub Pages, simular el envío sin hacer llamadas al backend
      if (config.useMocks) {
        // Simular delay de envío
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setSubmitStatus("success");
        setMessage(
          "Mensaje simulado correctamente. (Versión demo - datos no persistentes)"
        );
        setFormData({ nombre: "", email: "", mensaje: "" });
        return;
      }

      // En desarrollo, hacer llamada real al backend
      const response = await fetch(
        `${config.backendUrl}/ayuda_api.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(formData),
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setSubmitStatus("success");
        setMessage("Mensaje enviado correctamente. Gracias por contactarnos.");
        setFormData({ nombre: "", email: "", mensaje: "" });
      } else {
        setSubmitStatus("error");
        setMessage(data.message || "Error al enviar el mensaje");
      }
    } catch (error) {
      console.error("Error:", error);
      setSubmitStatus("error");
      setMessage("Error al conectar con el servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mommatch-help-container">
      <div className="mommatch-help-header">
        <h1>Centro de Ayuda</h1>
        <p className="mommatch-help-intro">
          Estamos aquí para ayudarte, encuentra respuestas a tus preguntas o
          contáctanos directamente
        </p>
      </div>

      {/* Nueva imagen de ayuda */}
      <div className="mommatch-help-image-container">
        <img
          src="/mommatch_demo/images/help/help.jpg"
          alt="Equipo de soporte MomMatch"
          className="mommatch-help-image"
        />
        <div className="mommatch-help-image-caption">
          Nuestro equipo está listo para asistirte en tu experiencia MomMatch
        </div>
      </div>

      <div className="mommatch-help-content">
        <section className="mommatch-help-faq">
          <h2>Preguntas Frecuentes</h2>
          <div className="mommatch-help-faq-list">
            <div className="mommatch-help-faq-item">
              <h3>¿Cómo me registro en la aplicación?</h3>
              <p>
                Para registrarte, ve a la página de registro y completa el
                formulario con tus datos.
              </p>
            </div>
            <div className="mommatch-help-faq-item">
              <h3>¿Cómo accedo a los Matches?</h3>
              <p>
                Para acceder a los Matches, inicia sesión y ve a la sección de
                "Matches" en el menú principal.
              </p>
            </div>
          </div>
        </section>

        <section className="mommatch-help-contact">
          <h2>Contacto</h2>

          <form className="mommatch-help-form" onSubmit={handleSubmit}>
            <div
              className={`mommatch-help-form-group ${
                errors.nombre ? "has-error" : ""
              }`}
            >
              <label htmlFor="nombre">Nombre:</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
              />
              {errors.nombre && (
                <span className="mommatch-help-error">{errors.nombre}</span>
              )}
            </div>

            <div
              className={`mommatch-help-form-group ${
                errors.email ? "has-error" : ""
              }`}
            >
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && (
                <span className="mommatch-help-error">{errors.email}</span>
              )}
            </div>

            <div
              className={`mommatch-help-form-group ${
                errors.mensaje ? "has-error" : ""
              }`}
            >
              <label htmlFor="mensaje">Mensaje:</label>
              <textarea
                id="mensaje"
                name="mensaje"
                rows="5"
                value={formData.mensaje}
                onChange={handleChange}
              ></textarea>
              {errors.mensaje && (
                <span className="mommatch-help-error">{errors.mensaje}</span>
              )}
            </div>

            <div className="mommatch-help-submit">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Enviar Mensaje"}
              </button>

              {/* Mensaje de confirmación justo debajo del botón */}
              {message && (
                <div
                  className={`mommatch-help-alert ${
                    submitStatus === "success" ? "success" : "error"
                  }`}
                >
                  {message}
                </div>
              )}
            </div>
          </form>
        </section>

        <footer className="mommatch-help-footer">
          <p>
            ¿Necesitas más ayuda? Escríbenos a{" "}
            <a href="mailto:soporte@mommatch.com">soporte@mommatch.com</a>
          </p>
          <div className="mommatch-help-social">
            <a
              href="https://facebook.com/mommatch"
              target="_blank"
              rel="noopener noreferrer"
            >
              Facebook
            </a>
            <a
              href="https://instagram.com/mommatch"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Ayuda;
