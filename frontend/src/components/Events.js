import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import CityAutocomplete from "./CityAutocomplete";
import EventForm from "./EventForm";
import EventList from "./EventList";
import "./Events.css";

// Este componente maneja la página principal de eventos, donde las mamás pueden
// ver, filtrar y registrarse en eventos cercanos
//--
// Me costó bastante implementar el sistema de actualización local del estado
// después de registrarse/cancelar registro en un evento. Quería evitar tener que
// recargar todos los eventos cada vez, así que hago una actualización optimista
// del estado y luego confirmo con la respuesta del servidor.
//--
// La parte más complicada fue la gestión de plazas disponibles, especialmente
// cuando el evento tiene un límite de participantes. Tuve que calcular correctamente
// los contadores y mostrar los mensajes adecuados según el estado actual.

const BACKEND_URL = "http://localhost/mommatch/backend";

const Events = () => {
  const { isAuthenticated, user } = useAuth();
  const [events, setEvents] = useState([]);
  const [filterCity, setFilterCity] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Función para obtener los eventos desde el backend
  const fetchEvents = async (city = "") => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BACKEND_URL}/get_events.php?city=${encodeURIComponent(city)}`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();

      if (data.success) {
        setEvents(data.events);
      } else {
        console.error("Error al obtener los eventos:", data.error);
      }
    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar eventos cuando cambia el filtro de ciudad o autenticación
  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents(filterCity);
    } else {
      setEvents([]);
      setLoading(false);
    }
  }, [filterCity, isAuthenticated]);

  // Alternar la visualización del formulario
  const toggleForm = () => {
    setIsFormOpen(!isFormOpen);
  };

  // Función para manejar el registro/cancelación en un evento
  const handleEventRegistration = async (eventId, action) => {
    if (!isAuthenticated) {
      return {
        success: false,
        error: "Debes iniciar sesión para participar en eventos",
      };
    }

    try {
      const response = await fetch(`${BACKEND_URL}/register_event.php`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: eventId,
          action: action,
        }),
      });

      const data = await response.json();

      // Si la API fue exitosa, actualizar el estado localmente
      if (data.success) {
        setEvents((prevEvents) =>
          prevEvents.map((event) => {
            if (event.id === eventId) {
              const isRegistering = action === "register";
              const newParticipantsCount = isRegistering
                ? event.participants_count + 1
                : event.participants_count - 1;

              let newRemainingSlots = event.remaining_slots;
              if (event.max_participants !== null) {
                newRemainingSlots = isRegistering
                  ? event.remaining_slots - 1
                  : event.remaining_slots + 1;
              }

              return {
                ...event,
                is_current_user_registered: isRegistering,
                participants_count: newParticipantsCount,
                remaining_slots: newRemainingSlots,
              };
            }
            return event;
          })
        );
      }

      // Devolver el resultado para que EventList pueda mostrar el mensaje
      return data;
    } catch (error) {
      console.error("Error al procesar la solicitud:", error);
      return {
        success: false,
        error: "Error de conexión. Inténtalo de nuevo más tarde.",
      };
    }
  };

  // Estilo para centrar el contenedor principal
  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: "1500px",
    margin: "0 auto",
    width: "100%",
  };

  return (
    <div className="events-container" style={containerStyle}>
      <h1 className="events-title">Eventos</h1>

      <button
        className="open-form-button compact"
        onClick={toggleForm}
        style={{ margin: "5px 0 15px 0" }}
      >
        {isFormOpen ? "Cerrar" : "Organiza un evento o quedada"}
      </button>

      {isFormOpen && (
        <div className="event-form-modal">
          <EventForm
            onEventAdded={() => {
              fetchEvents(filterCity);
              setIsFormOpen(false);
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </div>
      )}

      <div
        className="events-list-container"
        style={{ padding: "20px", width: "100%", maxWidth: "1500px" }}
      >
        <div className="events-header-actions">
          <div className="filter-container">
            <label className="city-filter" style={{ color: "#2a4a43" }}>
              Buscar por ciudad:
            </label>
            <CityAutocomplete
              id="city-filter"
              value={filterCity}
              onChange={(value) => setFilterCity(value)}
            />
          </div>
        </div>

        <EventList
          events={events}
          loading={loading}
          currentUserId={user?.id}
          onRegister={(eventId) => handleEventRegistration(eventId, "register")}
          onUnregister={(eventId) =>
            handleEventRegistration(eventId, "unregister")
          }
        />
      </div>
    </div>
  );
};

export default Events;
