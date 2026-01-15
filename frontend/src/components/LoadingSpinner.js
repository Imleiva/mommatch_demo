import React from "react";
import "./LoadingSpinner.css";

// Este componente muestra un spinner de carga con un texto personalizable
// Lo diseñé para usarlo en toda la aplicación y mantener una experiencia
// de usuario consistente durante los estados de carga.
// La animación CSS la hice con divs superpuestos que rotan a diferentes
// velocidades, creando un efecto visual agradable sin necesidad de librerías externas

const LoadingSpinner = ({ text = "Cargando..." }) => {
  return (
    <div className="custom-spinner-container">
      <div className="custom-spinner">
        <div className="custom-spinner-animation">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
      {text && <p className="custom-spinner-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
