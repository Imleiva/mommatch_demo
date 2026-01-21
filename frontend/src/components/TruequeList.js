import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { config } from "../config";
import CityAutocomplete from "./CityAutocomplete";
import "./Trueque.css";

// Este componente muestra la lista de trueques disponibles
// Implementa filtrado por ciudad y estado, y permite a las usuarias
// contactar con las propietarias de los artículos
//--
// El diseño de tarjetas con frente y reverso (flip) mejora la experiencia al mostrar primero la imagen
// y luego los detalles al interactuar. También añadí un sistema para que
// las propietarias puedan cambiar el estado de sus trueques (disponible,reservado, entregado)

const BACKEND_URL = config.useMocks
  ? null
  : "http://localhost/mommatch/backend";

const TruequeList = ({ trueques, filterCity, onFilterChange }) => {
  // Estados para filtros y modales
  const { isAuthenticated, user } = useAuth();
  const [activeModal, setActiveModal] = useState(null);
  const [activeTrueque, setActiveTrueque] = useState(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [contactStatus, setContactStatus] = useState({
    success: false,
    error: "",
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [statusMessages, setStatusMessages] = useState({});

  useEffect(() => {
    if (!isAuthenticated) {
      setStatusMessages({
        global: {
          type: "error",
          text: "No estás autenticado. Por favor, inicia sesión para ver los trueques.",
        },
      });
    }
  }, [isAuthenticated]);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";

    // Modo demo: usar PUBLIC_URL
    if (config.useMocks) {
      if (imagePath.startsWith("http")) {
        return imagePath;
      }

      // Si la ruta incluye "trueques/"
      if (imagePath.includes("trueques/")) {
        const fileName = imagePath.split("trueques/").pop();
        return `${process.env.PUBLIC_URL}/uploads/trueques/${fileName}`;
      }

      // Si es solo el nombre del archivo
      return `${process.env.PUBLIC_URL}/uploads/trueques/${imagePath}`;
    }

    // Modo desarrollo con backend
    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    if (imagePath.includes("public/uploads/")) {
      return `${BACKEND_URL}/${imagePath}`;
    }

    if (imagePath.startsWith("trueques/")) {
      return `${BACKEND_URL}/public/uploads/${imagePath}`;
    }

    return `${BACKEND_URL}/public/uploads/${imagePath}`;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "reservado":
        return "status-reservado";
      case "entregado":
        return "status-entregado";
      default:
        return "";
    }
  };

  // Función para obtener la clase de estado para el overlay frontal
  const getOverlayClass = (status) => {
    switch (status) {
      case "reservado":
        return "overlay-reservado";
      case "entregado":
        return "overlay-entregado";
      default:
        return "";
    }
  };

  const openContactModal = (trueque) => {
    setActiveModal(trueque.id);
    setActiveTrueque(trueque);
    setMessage("");
    setContactStatus({ success: false, error: "" });
  };

  const updateTruequeStatus = async (truequeId, newStatus) => {
    if (isChangingStatus) return;

    setIsChangingStatus(true);

    try {
      const response = await fetch(`${BACKEND_URL}/update_trueque_status.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          trueque_id: truequeId,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        // Actualizar el estado en la interfaz sin mostrar mensaje emergente
        trueques.forEach((trueque) => {
          if (trueque.id === truequeId) {
            trueque.status = newStatus;
          }
        });
      } else {
        throw new Error(data.error || "Error al actualizar el estado");
      }
    } catch (error) {
      console.error("Error al cambiar el estado:", error);

      // Mostrar mensaje de error solo en caso de error
      setStatusMessages((prev) => ({
        ...prev,
        [truequeId]: {
          type: "error",
          text: `Error: No se pudo actualizar`,
        },
      }));

      // Eliminar el mensaje de error después de 2 segundos
      setTimeout(() => {
        setStatusMessages((prev) => ({
          ...prev,
          [truequeId]: null,
        }));
      }, 2000);
    } finally {
      setIsChangingStatus(false);
    }
  };

  const sendContactMessage = async (toUserId) => {
    if (!message.trim()) {
      alert("Por favor, escribe un mensaje");
      return;
    }

    setIsSending(true);
    setContactStatus({ success: false, error: "" });

    try {
      const response = await fetch(`${BACKEND_URL}/send_trueque_message.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_user_id: toUserId,
          message: message.trim(),
          trueque_id: activeTrueque ? activeTrueque.id : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setContactStatus({ success: true, error: "" });
        setMessage("");
      } else {
        setContactStatus({
          success: false,
          error: data.error || "Error al enviar el mensaje",
        });
      }
    } catch (error) {
      console.error("Error al enviar mensaje de trueque:", error);
      setContactStatus({ success: false, error: "Error de conexión" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="trueque-list-container compact">
      {statusMessages.global && (
        <div
          className={`status-message global-message ${statusMessages.global.type}`}
        >
          {statusMessages.global.text}
        </div>
      )}

      <div className="trueque-header-actions">
        <div className="filter-container">
          <label htmlFor="city-filter" style={{ color: "#666" }}>
            Filtrar por:
          </label>
          <CityAutocomplete
            value={filterCity}
            onChange={(value) => onFilterChange(value)}
            placeholder="Ciudad"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter"
          >
            <option value="">Todos los estados</option>
            <option value="disponible">Disponible</option>
            <option value="reservado">Reservado</option>
            <option value="entregado">Entregado</option>
          </select>
        </div>
        <Link to="/mensajes/trueques" className="view-messages-button">
          <span className="messages-icon">✉</span>
          Ver mensajes de trueques
        </Link>
      </div>
      <div className="trueques-container">
        {trueques.length > 0 ? (
          trueques
            .filter(
              (trueque) => !statusFilter || trueque.status === statusFilter
            )
            .map((trueque) => (
              <div key={trueque.id} className="trueque-item">
                <div
                  className={`trueque-card ${getStatusClass(trueque.status)}`}
                >
                  <div className="trueque-card-front">
                    {trueque.status !== "disponible" && (
                      <div
                        className={`overlay-text ${getOverlayClass(
                          trueque.status
                        )}`}
                      >
                        {trueque.status.charAt(0).toUpperCase() +
                          trueque.status.slice(1)}
                      </div>
                    )}
                    <img
                      src={getImageUrl(trueque.image_path)}
                      alt={trueque.title}
                    />
                  </div>
                  <div className="trueque-card-back">
                    <h3>{trueque.title}</h3>
                    <p className="trueque-description">{trueque.description}</p>
                    <p className="trueque-location">
                      <strong>Ciudad:</strong> {trueque.city}
                    </p>

                    {/* Mostrar mensaje de error si ocurre un problema al actualizar el estado */}
                    {statusMessages[trueque.id] &&
                      statusMessages[trueque.id].type === "error" && (
                        <div
                          className={`status-message card-message ${
                            statusMessages[trueque.id].type
                          }`}
                        >
                          {statusMessages[trueque.id].text}
                        </div>
                      )}

                    {user && user.id !== trueque.user_id && (
                      <button
                        className="contact-button"
                        onClick={() => openContactModal(trueque)}
                      >
                        Contactar
                      </button>
                    )}
                    {user && user.id === trueque.user_id && (
                      <div className="trueque-owner-controls">
                        <span className="own-trueque-badge">Tu trueque</span>
                        <div className="status-controls">
                          <p>Cambiar estado:</p>
                          <div className="status-buttons">
                            <button
                              className={`status-btn ${
                                trueque.status === "disponible" ? "active" : ""
                              }`}
                              onClick={() =>
                                updateTruequeStatus(trueque.id, "disponible")
                              }
                              disabled={
                                trueque.status === "disponible" ||
                                isChangingStatus
                              }
                            >
                              Disponible
                            </button>
                            <button
                              className={`status-btn ${
                                trueque.status === "reservado" ? "active" : ""
                              }`}
                              onClick={() =>
                                updateTruequeStatus(trueque.id, "reservado")
                              }
                              disabled={
                                trueque.status === "reservado" ||
                                isChangingStatus
                              }
                            >
                              Reservado
                            </button>
                            <button
                              className={`status-btn ${
                                trueque.status === "entregado" ? "active" : ""
                              }`}
                              onClick={() =>
                                updateTruequeStatus(trueque.id, "entregado")
                              }
                              disabled={
                                trueque.status === "entregado" ||
                                isChangingStatus
                              }
                            >
                              Entregado
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeModal === trueque.id && (
                      <div className="contact-modal-overlay">
                        <div className="contact-modal">
                          <button
                            className="close-modal"
                            onClick={() => setActiveModal(null)}
                          >
                            ×
                          </button>
                          <h4>{trueque.title}</h4>

                          {contactStatus.success ? (
                            <div className="success-message">
                              <p>¡Mensaje enviado!</p>
                              <p className="view-messages-info">
                                Puedes ver y continuar esta conversación en{" "}
                                <Link
                                  to="/mensajes/trueques"
                                  className="messages-link"
                                >
                                  chat de trueques
                                </Link>
                              </p>
                              <button
                                className="close-success-modal"
                                onClick={() => {
                                  setActiveModal(null);
                                  setContactStatus({
                                    success: false,
                                    error: "",
                                  });
                                }}
                              >
                                Cerrar
                              </button>
                            </div>
                          ) : (
                            <>
                              {contactStatus.error && (
                                <div className="error-message">
                                  {contactStatus.error}
                                </div>
                              )}
                              <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Escribe tu mensaje aquí. Explica por qué estás interesada en este artículo."
                                rows={4}
                                disabled={isSending}
                              />
                              <button
                                onClick={() =>
                                  sendContactMessage(trueque.user_id)
                                }
                                disabled={isSending}
                                className="send-message-button"
                              >
                                {isSending ? "Enviando..." : "Enviar Mensaje"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
        ) : (
          <p>No hay trueques disponibles en esta ciudad.</p>
        )}
      </div>
    </div>
  );
};

export default TruequeList;
