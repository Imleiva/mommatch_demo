import { useEffect, useRef, useCallback } from "react";
import { MatchChat } from "../MatchChat";

// Componente que muestra el chat como un overlay
// encima de matchcard, sin necesidad de cambiar de pantalla
// --
// Usé refs y event listeners para detectar clicks fuera del chat y cerrarlo.
// También implementé eventos personalizados para notificar cuando se
// cierra el chat y así actualizar los contadores de mensajes no leídos

const ChatOverlay = ({ activeChat, handleCloseChat }) => {
  const chatRef = useRef(null);

  // Ensure notification is sent when chat is closed
  const handleClose = useCallback(() => {
    if (activeChat) {
      // Dispatch event to notify that chat was closed (and therefore messages were read)
      window.dispatchEvent(
        new CustomEvent("matchChatClosed", {
          detail: { matchId: activeChat.id },
        })
      );
    }

    // Then close the chat
    handleCloseChat();
  }, [activeChat, handleCloseChat]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatRef.current && !chatRef.current.contains(event.target)) {
        handleClose(); // Use the memoized function
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClose]); // Now include handleClose in the dependency array

  if (!activeChat) return null;

  return (
    <div className="match-chat-overlay">
      <div className="match-chat-wrapper" ref={chatRef}>
        <MatchChat match={activeChat} onClose={handleClose} />
      </div>
    </div>
  );
};

export default ChatOverlay;
