import React, { useState, useEffect, useRef, useCallback } from "react";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import "../Chat.css";

// Este es el componente principal del chat, coordina todos los demás
// Problemas implementar la actualización en tiempo real sin recurrir a websockets.
// Al final opté por un enfoque de polling donde consultamos al servidor cada 30 segundos.
// No es tan elegante como los websockets, pero es mucho más sencillo de implementar
// y funciona bien para la escala actual de usuarias.
//
// También tuve algunos problemas de rendimiento cuando había muchos
// mensajes, por eso implementé useCallback para la función fetchMessages.
// Actualment el chat ahora funciona de manera fluida incluso con historiales largos.

const BACKEND_URL = "http://localhost/mommatch/backend";
const CHAT_UPDATE_INTERVAL = 30000; // Aumentado de 10000 a 30000 (30 segundos)

const Chat = ({ match, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const chatBodyRef = useRef(null);

  // Función para obtener los mensajes con useCallback
  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/get_messages.php?other_user_id=${match.id}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Error al obtener los mensajes");
      }

      const data = await response.json();

      if (data.success) {
        setMessages(data.messages || []);
        setOtherUser(data.other_user || null);
      } else {
        throw new Error(data.error || "Error desconocido");
      }
    } catch (error) {
      console.error("Error al cargar los mensajes:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [match.id]);

  // Función para enviar un mensaje
  const sendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    try {
      const response = await fetch(`${BACKEND_URL}/send_message.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          receiver_id: match.id,
          message: newMessage.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Error al enviar el mensaje");
      }

      const data = await response.json();

      if (data.success) {
        // Añadir el nuevo mensaje a la lista de mensajes
        setMessages((prevMessages) => [...prevMessages, data.message]);
        // Limpiar el input
        setNewMessage("");
      } else {
        throw new Error(data.error || "Error desconocido");
      }
    } catch (error) {
      console.error("Error al enviar el mensaje:", error);
      setError(error.message);

      // Limpiar el mensaje de error después de 3 segundos
      setTimeout(() => setError(null), 3000);
    }
  };

  // Cargar mensajes al montar el componente
  useEffect(() => {
    fetchMessages();

    // Configurar un intervalo para actualizar los mensajes cada 30 segundos (aumentado de 10 segundos)
    const intervalId = setInterval(fetchMessages, CHAT_UPDATE_INTERVAL);

    // Limpiar el intervalo al desmontar el componente
    return () => clearInterval(intervalId);
  }, [fetchMessages]);

  return (
    <div className="chat-container">
      <ChatHeader otherUser={otherUser} onClose={onClose} />

      <div className="chat-body" ref={chatBodyRef}>
        <MessageList
          messages={messages}
          loading={loading}
          error={error}
          match={match}
        />
      </div>

      <MessageInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        sendMessage={sendMessage}
      />
    </div>
  );
};

export default Chat;
