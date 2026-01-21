import React, { useState, useRef } from "react";
import CityAutocomplete from "./CityAutocomplete";
import "./CityAutocomplete.css";
import "./Trueque.css";

// Este componente implementa el formulario para crear nuevos trueques
// Permite subir una imagen, añadir título, descripción y ubicación
//
// La subida de imágenes fue el aspecto más complicado, especialmente
// manejar la previsualización antes de subir y asegurarme de que
// el FormData se enviara correctamente al backend con la imagen
// y los datos del trueque. También añadí validación para asegurar
// que todos los campos requeridos estén completos

const TruequeForm = ({ onTruequeAdded }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    city: "",
    image: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({
    type: "",
    text: "",
  });
  const formRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCityChange = (value) => {
    setFormData({ ...formData, city: value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, image: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage({ type: "", text: "" });

    const formDataToSend = new FormData();
    formDataToSend.append("title", formData.title);
    formDataToSend.append("description", formData.description);
    formDataToSend.append("city", formData.city);
    if (formData.image) {
      formDataToSend.append("image", formData.image);
    }

    try {
      const response = await fetch(
        "http://localhost/mommatch/backend/create_trueque.php",
        {
          method: "POST",
          body: formDataToSend,
          credentials: "include", // Ensure session cookies are sent
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("No estás autenticado. Por favor, inicia sesión.");
        } else {
          throw new Error(
            "Error al subir el trueque. Por favor, intenta de nuevo."
          );
        }
      }

      const data = await response.json();
      if (data.success) {
        // Actualización más compacta
        setStatusMessage({
          type: "compact-success",
          text: "¡Trueque publicado!",
        });
        onTruequeAdded();
        setFormData({ title: "", description: "", city: "", image: null });

        // Auto-ocultar mensaje después de 3 segundos
        setTimeout(() => setStatusMessage({ type: "", text: "" }), 3000);
      } else {
        setStatusMessage({
          type: "compact-error",
          text: "Error: " + (data.error || "No se pudo publicar"),
        });
      }
    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
      setStatusMessage({
        type: "compact-error",
        text: "Error: " + (error.message || "Falló la conexión"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className="trueque-form compact"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      {/* Posición relativa para contener el mensaje compacto de estado */}
      <div style={{ position: "relative" }}>
        {statusMessage.text && (
          <div className={`status-message ${statusMessage.type}`}>
            {statusMessage.text}
          </div>
        )}
      </div>

      <div className="form-group compact">
        <input
          type="text"
          id="title"
          name="title"
          placeholder="Título"
          value={formData.title}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group compact">
        <textarea
          id="description"
          name="description"
          placeholder="Descripción"
          value={formData.description}
          onChange={handleChange}
        ></textarea>
      </div>

      {/* Contenedor para poner ciudad y subir foto lado a lado */}
      <div className="form-row">
        <div className="form-group compact">
          <CityAutocomplete
            id="city"
            name="city"
            placeholder="Ciudad"
            value={formData.city}
            onChange={handleCityChange}
            required
          />
        </div>
        <div className="custom-file-wrapper compact">
          <input
            type="file"
            id="image"
            name="image"
            onChange={handleFileChange}
            className="custom-file-input compact"
          />
          <label htmlFor="image" className="custom-file-label compact">
            {formData.image ? formData.image.name : "📷 Agregar una foto"}
          </label>
        </div>
      </div>

      <button type="submit" className="compact" disabled={isSubmitting}>
        {isSubmitting ? "Subiendo..." : "Subir"}
      </button>
    </form>
  );
};

export default TruequeForm;
