import React, { useState, useEffect } from "react";
import TruequeForm from "./TruequeForm";
import TruequeList from "./TruequeList";
import "./Trueque.css";

// Este componente gestiona la funcionalidad de trueques
// Permite a los usuarios publicar, buscar y contactar por artículos de trueque.

const Trueque = () => {
  const [trueques, setTrueques] = useState([]);
  const [filterCity, setFilterCity] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Función para obtener la lista de artículos disponibles desde el backend.
  // Incluye soporte para filtrar por ciudad o categoría.
  const fetchTrueques = async (city = "") => {
    try {
      const response = await fetch(
        `http://localhost/mommatch/backend/get_trueques.php?city=${city}`
      );
      const data = await response.json();
      if (data.success) {
        setTrueques(data.trueques);
      } else {
        console.error("Error al obtener los trueques:", data.error);
      }
    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
    }
  };

  useEffect(() => {
    fetchTrueques(filterCity);
  }, [filterCity]);

  const toggleForm = () => {
    setIsFormOpen(!isFormOpen);
  };

  // Estilos directos para mejorar el centrado
  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: "1500px", // Aumentado de 1200px a 1500px
    margin: "0 auto",
    width: "100%",
  };

  return (
    <div className="trueque-container" style={containerStyle}>
      <h1 className="trueque-title">Zona de Trueque</h1>
      <button
        className="open-form-button compact"
        onClick={toggleForm}
        style={{ margin: "5px 0 15px 0" }}
      >
        {isFormOpen ? "Cerrar" : "Sube lo que quieras regalar o intercambiar"}
      </button>
      {isFormOpen && (
        <div className="trueque-form-modal">
          <TruequeForm onTruequeAdded={() => fetchTrueques(filterCity)} />
        </div>
      )}
      <div
        className="trueque-list-container"
        style={{ padding: "20px", width: "100%", maxWidth: "1500px" }}
      >
        {/* Lista de artículos trueque.
            + botones para contactar con el propietario del artículo. */}
        <TruequeList
          trueques={trueques}
          filterCity={filterCity}
          onFilterChange={setFilterCity}
        />
      </div>
    </div>
  );
};

export default Trueque;
