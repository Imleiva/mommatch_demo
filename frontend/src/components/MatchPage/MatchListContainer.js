import React from "react";
import PropTypes from "prop-types";
import { MatchList } from "../MatchCard";

// Este componente es un wrapper sencillo que maneja los estados de carga
// y mensajes de "no hay perfiles" para el componente MatchList.
// --
// Lo creé para separar las responsabilidades y que MatchList solo se encargue
// de mostrar perfiles, mientras que este container maneja los estados
// especiales y la lógica de reseteo de filtros

const MatchListContainer = ({
  profiles,
  currentIndex,
  handlePrevious,
  handleNext,
  handleLike,
  handleReject,
  loading,
  message,
  resetFilters, // Añadir nueva prop para resetear filtros
}) => {
  if (loading) {
    return (
      <div className="loading-container">
        <p>Cargando perfiles...</p>
      </div>
    );
  }

  // Mostrar mensaje si no hay perfiles
  if (profiles.length === 0) {
    return (
      <div className="no-more-profiles">
        <h2>No hay perfiles que coincidan con tus filtros</h2>
        <p>
          Prueba con filtros diferentes o muestra todos los perfiles disponibles
        </p>
        <button className="show-all-profiles-button" onClick={resetFilters}>
          <i className="fas fa-redo"></i> Mostrar todos los perfiles
        </button>
      </div>
    );
  }

  return (
    <MatchList
      profiles={profiles}
      currentIndex={currentIndex}
      handlePrevious={handlePrevious}
      handleNext={handleNext}
      handleLike={handleLike}
      handleReject={handleReject}
      loading={loading}
      message={message} // Pasar message a MatchList
    />
  );
};

MatchListContainer.propTypes = {
  profiles: PropTypes.array.isRequired,
  currentIndex: PropTypes.number.isRequired,
  handlePrevious: PropTypes.func.isRequired,
  handleNext: PropTypes.func.isRequired,
  handleLike: PropTypes.func.isRequired,
  handleReject: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  message: PropTypes.object, // Añadir propType para message
  resetFilters: PropTypes.func.isRequired, // Añadir propType para resetFilters
};

export default MatchListContainer;
