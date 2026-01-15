import React from "react";
import { useNavigate } from "react-router-dom";
import phrases from "./phrases";
import "./NotFound.css";
import notFoundImg from "../assets/images/notfound3.png";

// Este componente muestra una página de error 404 personalizada
// Utiliza frases divertidas relacionadas con la maternidad para hacer
// la experiencia más cercana y menos frustrante
// Incluye una imagen ilustrativa y botones para navegar hacia atrás
// o volver a la página de inicio, facilitando que las usuarias
// encuentren su camino de vuelta

const NotFound = () => {
  const navigate = useNavigate();

  // Función para seleccionar una frase aleatoria del array de frases
  const getRandomPhrase = () => {
    const randomIndex = Math.floor(Math.random() * phrases.length);
    return phrases[randomIndex];
  };

  const randomPhrase = getRandomPhrase();

  return (
    <div className="container">
      <img src={notFoundImg} alt="Ilustración divertida" className="image" />
      <h1 className="title">¡Oops! Algo se perdió...</h1>
      <p className="phrase">{randomPhrase}</p>
      <div className="button-container">
        <button
          className="button button-secondary"
          onClick={() => navigate(-1)}
        >
          Volver
        </button>
        <button className="button button-primary" onClick={() => navigate("/")}>
          Ir al inicio
        </button>
      </div>
    </div>
  );
};

export default NotFound;
