import React, { useState, useEffect, useCallback } from "react";
import "./Eventos.css";

// Este componente maneja la sección de eventos
// Al final decidí implementar el filtrado por ciudad desde el backend para
// no tener que cargar todos los eventos y luego filtrar en el frontend.
//--
// Para que fuera intuitivo, añadí estados para manejar la carga,
// errores y mensajes cuando no hay eventos disponibles para dar
// feedback claro a las usuarias
//--
// Inicialmente pensé en añadir un mapa para mostrar la ubicación de cada evento,
// pero lo dejé para una futura actualización. Por ahora, dejo la dirección textual
// y evito complicaciones con las APIs de mapas

const BACKEND_URL = "http://localhost/mommatch/backend";

const Eventos = () => {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCity, setSelectedCity] = useState("");

  const fetchEventos = useCallback(async () => {
    setLoading(true);
    setError(null);

    let url = `${BACKEND_URL}/get_events.php`;
    if (selectedCity && selectedCity.trim() !== "") {
      url += `?city=${encodeURIComponent(selectedCity)}`;
    }

    try {
      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setEventos(data.events || []);
      } else {
        throw new Error(data.error || "Error al obtener los eventos");
      }
    } catch (error) {
      console.error("Error fetching eventos:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCity]);

  useEffect(() => {
    fetchEventos();
  }, [fetchEventos]);

  const handleCityChange = (e) => {
    setSelectedCity(e.target.value);
  };

  return (
    <div className="eventos-container">
      <header className="eventos-header">
        <h1>Eventos</h1>
        <p>Descubre eventos en tu ciudad</p>
        <select
          value={selectedCity}
          onChange={handleCityChange}
          className="eventos-city-select"
        >
          <option value="">Todas las ciudades</option>
          <option value="Madrid">Madrid</option>
          <option value="Barcelona">Barcelona</option>
          <option value="Valencia">Valencia</option>
          <option value="Sevilla">Sevilla</option>
          <option value="Bilbao">Bilbao</option>
        </select>
      </header>

      {loading ? (
        <div className="eventos-loading">
          <p>Cargando eventos...</p>
        </div>
      ) : error ? (
        <div className="eventos-error">
          <p>{error}</p>
        </div>
      ) : eventos.length === 0 ? (
        <div className="eventos-no-data">
          <p>No hay eventos disponibles.</p>
        </div>
      ) : (
        <div className="eventos-list">
          {eventos.map((evento) => (
            <div key={evento.id} className="evento-card">
              <h3>{evento.title}</h3>
              <p>{evento.description}</p>
              <p>
                <strong>Ubicación:</strong> {evento.location}, {evento.city}
              </p>
              <p>
                <strong>Fecha:</strong>{" "}
                {new Date(evento.event_date).toLocaleDateString()}
              </p>
              <p>
                <strong>Hora:</strong> {evento.event_time}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Eventos;
