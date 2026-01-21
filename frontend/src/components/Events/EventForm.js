import React, { useState, useEffect } from "react";
import CityAutocomplete from "./CityAutocomplete";
import "./Events.css";

// Este formulario permite a las mamás crear sus propios eventos
// Implemenmta el guardado automático en localStorage,
// así las usuarias no pierden lo que escribieron si cierran la página por accidente

const BACKEND_URL = "http://localhost/mommatch/backend";

// Clave para guardar los datos del formulario en localStorage
const FORM_STORAGE_KEY = "event_form_data";

const EventForm = ({ onEventAdded, onCancel }) => {
  // Cargar datos guardados si existen
  const getInitialFormData = () => {
    const savedData = localStorage.getItem(FORM_STORAGE_KEY);
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (e) {
        console.error("Error al cargar datos guardados:", e);
      }
    }
    // Valores por defecto si no hay datos guardados
    return {
      title: "",
      description: "",
      location: "",
      city: "",
      event_date: "",
      event_time: "",
      max_participants: "",
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [noLimit, setNoLimit] = useState(false);

  // Guardar cambios en localStorage cada vez que cambia formData
  useEffect(() => {
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCityChange = (value) => {
    setFormData({ ...formData, city: value });
  };

  const handleNoLimitChange = (e) => {
    const checked = e.target.checked;
    setNoLimit(checked);

    // Si se marca "No hay límite", limpiamos el campo max_participants
    if (checked) {
      setFormData({ ...formData, max_participants: "" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    // Validación básica
    if (!formData.title.trim()) {
      setErrorMessage("Por favor, introduce un título para el evento");
      setIsSubmitting(false);
      return;
    }

    if (!formData.city.trim()) {
      setErrorMessage("Por favor, selecciona una ciudad");
      setIsSubmitting(false);
      return;
    }

    if (!formData.event_date) {
      setErrorMessage("Por favor, selecciona una fecha");
      setIsSubmitting(false);
      return;
    }

    if (!formData.event_time) {
      setErrorMessage("Por favor, selecciona una hora");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/create_event.php`, {
        method: "POST",
        credentials: "include", // Para incluir las cookies de sesión
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // Limpiar localStorage después de envío exitoso
        localStorage.removeItem(FORM_STORAGE_KEY);
        onEventAdded(data); // Pasar la respuesta al componente padre
      } else {
        setErrorMessage(data.error || "Error al crear el evento");
      }
    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
      setErrorMessage("Error de conexión. Comprueba tu conexión a internet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Obtener la fecha de hoy en formato ISO para el input date min
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="event-form-container">
      {/* Botón para cerrar el modal (X) */}
      <button
        className="close-modal-button"
        onClick={onCancel}
        disabled={isSubmitting}
        aria-label="Cerrar"
        title="Cerrar formulario"
      >
        ×
      </button>

      <form className="event-form" onSubmit={handleSubmit}>
        <h3>Crear nuevo evento</h3>

        {errorMessage && <div className="error-message">{errorMessage}</div>}

        <div className="form-grid">
          {/* Título (ocupa toda la fila) */}
          <div className="form-group form-grid-full">
            <label htmlFor="title">Título del evento *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Ej: Merienda en el parque"
              required
              className="form-input"
            />
          </div>

          {/* Lugar y Ciudad en la misma fila */}
          <div className="form-group form-grid-half">
            <label htmlFor="location">Lugar específico</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Ej: Parque del Retiro, zona infantil"
            />
          </div>

          <div className="form-group form-grid-half">
            <label htmlFor="city">Ciudad *</label>
            <CityAutocomplete
              value={formData.city}
              onChange={handleCityChange}
            />
          </div>

          {/* Fecha y Hora en la misma línea */}
          <div className="form-group form-grid-half">
            <label htmlFor="event_date">Fecha *</label>
            <input
              type="date"
              id="event_date"
              name="event_date"
              value={formData.event_date}
              onChange={handleChange}
              min={today}
              required
              className="date-time-input calendar-input"
            />
          </div>

          <div className="form-group form-grid-half">
            <label htmlFor="event_time">Hora *</label>
            <input
              type="time"
              id="event_time"
              name="event_time"
              value={formData.event_time}
              onChange={handleChange}
              required
              className="date-time-input time-input"
            />
          </div>

          {/* Máximo de participantes y checkbox para "sin límite" */}
          <div className="form-group form-grid-half">
            <label htmlFor="max_participants">Máximo de participantes</label>
            <input
              type="number"
              id="max_participants"
              name="max_participants"
              value={formData.max_participants}
              onChange={handleChange}
              min="2"
              placeholder="Ej: 10"
              disabled={noLimit}
              className="form-input"
            />
            <div className="no-limit-checkbox">
              <input
                type="checkbox"
                id="no_limit"
                checked={noLimit}
                onChange={handleNoLimitChange}
              />
              <label htmlFor="no_limit">Sin límite de participantes</label>
            </div>
          </div>

          {/* Descripción - ahora al lado del número de participantes */}
          <div className="form-group form-grid-half">
            <label htmlFor="description">Descripción</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe tu evento o quedada..."
              className="description-textarea"
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creando..." : "Crear Evento"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventForm;
