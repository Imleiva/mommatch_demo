import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { config } from "../config";
import "./TruequeMessages.css";

// Este componente maneja todos los mensajes relacionados con trueques
// Implementa un sistema de chat específico para las conversaciones de trueques
// Me costó bastante implementar la actualización en tiempo real con polling
// y mostrar correctamente el contexto del trueque en cada conversación
//--
// El manejo de mensajes optimistas (que se muestran antes de confirmarse en el servidor)
// mejora mucho la experiencia de usuario al mostrar inmediatamente los mensajes enviados

const BACKEND_URL = config.useMocks ? null : "http://localhost/mommatch/backend";

// Datos mock para conversaciones de trueques
const MOCK_TRUEQUE_CONVERSATIONS = [
  {
    id: 1,
    trueque_id: 1,
    other_user_id: 2,
    other_user_name: "Ana García",
    other_user_photo: null,
    trueque_title: "Silla de bebé",
    last_message: "¿Todavía está disponible?",
    last_message_time: new Date(Date.now() - 3600000).toISOString(),
    unread_count: 0
  },
  {
    id: 2,
    trueque_id: 3,
    other_user_id: 3,
    other_user_name: "María López",
    other_user_photo: null,
    trueque_title: "Ropa de bebé 0-6 meses",
    last_message: "Perfecto, ¿cuándo podemos quedar?",
    last_message_time: new Date(Date.now() - 7200000).toISOString(),
    unread_count: 0
  }
];

// Datos mock para mensajes de un chat
const MOCK_TRUEQUE_MESSAGES = {
  1: [
    {
      id: 1,
      from_user_id: 2,
      from_user_name: "Ana García",
      to_user_id: 1,
      message: "Hola, vi tu silla de bebé. ¿Todavía está disponible?",
      sent_at: new Date(Date.now() - 3600000).toISOString(),
      read_at: new Date(Date.now() - 3500000).toISOString()
    },
    {
      id: 2,
      from_user_id: 1,
      from_user_name: "Usuario Demo",
      to_user_id: 2,
      message: "¡Hola! Sí, todavía está disponible.",
      sent_at: new Date(Date.now() - 3400000).toISOString(),
      read_at: new Date(Date.now() - 3300000).toISOString()
    }
  ],
  2: [
    {
      id: 3,
      from_user_id: 3,
      from_user_name: "María López",
      to_user_id: 1,
      message: "Me interesa la ropa que tienes",
      sent_at: new Date(Date.now() - 7200000).toISOString(),
      read_at: new Date(Date.now() - 7100000).toISOString()
    },
    {
      id: 4,
      from_user_id: 1,
      from_user_name: "Usuario Demo",
      to_user_id: 3,
      message: "Perfecto, ¿cuándo podemos quedar?",
      sent_at: new Date(Date.now() - 7000000).toISOString(),
      read_at: null
    }
  ]
};

const TruequeMessages = () => {
  // Estado para las conversaciones y mensajes
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const [trueques, setTrueques] = useState([]);
  const lastConversationsData = useRef(null);
  const lastMessagesData = useRef(null);

  // Función para comparar arrays y determinar si son iguales
  const areArraysEqual = (arr1, arr2) => {
    if (!arr1 || !arr2) return false;
    if (arr1.length !== arr2.length) return false;

    // Para comparaciones simples podemos usar JSON.stringify
    return JSON.stringify(arr1) === JSON.stringify(arr2);
  };

  // Cargar la lista de conversaciones de trueques - usando useCallback para mantener referencia estable
  const fetchConversations = useCallback(async (isBackgroundFetch = false) => {
    try {
      if (!isBackgroundFetch) setLoading(true);
      else setBackgroundLoading(true);

      // Si usamos mocks, usar datos locales
      if (config.useMocks) {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (!areArraysEqual(MOCK_TRUEQUE_CONVERSATIONS, lastConversationsData.current)) {
          setConversations(MOCK_TRUEQUE_CONVERSATIONS);
          lastConversationsData.current = MOCK_TRUEQUE_CONVERSATIONS;
        }
        
        // Simular carga de trueques mock (podrías agregar más datos aquí si es necesario)
        setTrueques([]);
        
        return;
      }

      // Usar el nuevo endpoint específico para conversaciones de trueques
      const response = await fetch(`${BACKEND_URL}/get_trueque_chats.php`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Error al obtener las conversaciones de trueques");
      }

      const data = await response.json();

      if (data.success) {
        // Verificar si los datos son diferentes antes de actualizar el estado
        if (!areArraysEqual(data.chats, lastConversationsData.current)) {
          setConversations(data.chats || []);
          lastConversationsData.current = data.chats;
        }

        // Obtener información de los trueques para contexto
        const truequeResponse = await fetch(`${BACKEND_URL}/get_trueques.php`, {
          credentials: "include",
        });

        if (truequeResponse.ok) {
          const truequeData = await truequeResponse.json();
          if (truequeData.success) {
            setTrueques(truequeData.trueques);
          }
        }
      } else {
        throw new Error(data.error || "Error desconocido");
      }
    } catch (error) {
      console.error("Error al cargar conversaciones de trueques:", error);
      if (!isBackgroundFetch) {
        setError("No se pudieron cargar las conversaciones de trueques");
      }
    } finally {
      if (!isBackgroundFetch) setLoading(false);
      else setBackgroundLoading(false);
    }
  }, []);

  // Modificar la función fetchMessages para mejor manejo de mensajes
  const fetchMessages = useCallback(
    async (isBackgroundFetch = false) => {
      if (!selectedChat) return;

      try {
        if (!isBackgroundFetch) setLoading(true);

        // Si usamos mocks, usar datos locales
        if (config.useMocks) {
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const chatMessages = MOCK_TRUEQUE_MESSAGES[selectedChat.id] || [];
          setMessages(chatMessages);
          
          return;
        }

        const response = await fetch(
          `${BACKEND_URL}/get_trueque_messages.php?chat_id=${selectedChat.id}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Error al obtener los mensajes");
        }

        const data = await response.json();

        if (data.success) {
          // Actualizar los mensajes preservando los optimistas no confirmados
          setMessages((prevMessages) => {
            // Obtener los mensajes del servidor
            const serverMessages = data.messages || [];

            // Mantener mensajes optimistas que no tienen representación en el servidor
            const optimisticMessages = prevMessages.filter(
              (msg) =>
                msg._optimistic &&
                !serverMessages.some(
                  (sMsg) =>
                    sMsg.temp_id === msg.id || // Si el servidor tiene el ID temporal
                    (sMsg.message === msg.message && // O si hay un mensaje idéntico con timestamp cercano
                      Math.abs(new Date(sMsg.sent_at) - new Date(msg.sent_at)) <
                        5000)
                )
            );

            // Combinar y ordenar por tiempo
            return [...serverMessages, ...optimisticMessages].sort(
              (a, b) => new Date(a.sent_at) - new Date(b.sent_at)
            );
          });
        }
      } catch (error) {
        console.error("Error al cargar mensajes:", error);
        if (!isBackgroundFetch) {
          setError("No se pudieron cargar los mensajes");
        }
      } finally {
        if (!isBackgroundFetch) setLoading(false);
      }
    },
    [selectedChat, setLoading, setError]
  );

  // Efecto inicial para cargar conversaciones
  useEffect(() => {
    fetchConversations();

    // Reducir el intervalo a 30 segundos en lugar de 60
    const intervalId = setInterval(() => fetchConversations(true), 30000);
    return () => clearInterval(intervalId);
  }, [fetchConversations]);

  // Modificar la frecuencia de actualización y manejo de mensajes
  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
      lastMessagesData.current = null;

      // Aumentar la frecuencia de actualización a 3 segundos
      const intervalId = setInterval(() => fetchMessages(true), 3000);
      return () => clearInterval(intervalId);
    }
  }, [selectedChat, fetchMessages]);

  // Hacer scroll automático a los mensajes más recientes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Modificar la función sendMessageToServer para ser más directa y rápida
  const sendMessageToServer = useCallback(
    async (messageText, otherUserId, truequeId, chatId, tempId) => {
      // Si usamos mocks, simular envío exitoso
      if (config.useMocks) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Simular mensaje enviado exitosamente
        const sentMessage = {
          id: Date.now(),
          from_user_id: user?.id || 1,
          from_user_name: user?.name || "Usuario Demo",
          to_user_id: otherUserId,
          message: messageText,
          sent_at: new Date().toISOString(),
          read_at: null,
          _sent: true,
          _sending: false,
          _failed: false
        };
        
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === tempId ? sentMessage : msg
          )
        );
        
        return true;
      }
      
      try {
        // Eliminar el timeout y hacer una petición directa
        const response = await fetch(
          `${BACKEND_URL}/send_trueque_message.php`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to_user_id: otherUserId,
              message: messageText,
              trueque_id: truequeId || null,
              chat_id: chatId || null,
              temp_id: tempId,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Error en la respuesta: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          // Actualizar instantáneamente el mensaje en la UI
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === tempId
                ? {
                    ...data.message,
                    _sent: true,
                    _sending: false,
                    _failed: false,
                  }
                : msg
            )
          );

          // Forzar una actualización inmediata de las conversaciones
          setTimeout(() => fetchConversations(true), 100);

          return true;
        } else {
          throw new Error(data.error || "Error al enviar el mensaje");
        }
      } catch (error) {
        console.error("Error al enviar mensaje:", error);
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === tempId ? { ...msg, _failed: true, _sending: false } : msg
          )
        );
        throw error;
      }
    },
    [fetchConversations]
  );

  // Reemplazo con un enfoque más directo
  const sendTruequeMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !selectedChat) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    // Crear ID único para el mensaje
    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    // Obtener datos necesarios
    const otherUserId =
      selectedChat.user1_id === user.id
        ? selectedChat.user2_id
        : selectedChat.user1_id;

    const relatedTrueque = findRelatedTrueque(otherUserId);
    const truequeId = relatedTrueque
      ? relatedTrueque.id
      : selectedChat.trueque_id;

    // Crear mensaje optimista
    const optimisticMessage = {
      id: tempId,
      sender_id: user.id,
      receiver_id: otherUserId,
      message: messageText,
      sent_at: new Date().toISOString(),
      formatted_time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      is_read: 0,
      _optimistic: true,
      _sending: true,
    };

    // Añadir inmediatamente el mensaje a la interfaz
    setMessages((prevMessages) => [...prevMessages, optimisticMessage]);

    // Forzar scroll inmediato
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    });

    // Enviar el mensaje directamente sin usar cola
    try {
      await sendMessageToServer(
        messageText,
        otherUserId,
        truequeId,
        selectedChat.id,
        tempId
      );
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
    }
  };

  // Formatear la URL de la foto de perfil
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

  // Formatear la URL de una imagen de trueque
  const formatTruequeUrl = (imagePath) => {
    if (!imagePath) return "";

    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    if (imagePath.includes("public/uploads/")) {
      return `${BACKEND_URL}/${imagePath}`;
    }

    return `${BACKEND_URL}/public/uploads/${imagePath}`;
  };

  // Obtener el nombre del otro usuario en la conversación de trueque
  const getOtherUserName = (chat) => {
    if (!chat) return "";

    return chat.user1_id === user.id ? chat.user2_name : chat.user1_name;
  };

  // Encontrar el trueque relacionado con la conversación (si existe)
  const findRelatedTrueque = (otherUserId) => {
    return trueques.find(
      (trueque) =>
        trueque.user_id === otherUserId || trueque.user_id === user.id
    );
  };

  return (
    <div className="trueque-messages-container">
      <div className="trueque-messages-header">
        <Link to="/comunidad/trueques" className="back-to-trueques-button">
          <span className="back-icon">←</span> Volver a Trueques
        </Link>
        {backgroundLoading && (
          <span
            className="background-refresh-indicator"
            title="Actualizando..."
          >
            •
          </span>
        )}
      </div>

      <div className="trueque-chat-container">
        <div className="trueque-chat-sidebar">
          <h2>Mis Conversaciones de Trueques</h2>
          {loading && !selectedChat && (
            <div className="trueque-loading-indicator">
              Cargando conversaciones de trueques...
            </div>
          )}
          {error && !selectedChat && (
            <div className="trueque-error-message">{error}</div>
          )}

          {conversations.length === 0 && !loading ? (
            <div className="trueque-empty-state">
              <p>No tienes conversaciones de trueques aún.</p>
              <p>
                Cuando contactes con alguien por un trueque o alguien te
                contacte, la conversación aparecerá aquí.
              </p>
            </div>
          ) : (
            <ul className="trueque-conversation-list">
              {conversations.map((chat) => {
                const isActive = selectedChat && selectedChat.id === chat.id;
                const otherUserName = getOtherUserName(chat);
                const otherUserId =
                  chat.user1_id === user.id ? chat.user2_id : chat.user1_id;
                const relatedTrueque = findRelatedTrueque(otherUserId);
                // Determinar si hay mensajes no leídos para el usuario actual
                const hasUnread =
                  user.id === chat.user1_id
                    ? chat.unread_count_user1 > 0
                    : chat.unread_count_user2 > 0;
                // Obtener el conteo de mensajes no leídos para mostrar
                const unreadCount =
                  user.id === chat.user1_id
                    ? chat.unread_count_user1
                    : chat.unread_count_user2;

                return (
                  <li
                    key={chat.id}
                    className={`trueque-conversation-item ${
                      isActive ? "trueque-active" : ""
                    } ${hasUnread ? "trueque-unread" : ""}`}
                    onClick={() => setSelectedChat(chat)}
                  >
                    <div className="trueque-conversation-avatar-container">
                      <img
                        src={formatPhotoUrl(
                          chat.user1_id === user.id
                            ? chat.user2_photo
                            : chat.user1_photo
                        )}
                        alt={otherUserName}
                        className="trueque-chat-list-avatar"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `${BACKEND_URL}/public/uploads/profiles/default_profile.jpg`;
                        }}
                      />
                      {relatedTrueque && (
                        <div
                          className="trueque-badge"
                          title={relatedTrueque.title}
                        >
                          <img
                            src={formatTruequeUrl(relatedTrueque.image_path)}
                            alt={relatedTrueque.title}
                            className="trueque-thumbnail"
                          />
                        </div>
                      )}
                    </div>
                    <div className="trueque-conversation-info">
                      <span className="trueque-conversation-name">
                        {otherUserName}
                      </span>
                      <span className="trueque-conversation-preview">
                        {chat.last_message}
                      </span>
                    </div>
                    {hasUnread && (
                      <span className="trueque-unread-badge">
                        {unreadCount}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="trueque-chat-content">
          {selectedChat ? (
            <>
              <div className="trueque-chat-header">
                <div className="trueque-chat-user-info">
                  <img
                    src={formatPhotoUrl(
                      selectedChat.user1_id === user.id
                        ? selectedChat.user2_photo
                        : selectedChat.user1_photo
                    )}
                    alt={getOtherUserName(selectedChat)}
                    className="trueque-chat-header-avatar"
                  />
                  <h3>{getOtherUserName(selectedChat)}</h3>
                </div>

                {/* Mostrar información del trueque si está disponible */}
                {(() => {
                  const otherUserId =
                    selectedChat.user1_id === user.id
                      ? selectedChat.user2_id
                      : selectedChat.user1_id;
                  const relatedTrueque = findRelatedTrueque(otherUserId);

                  if (relatedTrueque) {
                    return (
                      <div className="trueque-context">
                        <div className="trueque-info">
                          <span>Trueque: {relatedTrueque.title}</span>
                          <span className="trueque-city">
                            {relatedTrueque.city}
                          </span>
                        </div>
                        <img
                          src={formatTruequeUrl(relatedTrueque.image_path)}
                          alt={relatedTrueque.title}
                          className="trueque-image"
                        />
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="trueque-chat-messages">
                {loading ? (
                  <div className="trueque-loading-indicator">
                    Cargando mensajes de trueque...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="trueque-empty-state">
                    <p>No hay mensajes en esta conversación.</p>
                    <p>¡Envía el primer mensaje sobre el trueque!</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, index) => {
                      const isMyMessage = msg.sender_id === user.id;
                      const isFailed = msg._failed;
                      const isSending = msg._sending;

                      // Unique key con index para evitar colisiones
                      const uniqueKey = `msg-${msg.id || "temp"}-${index}`;

                      // Función para formatear la hora de manera segura
                      const getFormattedTime = () => {
                        if (msg.formatted_time) {
                          return msg.formatted_time;
                        }

                        try {
                          // Verificar si sent_at existe y es una fecha válida
                          const date = msg.sent_at
                            ? new Date(msg.sent_at)
                            : null;

                          // Verificar que sea una fecha válida verificando si el método getTime() no retorna NaN
                          if (date && !isNaN(date.getTime())) {
                            return date.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                          }

                          // Si llegamos aquí, la fecha no es válida, devolver hora actual como fallback
                          return new Date().toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                        } catch (error) {
                          console.warn("Error al formatear fecha:", error);
                          // En caso de cualquier error, devolver hora actual
                          return new Date().toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                        }
                      };

                      return (
                        <div
                          key={uniqueKey}
                          className={`trueque-message ${
                            isMyMessage
                              ? "trueque-my-message"
                              : "trueque-their-message"
                          } ${isFailed ? "trueque-message-failed" : ""} ${
                            isSending ? "trueque-message-sending" : ""
                          }`}
                        >
                          <div className="trueque-message-bubble">
                            <p>{msg.message}</p>
                            <div className="trueque-message-status">
                              <span className="trueque-message-time">
                                {getFormattedTime()}
                              </span>
                              {isMyMessage && (
                                <>
                                  {isSending && (
                                    <span className="sending-indicator">
                                      Enviando...
                                    </span>
                                  )}
                                  {isFailed && (
                                    <button
                                      className="retry-button"
                                      onClick={() => {
                                        // Eliminar mensaje fallido
                                        setMessages((prev) =>
                                          prev.filter((m) => m.id !== msg.id)
                                        );

                                        // Reintentar enviando un nuevo mensaje
                                        const otherUserId =
                                          selectedChat.user1_id === user.id
                                            ? selectedChat.user2_id
                                            : selectedChat.user1_id;
                                        const relatedTrueque =
                                          findRelatedTrueque(otherUserId);
                                        const truequeId = relatedTrueque
                                          ? relatedTrueque.id
                                          : selectedChat.trueque_id;

                                        // Enviar directamente el mensaje
                                        sendMessageToServer(
                                          msg.message,
                                          otherUserId,
                                          truequeId,
                                          selectedChat.id,
                                          `retry-${Date.now()}`
                                        );
                                      }}
                                    >
                                      Reintentar envío
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <form
                className="trueque-message-input-container"
                onSubmit={sendTruequeMessage}
              >
                <input
                  type="text"
                  placeholder="Escribe un mensaje sobre el trueque..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="trueque-message-input"
                />
                <button
                  type="submit"
                  id="trueque-chat-send-button"
                  className="custom-trueque-send-btn"
                  disabled={!newMessage.trim()}
                >
                  Enviar
                </button>
              </form>
            </>
          ) : (
            <div className="trueque-no-chat-selected">
              <div className="trueque-empty-state">
                <h3>Selecciona una conversación</h3>
                <p>
                  Elige una conversación de la lista para ver los mensajes sobre
                  el trueque.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TruequeMessages;
