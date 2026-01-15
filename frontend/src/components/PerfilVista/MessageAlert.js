import React from "react";
import "../PerfilVista.css";

// Componente para mostrar mensajes de éxito o error en la vista de perfil.
// Es similar al MessageDisplay de la sección de edición, pero con un estilo
// visual diferente que encaja mejor en la vista de perfil

const MessageAlert = ({ message }) => {
  if (!message.text) return null;

  return (
    <div className={`alert alert-${message.type}`}>
      <span className="alert-icon">
        {message.type === "error" ? "⚠️" : "✅"}
      </span>
      {message.text}
    </div>
  );
};

export default MessageAlert;
