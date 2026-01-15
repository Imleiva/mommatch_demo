import React from "react";

// Este componente maneja la cabecera de la vista de perfil, mostrando la foto,
// el título y el botón de edición. Incluí un manejador de errores para la imagen
// que muestra una foto por defecto si la original falla al cargar
// Tuve algunos problemas con las rutas de las imágenes, pero el onError resuelve
// la mayoría de los casos

const Header = ({ profilePhoto, onEdit }) => {
  return (
    <header className="mommatch-profile-view__header">
      <div className="mommatch-profile-view__avatar">
        <img
          src={profilePhoto}
          alt="Foto de perfil"
          className="mommatch-profile-view__avatar-img"
          onError={(e) => {
            if (
              e.target.src !==
              "http://localhost/mommatch/backend/public/uploads/profiles/default_profile.jpg"
            ) {
              e.target.onerror = null; // Evita bucles infinitos
              e.target.src =
                "http://localhost/mommatch/backend/public/uploads/profiles/default_profile.jpg"; // Imagen predeterminada
            }
          }}
        />
      </div>
      <div className="mommatch-profile-view__title-container">
        <h1 className="mommatch-profile-view__title">Tu Perfil</h1>
        <p className="mommatch-profile-view__subtitle">
          Información personal y preferencias
        </p>
      </div>
      <button className="mommatch-profile-view__edit-btn" onClick={onEdit}>
        Editar Perfil
      </button>
    </header>
  );
};

export default Header;
