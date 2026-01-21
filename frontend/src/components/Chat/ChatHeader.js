import React from "react";
import { config } from "../../config";

// Este componente muestra la cabecera del chat con la foto y nombre de la otra usuaria.
// Tuve que crear una función especial para formatear las URLs de las fotos de perfil,
// ya que pueden venir en varios formatos diferentes (rutas relativas, absolutas, URLs completas)
//--
// Me aseguré de manejar el caso en que no hay foto de perfil, mostrando una imagen por defecto.
// También añadí un botón para cerrar el chat y volver a la lista de matches.
//--
// Es un componente simple pero importante para la experiencia de usuario, ya que
// ayuda a identificar rápidamente con quién se está chateando

const BACKEND_URL = config.useMocks ? null : "http://localhost/mommatch/backend";

const ChatHeader = ({ otherUser, onClose }) => {
  // Formatear la URL de la foto de perfil
  const formatPhotoUrl = (photoPath) => {
    if (config.useMocks) {
      if (!photoPath) return `${process.env.PUBLIC_URL}/uploads/profiles/default_profile.jpg`;
      if (photoPath.startsWith("http")) return photoPath;
      if (photoPath.startsWith("/public/")) {
        return `${process.env.PUBLIC_URL}${photoPath.substring(7)}`;
      }
      return `${process.env.PUBLIC_URL}/uploads/profiles/${photoPath}`;
    }

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

  return (
    <div className="chat-header">
      {otherUser && (
        <>
          <img
            src={formatPhotoUrl(otherUser.profile_photo)}
            alt={otherUser.name}
            className="chat-profile-photo"
          />
          <h3>{otherUser.name}</h3>
        </>
      )}
      <button className="chat-close-btn" onClick={onClose} title="Cerrar chat">
        ✕
      </button>
    </div>
  );
};

export default ChatHeader;
