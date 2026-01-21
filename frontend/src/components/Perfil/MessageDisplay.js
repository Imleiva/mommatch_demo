import React from "react";

// Componente para mostrar mensajes de éxito, error o información en cualquier parte del módulo de perfil.
// Intención de reutilizarlo en diferentes lugares.
// Los estilos CSS que cambian según tipo de mensaje (success, error, info) que se pasa por props.

const MessageDisplay = ({ message }) => {
  if (!message || !message.text) return null;

  return <div className={`message ${message.type}`}>{message.text}</div>;
};

export default MessageDisplay;
