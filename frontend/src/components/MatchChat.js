import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react";
import "./MatchChat.css";

// Este componente implementa el sistema de chat entre usuarias que han hecho match
// Incluye funcionalidades para enviar mensajes, actualizar la conversación automáticamente,
// marcar mensajes como leídos y gestionar errores de conexión.
//--
// Utiliza un sistema de polling optimizado para minimizar peticiones al servidor,
// y tiene mecanismos para detectar y manejar problemas de recursos o conexión.
// También implementa eventos personalizados para notificar a otros componentes
// cuando se leen mensajes o se cierra un chat

const BACKEND_URL = "http://localhost/mommatch/backend";

const MatchChatContext = createContext();

export const MatchChatProvider = ({ children }) => {
  const [activeChat, setActiveChat] = useState(null);

  return (
    <MatchChatContext.Provider value={{ activeChat, setActiveChat }}>
      {children}
    </MatchChatContext.Provider>
  );
};

export const useMatchChat = () => useContext(MatchChatContext);

// Este componente gestiona el chat entre dos usuarios que han hecho match.
// Permite enviar y recibir mensajes en tiempo real.
const MatchChat = ({ match, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const messagesEndRef = useRef(null);
  const chatBodyRef = useRef(null);
  const isMarkingRead = useRef(false);
  const isFetchingMessages = useRef(false);
  const abortControllerRef = useRef(null);
  const messagesFetched = useRef(false);
  const intervalIdRef = useRef(null);
  const debounceTimeout = useRef(null);

  const markMessagesAsRead = useCallback(() => {
    if (isMarkingRead.current) return;

    try {
      setMessages((prevMessages) =>
        prevMessages.map((msg) => ({
          ...msg,
          is_read: msg.sender_id === match.id ? 1 : msg.is_read,
        }))
      );

      window.dispatchEvent(
        new CustomEvent("messagesMarkedAsRead", {
          detail: { matchId: match.id },
        })
      );

      if (localStorage.getItem("resourcesLow") === "true") {
        console.log("Skipping server update due to resource constraints");
        return;
      }

      isMarkingRead.current = true;

      fetch(`${BACKEND_URL}/mark_messages_read.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ other_user_id: match.id }),
      })
        .then(() => {
          isMarkingRead.current = false;
        })
        .catch((error) => {
          console.warn("Error marking messages as read:", error.message);
          isMarkingRead.current = false;

          if (error.message.includes("ERR_INSUFFICIENT_RESOURCES")) {
            localStorage.setItem("resourcesLow", "true");
            setTimeout(() => localStorage.removeItem("resourcesLow"), 10000);
          }
        });
    } catch (error) {
      console.warn("Error in markMessagesAsRead:", error);
      isMarkingRead.current = false;
    }
  }, [match.id]);

  const fetchMessages = useCallback(
    async (isBackground = false) => {
      if (
        isFetchingMessages.current ||
        localStorage.getItem("resourcesLow") === "true"
      ) {
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      isFetchingMessages.current = true;

      try {
        const response = await fetch(
          `${BACKEND_URL}/get_messages.php?other_user_id=${match.id}`,
          {
            method: "GET",
            credentials: "include",
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setMessages(data.messages || []);
          setOtherUser(data.other_user || null);
          setInitialLoadDone(true);
          messagesFetched.current = true;

          const hasUnreadMessages = data.messages?.some(
            (msg) => msg.sender_id === match.id && msg.is_read === 0
          );

          if (hasUnreadMessages) {
            markMessagesAsRead();
          }

          setError(null);
        } else {
          throw new Error(data.error || "Error desconocido");
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error al cargar los mensajes:", error.message);

          if (!isBackground) {
            setError(
              "No se pudieron cargar los mensajes. Intentando reconectar..."
            );
          }

          if (error.message.includes("ERR_INSUFFICIENT_RESOURCES")) {
            localStorage.setItem("resourcesLow", "true");
            setTimeout(() => localStorage.removeItem("resourcesLow"), 10000);
          }
        }
        setInitialLoadDone(true);
      } finally {
        isFetchingMessages.current = false;
      }
    },
    [match.id, markMessagesAsRead]
  );

  useEffect(() => {
    messagesFetched.current = false;

    // Limpia cualquier timeout anterior
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
    }

    // Limpia cualquier intervalo anterior antes de crear uno nuevo
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    // Cancela cualquier fetch anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Debounce real: espera 300ms tras el último cambio antes de hacer fetch
    debounceTimeout.current = setTimeout(() => {
      fetchMessages(false);
    }, 300);

    // Crea el intervalo y guárdalo en el ref
    intervalIdRef.current = setInterval(() => {
      if (
        !isFetchingMessages.current &&
        localStorage.getItem("resourcesLow") !== "true"
      ) {
        fetchMessages(true);
      }
    }, 8000);

    // Limpieza al desmontar o cambiar de chat
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
        debounceTimeout.current = null;
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [fetchMessages, match.id]);

  useEffect(() => {
    if (messages.length > 0 && !isMarkingRead.current) {
      const hasUnread = messages.some(
        (msg) => msg.sender_id === match.id && msg.is_read === 0
      );

      if (hasUnread) {
        markMessagesAsRead();
      }
    }
  }, [messages, match.id, markMessagesAsRead]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Función para enviar un mensaje al usuario con el que se ha hecho match.
  // Actualiza el estado del chat y notifica al backend.
  const sendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      id: tempId,
      sender_id: "me",
      message: newMessage.trim(),
      formatted_time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      is_read: 1,
      status: "sending",
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${BACKEND_URL}/send_message.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          to_user_id: match.id,
          message: optimisticMessage.message,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error al enviar el mensaje: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.message) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) => (msg.id === tempId ? data.message : msg))
        );

        if (!error) {
          setTimeout(() => fetchMessages(true), 1000);
        }
      } else {
        throw new Error(data.error || "No se pudo enviar el mensaje");
      }
    } catch (error) {
      console.error("Error al enviar el mensaje:", error);

      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === tempId ? { ...msg, status: "failed" } : msg
        )
      );

      setError(`Error: ${error.message}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const formatPhotoUrl = (photoPath) => {
    if (!photoPath)
      return `${BACKEND_URL}/public/uploads/profiles/default_profile.jpg`;

    if (photoPath.startsWith("http")) {
      return photoPath;
    } else if (photoPath.startsWith("/")) {
      return `${BACKEND_URL}${photoPath}`;
    } else {
      return `${BACKEND_URL}/${photoPath}`;
    }
  };

  // Renderiza el historial de mensajes entre los usuarios.
  // Incluye un campo de texto para escribir nuevos mensajes.
  return (
    <div className="match-chat-container">
      <div className="match-chat-header">
        {otherUser && (
          <div className="match-chat-header-content">
            <img
              src={formatPhotoUrl(otherUser.profile_photo)}
              alt={otherUser.name}
              className="match-chat-profile-photo"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `${BACKEND_URL}/public/uploads/profiles/default_profile.jpg`;
              }}
            />
            <h3>{otherUser.name}</h3>
          </div>
        )}
        <button
          className="match-chat-close-btn"
          onClick={onClose}
          aria-label="Cerrar chat"
        ></button>
      </div>

      <div
        className="match-chat-body"
        ref={chatBodyRef}
        style={{ minHeight: 300 }}
      >
        {!initialLoadDone ? (
          <div className="match-chat-loading">Cargando mensajes...</div>
        ) : error ? (
          <div className="match-chat-error">
            {error}
            <button
              onClick={() => fetchMessages()}
              className="match-chat-retry-btn"
            >
              Reintentar
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="match-chat-empty-message">
            No hay mensajes aún. ¡Sé la primera en escribir a tu match!
          </div>
        ) : (
          <div
            className="match-chat-messages-list"
            role="log"
            aria-live="polite"
          >
            {messages.some(
              (m) => m.sender_id === match.id && m.is_read === 0
            ) && (
              <div className="new-messages-indicator" title="Nuevos mensajes">
                Nuevos mensajes ↓
              </div>
            )}
            {messages.map((msg, index) => {
              const isMyMessage = String(msg.sender_id) !== String(match.id);
              const messageStatus = msg.status || "sent";

              const messageKey = `msg-${msg.id || "temp"}-${
                msg.created_at || msg.sent_at || Date.now()
              }-${index}-${isMyMessage ? "my" : "their"}`;

              return (
                <div
                  key={messageKey}
                  className={`match-chat-message ${
                    isMyMessage ? "match-my-message" : "match-other-message"
                  } ${messageStatus}`}
                >
                  <div className="match-message-content">
                    <p>{msg.message}</p>
                    <div className="match-message-footer">
                      <span className="match-message-time">
                        {msg.formatted_time}
                      </span>

                      {isMyMessage && (
                        <span className="message-status-indicator">
                          {messageStatus === "sending" && "⏳"}
                          {messageStatus === "sent" && "✓"}
                          {messageStatus === "failed" && (
                            <button
                              onClick={() => {
                                setMessages((prev) =>
                                  prev.filter((m) => m.id !== msg.id)
                                );
                                setNewMessage(msg.message);
                              }}
                              className="message-retry-btn"
                              aria-label="Reintentar enviar mensaje"
                            >
                              ⚠️ Error - Reintentar
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {initialLoadDone && (
        <form className="match-chat-input-area" onSubmit={sendMessage}>
          <input
            type="text"
            placeholder="Escribe un mensaje a tu match..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="match-chat-input"
          />
          <button
            type="submit"
            className="match-chat__send-btn"
            disabled={!newMessage.trim()}
          >
            Enviar
          </button>
        </form>
      )}
    </div>
  );
};

const MatchChatOverlay = ({ activeChat, handleCloseChat }) => {
  const chatRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatRef.current && !chatRef.current.contains(event.target)) {
        handleCloseChat();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleCloseChat]);

  useEffect(() => {
    return () => {
      if (activeChat) {
        const event = new CustomEvent("matchChatClosed", {
          detail: { matchId: activeChat.id },
        });
        window.dispatchEvent(event);
      }
    };
  }, [activeChat]);

  if (!activeChat) return null;

  return (
    <div className="match-chat-overlay" role="dialog" aria-modal="true">
      <div className="match-chat-wrapper" ref={chatRef}>
        <MatchChat match={activeChat} onClose={handleCloseChat} />
      </div>
    </div>
  );
};

export { MatchChat, MatchChatOverlay };
