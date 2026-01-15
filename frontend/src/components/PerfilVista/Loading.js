import React from "react";
import LoadingSpinner from "../LoadingSpinner";

// Componente simple que muestra un spinner durante la carga del perfil

const Loading = ({ text = "Cargando perfil..." }) => {
  return (
    <div className="perfil-vista__container">
      <LoadingSpinner text={text} />
    </div>
  );
};

export default Loading;
