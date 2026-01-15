import React, { useRef, useEffect } from "react";

// Componente paara mostrar la lista de mensajes en el chat
// Después de probar varias soluciones para el scroll automático hacia
// el último mensaje, usé un ref que se coloca al final de la lista
// y hace scroll cuando cambian los mensajes.
// También me aseguré de manejar todos los estados posibles (cargando, error, vacío)
// para dar feedback claro a las usuarias y que sepan qué está pasando.

const MessageList = ({ messages, loading, error, match }) => {
  const messagesEndRef = useRef(null);

  // Scroll al último mensaje cuando se cargan o envían mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (loading) {
    return <div className="chat-loading">Cargando mensajes...</div>;
  }

  if (error) {
    return <div className="chat-error">{error}</div>;
  }

  if (messages.length === 0) {
    return (
      <div className="chat-empty-message">
        No hay mensajes aún. ¡Sé la primera en escribir!
      </div>
    );
  }

  return (
    <>
      {messages.map((msg) => {
        const isMyMessage = msg.sender_id !== match.id;

        return (
          <div
            key={msg.id}
            className={`chat-message ${
              isMyMessage ? "my-message" : "other-message"
            }`}
          >
            <div className="message-content">
              <p>{msg.message}</p>
              <span className="message-time">{msg.formatted_time}</span>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </>
  );
};

export default MessageList;
