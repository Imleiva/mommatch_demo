import React from "react";
import "./Conocenos.css";
import { useNavigate } from "react-router-dom";

// Esta página "Conócenos" es informativa de la app MomMatch.
// Quería que fuera visualmente impactante pero también emotiva, para
// conectar con las mamás.
//
// Trabajé mucho en la organización visual con imágenes decorativas que
// complementan el texto. El efecto de overlay en las imágenes mejora la
// legibilidad del texto superpuesto sin perder el impacto visual.
//
// Un pequeño detalle que añadí es que al hacer clic en "Únete ahora",
// primero hacemos scroll al inicio de la página antes de navegar, para
// que la experiencia sea más fluida y la usuaria no se sienta desorientada.

const Conocenos = () => {
  const navigate = useNavigate();

  const handleJoinClick = () => {
    // Restablecer el scroll a la parte superior antes de navegar
    window.scrollTo(0, 0);
    document.body.scrollTop = 0; // Para Safari
    document.documentElement.scrollTop = 0; // Para Chrome, Firefox, IE y Opera

    // Navegar a la página de registro
    navigate("/register");
  };

  return (
    <div className="conocenos-container">
      {/* Agregar un pequeño script para forzar la recarga de imágenes */}
      <div style={{ display: "none" }}>
        {console.log("Forzando recarga de recursos: " + new Date().getTime())}
      </div>

      <div className="conocenos-hero">
        {/* Añadir el div para el GIF de fondo */}
        <div className="gif-background"></div>
        {/* Capa semitransparente para mejorar legibilidad */}
        <div className="overlay"></div>
        <h1 className="conocenos-title">Conócenos</h1>
        <p className="conocenos-tagline">
          Porque la maternidad es mejor en compañía
        </p>
      </div>

      <div className="conocenos-content">
        <section className="conocenos-section">
          <h2 className="conocenos-subtitle">Nuestra Misión</h2>
          <p>
            <strong>MomMatch</strong> nace para crear una comunidad de apoyo
            entre madres. Creemos firmemente que{" "}
            <strong>la crianza es mejor en comunidad</strong> y que para cuidar
            bien de nuestros hijos, primero debemos cuidarnos a nosotras mismas.
          </p>
        </section>

        <section className="conocenos-section">
          <h2 className="conocenos-subtitle">¿Qué te ofrecemos?</h2>
          <div className="conocenos-offer-container">
            <div className="conocenos-cards">
              {/* Primera etapa - Espacio seguro */}
              <div className="conocenos-card">
                <h3>Espacio Seguro</h3>
                <p>
                  Un lugar libre de juicios donde expresarte con total libertad
                  y compartir tus experiencias sin miedo al qué dirán.
                </p>
              </div>

              {/* Imagen decorativa izquierda */}
              <div className="image-container">
                <img
                  src="/mommatch_demo/images/conocenos/conocenosL.jpg"
                  alt=""
                  className="decorative-image-left"
                  aria-hidden="true"
                />
                <div className="image-overlay">Comparte tu experiencia</div>
              </div>

              {/* Conexiones reales */}
              <div className="conocenos-card">
                <h3>Conexiones Reales</h3>
                <p>
                  Encuentra mamás con intereses y experiencias similares a las
                  tuyas, creando vínculos significativos que perduran.
                </p>
              </div>

              {/* Imagen decorativa extra - en medio */}
              <div className="image-container">
                <img
                  src="/mommatch_demo/images/conocenos/hands.jpg"
                  alt=""
                  className="decorative-image-extra"
                  aria-hidden="true"
                />
                <div className="image-overlay">Unidas somos más fuertes</div>
              </div>

              {/* Apoyo emocional */}
              <div className="conocenos-card">
                <h3>Apoyo Emocional</h3>
                <p>
                  Comparte tus alegrías y desafíos con quienes realmente te
                  entienden porque están viviendo experiencias similares.
                </p>
              </div>

              {/* Imagen decorativa derecha */}
              <div className="image-container">
                <img
                  src="/mommatch_demo/images/conocenos/conocenosR.jpg"
                  alt=""
                  className="decorative-image-right"
                  aria-hidden="true"
                />
                <div className="image-overlay">Apoyo mutuo</div>
              </div>

              {/* Comunidad activa */}
              <div className="conocenos-card">
                <h3>Comunidad Activa</h3>
                <p>
                  Participa en eventos, intercambios y conversaciones
                  enriquecedoras que te ayudarán a crecer como madre y como
                  persona.
                </p>
              </div>

              {/* Imagen decorativa final */}
              <div className="image-container">
                <img
                  src="/mommatch_demo/images/conocenos/family.png"
                  alt=""
                  className="decorative-image-final"
                  aria-hidden="true"
                />
                <div className="image-overlay">Conexión en familia</div>
              </div>

              {/* Cita inspiradora */}
              <div className="conocenos-quote">
                Cuando una madre abraza a otra con empatía, el mundo se vuelve
                un lugar más habitable.
              </div>
            </div>
          </div>
        </section>

        <section className="conocenos-section">
          <h2 className="conocenos-subtitle">¿Por qué unirte?</h2>
          <p>
            En <strong>MomMatch</strong> encontrarás un espacio donde sentirte
            comprendida, apoyada y acompañada en tu camino como madre. Porque
            juntas somos más fuertes. Porque juntas somos MomMatch.
          </p>

          {/* Imagen panorámica final */}
          <div className="conocenos-offer-container">
            <div className="conocenos-cards">
              <div className="image-container">
                <img
                  src="/mommatch_demo/images/conocenos/moms-together1.jpg"
                  alt=""
                  className="decorative-image-bottom"
                  aria-hidden="true"
                />
                <div className="image-overlay">
                  La maternidad es mejor cuando la compartimos
                </div>
              </div>
            </div>
          </div>

          <div className="button-container">
            <button className="button button-primary" onClick={handleJoinClick}>
              Únete ahora
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Conocenos;
