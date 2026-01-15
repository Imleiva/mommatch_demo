import React from "react";
import { Link } from "react-router-dom";
import "./Comunidad.css";

// Esta página muestra las diferentes secciones
// de la comunidad: foro, trueques y eventos. La diseñé con un enfoque
// visual, usando tarjetas con imágenes representativas para que sea
// intuitivo y atractivo.
//--
// Cada tarjeta tiene su propio enlace a la sección correspondiente,
// lo que facilita la navegación. Consideré usar iconos en lugar de
// imágenes, pero las imágenes transmiten mejor la idea de cada sección

const Comunidad = () => {
  return (
    <div className="comunidad-container">
      {/* Contenedor que engloba la introducción y las tarjetas */}
      <div className="comunidad-intro-wrapper">
        {/* Sección de introducción */}
        <div className="comunidad-intro">
          <h2>Descubre nuestras comunidades</h2>
          <p>
            Conecta con otras mamás, comparte experiencias y encuentra apoyo en
            estos espacios:
          </p>
        </div>

        <section className="comunidad-features">
          <div className="feature-cards">
            <div className="feature-card">
              <div className="card-image-container">
                {/* Espacio para la imagen del foro */}
                <img
                  src="/mommatch_demo/images/comunidad/foro/foro.jpg"
                  alt="Foro de mamás"
                />
                <div className="card-image-placeholder"></div>
              </div>
              <div className="card-content">
                <h3>Foro de mamás</h3>
                <p>
                  Comparte experiencias, pregunta dudas y conecta con otras
                  mamás en un espacio seguro y respetuoso.
                </p>
                <Link to="/comunidad/foro">
                  <button className="card-button">Ir al foro</button>
                </Link>
              </div>
            </div>

            <div className="feature-card">
              <div className="card-image-container">
                {/* Espacio para la imagen de trueque */}
                <img
                  src="/mommatch_demo/images/comunidad/trueque/trueque.jpg"
                  alt="Zona de trueque"
                />
                <div className="card-image-placeholder"></div>
              </div>
              <div className="card-content">
                <h3>Zona de trueque</h3>
                <p>
                  Intercambia ropa, juguetes y artículos para bebés que ya no
                  utilizas con otras mamás de tu comunidad.
                </p>
                <Link to="/comunidad/trueques" className="card-button">
                  Explorar trueques
                </Link>
              </div>
            </div>

            <div className="feature-card">
              <div className="card-image-container">
                {/* Espacio para la imagen de eventos */}
                <img
                  src="/mommatch_demo/images/comunidad/eventos/eventos.jpg"
                  alt="Eventos"
                />
                <div className="card-image-placeholder"></div>
              </div>
              <div className="card-content">
                <h3>Eventos en tu ciudad</h3>
                <p>
                  Descubre actividades, talleres y encuentros para mamás y
                  peques cerca de ti.
                </p>
                <Link to="/comunidad/eventos" className="card-button">
                  Ver eventos
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Comunidad;
