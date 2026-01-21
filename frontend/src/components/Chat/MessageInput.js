import React from "react";

// Componente sencillo para la entrada de mensajes
// Lo separé en su propio archivo para mantener el código más organizado.
// Simple, solo un campo de texto y un botón
//
// Al principio iba a añadir la funcionalidad para enviar archivos e imágenes,
// pero decidí dejarlo para una futura actualización. Por ahora, con mensajes
// de texto es suficiente para que las mamás puedan comunicarse.
//
// También consideré añadir emojis, pero lo dejé pendiente para no complicar
// demasiado esta primera versión

const MessageInput = ({ newMessage, setNewMessage, sendMessage }) => {
  return (
    <form className="chat-input-area" onSubmit={sendMessage}>
      <input
        type="text"
        placeholder="Escribe un mensaje..."
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        className="chat-input"
      />
      <button type="submit" className="chat-send-btn" title="Enviar mensaje">
        &#10148;
      </button>
    </form>
  );
};

export default MessageInput;
