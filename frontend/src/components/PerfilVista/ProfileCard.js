import React from "react";

// Un componente reutilizable que encapsula la estructura de tarjeta usada en la vista
// de perfil. Lo creé para no repetir código HTML/CSS en cada sección del perfil
// Recibe un título y muestra los children dentro
// del cuerpo de la tarjeta.

const ProfileCard = ({ title, children, className }) => {
  return (
    <section className={`mommatch-profile-view__card ${className || ""}`}>
      <div className="mommatch-profile-view__card-header">
        <h3>{title}</h3>
      </div>
      <div className="mommatch-profile-view__card-body">{children}</div>
    </section>
  );
};

export default ProfileCard;
