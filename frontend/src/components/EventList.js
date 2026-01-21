import React, { useState } from "react";
import LoadingSpinner from "./LoadingSpinner";
import "./Events.css";
import { config } from "../config";

// Este componente muestra la lista de eventos disponibles en forma de tarjetas
// Lo separé del componente principal de Events para mantener el código más organizado.
//--
// El manejo de mensajes de éxito/error me dio algunos problemas,
// sobre todo para que aparecieran solo en la tarjeta del evento afectado y no
// en todas. Al final implementé un sistema basado en IDs de eventos que funciona
//--
// El manejador de errores con imagen por defecto
// evita que se rompa la UI si hay problemas con alguna imagen.

// Definir la URL del backend
const BACKEND_URL = config.useMocks ? null : "http://localhost/mommatch/backend";

// Iconos básicos usando caracteres Unicode para simplificar
const icons = {
  date: "📅",
  time: "🕒",
  location: "📍",
  participants: "👥",
};

const EventList = ({
  events,
  loading,
  currentUserId, // Sigue siendo útil para deshabilitar el botón "No iré" si es el creador
  onRegister,
  onUnregister,
}) => {
  // Usar un objeto para almacenar errores por eventId
  const [errorMessages] = useState({});
  const [messages, setMessages] = useState({}); // Para mensajes de éxito/error por evento
  const [messageTimeouts, setMessageTimeouts] = useState({}); // Para gestionar los timeouts

  const clearEventMessage = (eventId) => {
    setMessages((prev) => {
      const newMessages = { ...prev };
      delete newMessages[eventId];
      return newMessages;
    });
  };
  // Determinar si quedan plazas disponibles en el evento y verificar si ya pasó
  const getEventStatus = (event, isRegistered) => {
    // Verificar si el evento ya pasó comparando la fecha con la fecha actual
    const eventDate = new Date(`${event.event_date}T${event.event_time}`);
    const now = new Date();

    // Si la fecha del evento es anterior a la fecha actual, el evento ya pasó
    if (eventDate < now) {
      return {
        label: "Evento pasado",
        className: "past",
      };
    }

    // Usar el valor isRegistered que viene del backend
    if (isRegistered) {
      return {
        label: "Registrada",
        className: "registered",
      };
    }

    if (event.max_participants === null) {
      return {
        label: "Plazas ilimitadas",
        className: "unlimited",
      };
    }

    const remainingSlots = event.remaining_slots;

    if (remainingSlots <= 0) {
      return {
        label: "Completo",
        className: "full",
      };
    }

    return {
      label: `${remainingSlots} ${remainingSlots === 1 ? "plaza" : "plazas"}`,
      className: "available",
    };
  };

  // Función genérica para manejar llamadas a la API de registro/cancelación
  const handleEventAction = async (eventId, action) => {
    // Limpiar mensaje previo para este evento específico
    clearEventMessage(eventId);

    try {
      const result = await (action === "register"
        ? onRegister(eventId)
        : onUnregister(eventId));

      // Establecer el mensaje (ya sea de éxito o error)
      setMessages((prev) => ({
        ...prev,
        [eventId]: {
          text: result.message || result.error,
          type: result.success ? "success" : "error",
        },
      }));

      // Limpiar cualquier timeout existente para este evento
      if (messageTimeouts[eventId]) {
        clearTimeout(messageTimeouts[eventId]);
      }

      // Establecer un nuevo timeout para limpiar el mensaje
      const timeout = setTimeout(() => clearEventMessage(eventId), 3000);
      setMessageTimeouts((prev) => ({
        ...prev,
        [eventId]: timeout,
      }));
    } catch (error) {
      console.error(`Error al ${action} en el evento:`, error);
      setMessages((prev) => ({
        ...prev,
        [eventId]: {
          text: `Error de conexión al ${
            action === "register" ? "registrarte" : "cancelar registro"
          }.`,
          type: "error",
        },
      }));
    }
  };

  if (loading) {
    return <LoadingSpinner text="Cargando eventos..." />;
  }

  if (!events || events.length === 0) {
    return (
      <div className="no-events">
        <p>No hay eventos disponibles en esta ciudad.</p>
        <p>¡Sé la primera en crear uno!</p>
      </div>
    );
  }
  // Ordenar eventos: primero los eventos actuales, después los pasados
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(`${a.event_date}T${a.event_time}`);
    const dateB = new Date(`${b.event_date}T${b.event_time}`);
    const now = new Date();

    // Si ambos eventos son pasados o ambos son futuros, mantener el orden original
    const aIsPast = dateA < now;
    const bIsPast = dateB < now;

    if (aIsPast && !bIsPast) return 1; // a es pasado, b es futuro -> b va primero
    if (!aIsPast && bIsPast) return -1; // a es futuro, b es pasado -> a va primero

    // Si ambos son futuros, ordenar por fecha (más próximos primero)
    if (!aIsPast && !bIsPast) {
      return dateA - dateB;
    }

    // Si ambos son pasados, ordenar por fecha (más recientes primero)
    return dateB - dateA;
  });

  return (
    <div className="events-grid">
      {sortedEvents.map((event) => {
        // Usar directamente el campo del backend
        const isRegistered = event.is_current_user_registered;
        const status = getEventStatus(event, isRegistered); // Pasar isRegistered a getEventStatus
        const eventError = errorMessages[event.id];
        const eventMessage = messages[event.id];

        // Verificar si el evento ya pasó para aplicar clase adicional
        const eventDate = new Date(`${event.event_date}T${event.event_time}`);
        const now = new Date();
        const isPastEvent = eventDate < now;
        return (
          <div
            key={event.id}
            className={`event-card ${isPastEvent ? "past-event" : ""}`}
          >
            <div className="event-card-header">
              <h3>{event.title}</h3>
            </div>{" "}
            <span className={`event-status ${status.className}`}>
              {status.label}
            </span>
            {isPastEvent && (
              <div className="past-event-overlay">
                <span className="past-event-icon">⌛</span>
              </div>
            )}
            <div className="event-card-body">
              <div className="event-info">
                <p className="event-description">
                  {event.description || "Sin descripción"}
                </p>

                <div className="event-meta">
                  <p>
                    {icons.date}
                    {event.formatted_date}
                  </p>
                  <p>
                    {icons.time} {event.formatted_time}
                  </p>
                  <p>
                    {icons.location}{" "}
                    {event.location || "Ubicación no especificada"} (
                    {event.city})
                  </p>
                  <p>
                    {icons.participants} {event.participants_count}{" "}
                    {event.participants_count === 1
                      ? "participante"
                      : "participantes"}
                    {event.max_participants &&
                      ` (máx. ${event.max_participants})`}
                  </p>
                </div>
              </div>

              <div className="event-creator">
                <div className="event-creator-avatar">
                  <img
                    src={
                      config.useMocks
                        ? `${process.env.PUBLIC_URL}/uploads/profiles/default_profile.jpg`
                        : event.creator_photo &&
                          event.creator_photo.includes("http")
                        ? event.creator_photo
                        : event.creator_photo &&
                          event.creator_photo.startsWith("/")
                        ? `http://localhost${event.creator_photo}`
                        : `${BACKEND_URL}/public/uploads/profiles/default_profile.jpg`
                    }
                    alt="Creador"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = config.useMocks
                        ? `${process.env.PUBLIC_URL}/uploads/profiles/default_profile.jpg`
                        : `${BACKEND_URL}/public/uploads/profiles/default_profile.jpg`;
                    }}
                  />
                </div>
                <div className="event-creator-info">
                  <div className="event-creator-name">{event.creator_name}</div>
                  <div className="event-participants">Organizadora</div>
                </div>
              </div>

              {eventError && (
                <div
                  className="error-message-card"
                  style={{ color: "red", marginTop: "10px", fontSize: "0.9em" }}
                >
                  {eventError}
                </div>
              )}

              {eventMessage && (
                <div
                  className={`event-message ${eventMessage.type}`}
                  style={{
                    padding: "8px",
                    marginTop: "10px",
                    borderRadius: "4px",
                    backgroundColor:
                      eventMessage.type === "success" ? "#d4edda" : "#f8d7da",
                    color:
                      eventMessage.type === "success" ? "#155724" : "#721c24",
                    fontSize: "0.9em",
                    textAlign: "center",
                  }}
                >
                  {eventMessage.text}
                </div>
              )}

              <div className="event-actions">
                {/* Usar isRegistered (del backend) para decidir qué botón mostrar */}
                {isRegistered ? (
                  <button
                    className="event-unregister-btn"
                    onClick={() => handleEventAction(event.id, "unregister")}
                    // Deshabilitar si el usuario actual es el creador del evento
                    disabled={event.user_id === currentUserId}
                  >
                    {event.user_id === currentUserId
                      ? "Creado por ti"
                      : "No podré ir"}
                  </button>
                ) : (
                  <button
                    className="event-register-btn"
                    onClick={() => handleEventAction(event.id, "register")}
                    disabled={
                      (event.remaining_slots !== null &&
                        event.remaining_slots <= 0) ||
                      new Date(`${event.event_date}T${event.event_time}`) <
                        new Date()
                    }
                    value={
                      new Date(`${event.event_date}T${event.event_time}`) <
                      new Date()
                        ? "Evento pasado"
                        : ""
                    }
                  >
                    {new Date(`${event.event_date}T${event.event_time}`) <
                    new Date()
                      ? "Evento pasado"
                      : event.remaining_slots !== null &&
                        event.remaining_slots <= 0
                      ? "No hay plazas"
                      : "¡Me apunto!"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EventList;
