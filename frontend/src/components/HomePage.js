import React, { useState } from "react";
import "./HomePage.css";
import { useNavigate } from "react-router-dom";

// La página de inicio es la primera impresión que reciben las usuarias,
// así que quería que fuera atractiva y sencilla a la vez.
//--
// La estructura de dos columnas (imagen + registro) funciona bien en
// todas las pantallas y la animación de carga de la imagen principal
// da un toque profesional sin complicar demasiado el código.
//--
// Probé varias imágenes para la portada hasta encontrar una que transmitiera
// bien el concepto de conexión entre madres. Los botones de registro e inicio
// de sesión tienen estilos diferentes para dirigir a las nuevas usuarias
// hacia la opción de registro.

function HomePage() {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="mommatch-homepage__container">
      {/* Sección izquierda - Imagen */}
      <div className="mommatch-homepage__left-section">
        <img
          src="/mommatch_demo/Portada1.jpg"
          alt="Mamás con bebés"
          className={`mommatch-homepage__main-image ${
            imageLoaded ? "loaded" : ""
          }`}
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      {/* Sección derecha - Registro */}
      <div className="mommatch-homepage__right-section">
        <h1 className="mommatch-homepage__title">Conecta con otras mamás</h1>
        <p className="mommatch-homepage__subtitle">
          Únete a la comunidad y encuentra tu red de apoyo
        </p>

        <button
          className="mommatch-homepage__email-btn"
          onClick={() => navigate("/register")}
        >
          Regístrate con tu email
        </button>

        <p className="mommatch-homepage__login-text">¿Ya tienes cuenta?</p>

        <button
          className="mommatch-homepage__login-btn"
          onClick={() => navigate("/login")}
        >
          Inicia sesión
        </button>
      </div>
    </div>
  );
}

export default HomePage;
