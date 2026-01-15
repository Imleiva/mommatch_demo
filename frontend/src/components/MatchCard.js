/**
 * Componentes para el sistema de matchmaking
 *
 * Este archivo define los componentes MatchCard y MatchList que manejan la presentación
 * de perfiles de usuarios y la interfaz de swipe (estilo Tinder) para conectar con otras madres.
 */
import React, { useState } from "react";
import LoadingSpinner from "./LoadingSpinner";
import "./MatchCard.css";

// URL base para todos los endpoints del backend
const BACKEND_URL = "http://localhost/mommatch/backend";

/**
 * Formatea la ruta de la foto de perfil para garantizar URLs correctas
 *
 * Esta función normaliza las diferentes formas en que pueden venir las rutas de imágenes
 * desde la base de datos, asegurando que siempre se use la URL completa y correcta.
 *
 * @param {string} photoPath - Ruta de la foto recibida del servidor
 * @returns {string} - URL completa y formateada de la foto
 */
const formatPhotoUrl = (photoPath) => {
  if (!photoPath)
    return `${BACKEND_URL}/public/uploads/profiles/default_profile.jpg`;

  // Si la ruta ya contiene la estructura URL completa, la devolvemos como está
  if (
    photoPath.startsWith(
      "http://localhost/mommatch/backend/public/uploads/profiles/"
    )
  ) {
    return photoPath;
  }

  // Si comienza con /mommatch/backend
  if (photoPath.startsWith("/mommatch/backend/public/uploads/profiles/")) {
    return `http://localhost${photoPath}`;
  }

  // Si es solo un nombre de archivo como "user_1.jpg", añadimos la ruta completa
  if (photoPath.includes("user_") || photoPath.includes("default_profile")) {
    // Verificar si comienza con /public/ o solo el nombre del archivo
    if (photoPath.startsWith("/public/uploads/profiles/")) {
      return `${BACKEND_URL}${photoPath}`;
    } else {
      return `${BACKEND_URL}/public/uploads/profiles/${photoPath}`;
    }
  }

  // Si comienza con /public/uploads, añadimos la URL del backend
  if (photoPath.startsWith("/public/uploads/")) {
    return `${BACKEND_URL}${photoPath}`;
  }

  // Si la ruta viene directamente de la base de datos sin "/" inicial, añadimos la ruta completa
  if (photoPath.startsWith("public/uploads/profiles/")) {
    return `${BACKEND_URL}/${photoPath}`;
  }

  return photoPath;
};

/**
 * Componente de tarjeta individual para mostrar un perfil de usuario
 * Incluye modos de vista simple y detallada, así como acciones para like/reject
 *
 * @param {Object} profile - Datos del perfil a mostrar
 * @param {Function} onLike - Función a ejecutar cuando se da "Me gusta"
 * @param {Function} onReject - Función a ejecutar cuando se rechaza el perfil
 * @param {boolean} isLoading - Indica si se está cargando el perfil
 * @param {Function} onViewChange - Notifica cuando cambia el modo de vista
 * @param {Object | null} message - Mensaje de feedback para mostrar
 */
const MatchCard = ({
  profile,
  onLike,
  onReject,
  isLoading,
  onViewChange,
  message,
}) => {
  // Estado para controlar si se muestra la vista simple o detallada
  const [showDetails, setShowDetails] = useState(false);

  // Mostrar indicador de carga mientras se carga el perfil
  if (isLoading) {
    return <LoadingSpinner text="Cargando perfil..." />;
  }

  // Formatear URL de la foto de perfil
  const profilePhoto = formatPhotoUrl(profile.profile_photo);

  // Manejadores de eventos para las acciones de la tarjeta
  const handleLike = () => {
    onLike(profile.id);
  };

  const handleReject = () => {
    onReject(profile.id);
  };

  // Alterna entre vista simple y detallada y notifica al componente padre
  const toggleView = () => {
    const newState = !showDetails;
    setShowDetails(newState);

    // Notificar al componente padre del cambio de vista
    if (onViewChange) {
      onViewChange(newState);
    }
  };

  return (
    <div className="match-card fade-in">
      {!showDetails ? (
        // Vista principal: información básica del perfil
        <>
          <div className="match-card__avatar">
            <img
              src={profilePhoto}
              alt={profile.name}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `${BACKEND_URL}/public/uploads/profiles/default_profile.jpg`;
              }}
            />
          </div>
          <h3>{profile.name}</h3>
          <p className="match-card__location">
            Ciudad: {profile.city || "No especificada"}
          </p>

          {/* Botón para expandir a vista detallada */}
          <div className="match-card__view-more">
            <button
              onClick={toggleView}
              className="match-card__view-button view-more-button"
            >
              Ver más sobre {profile.name.split(" ")[0]}
            </button>
          </div>
        </>
      ) : (
        // Vista detallada: muestra intereses, presentación, condiciones especiales y etapas de hijos
        <div className="match-card__details-view">
          {/* Mostrar los intereses/tags si existen */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="match-card__interests visible">
              <h4>Mis intereses</h4>
              <div className="match-card__tags">
                {profile.interests.map((interest, index) => (
                  <span key={index} className="match-card__tag">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}{" "}
          {/* Agrupar condiciones especiales y etapas de hijos en una fila */}
          <div className="match-card__secondary-sections">
            {/* Sección de condiciones especiales - Solo se muestra si hay condiciones */}
            {(() => {
              // Procesar condiciones especiales para determinar si hay que mostrar la sección
              let conditions = [];
              let hasConditions = false;

              if (profile.special_conditions) {
                if (typeof profile.special_conditions === "string") {
                  // Si es un string simple, intenta verificar si es un JSON
                  if (
                    profile.special_conditions.startsWith("[") ||
                    profile.special_conditions.startsWith("{")
                  ) {
                    try {
                      const parsed = JSON.parse(profile.special_conditions);
                      conditions = Array.isArray(parsed)
                        ? parsed
                        : [profile.special_conditions];
                    } catch (e) {
                      // Si no es un JSON válido, tratarlo como string normal
                      conditions = [profile.special_conditions];
                    }
                  } else {
                    // Si no parece JSON, puede ser un string simple o una lista separada por comas
                    conditions = profile.special_conditions
                      .split(",")
                      .map((c) => c.trim())
                      .filter((c) => c !== ""); // Filtrar cadenas vacías
                  }
                } else if (Array.isArray(profile.special_conditions)) {
                  conditions = profile.special_conditions;
                } else if (profile.special_conditions) {
                  conditions = [JSON.stringify(profile.special_conditions)];
                }

                // Verificar si hay condiciones después de procesar
                hasConditions =
                  conditions.length > 0 &&
                  !conditions.every(
                    (c) => c === "" || c === "[]" || c === "{}"
                  );
              }

              // Solo mostrar la sección si hay condiciones especiales
              return hasConditions ? (
                <div className="match-card__special-conditions visible">
                  <h4>Condiciones especiales</h4>
                  <div className="match-card__tags">
                    {conditions.map((condition, index) => (
                      <span
                        key={index}
                        className="match-card__tag condition-tag"
                      >
                        {condition}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null; // No mostrar nada si no hay condiciones
            })()}

            {/* Sección de etapas de hijos */}
            <div className="match-card__child-stages visible">
              <h4>Etapas de mis hijos</h4>
              {profile.child_stages && profile.child_stages.length > 0 ? (
                <div className="match-card__tags">
                  {profile.child_stages.map((stage, index) => (
                    <span key={index} className="match-card__tag stage-tag">
                      {stage.stage_name} ({stage.age_range})
                    </span>
                  ))}
                </div>
              ) : (
                <p className="empty-content">
                  No se han especificado etapas de hijos.
                </p>
              )}
            </div>
          </div>
          {/* Presentación completa */}
          <div className="match-card__full-presentation visible">
            <h4>Más sobre mi</h4>
            {profile.presentation ? (
              <p>{profile.presentation}</p>
            ) : (
              <p className="empty-presentation">
                Esta usuaria no ha añadido una presentación todavía.
              </p>
            )}
          </div>
          {/* Botón para volver */}
          <button
            onClick={toggleView}
            className="match-card__view-button return"
          >
            ← Volver
          </button>
        </div>
      )}

      {/* Mostrar mensaje de feedback justo encima de los botones de acción */}
      {message && !showDetails && (
        <div className={`match-card__feedback alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Botones de acción principal (like/reject) */}
      {!showDetails && (
        <div className="match-card__actions">
          <button onClick={handleLike} className="match-card__like-button">
            👍¡Conectemos!
          </button>
          <button onClick={handleReject} className="match-card__reject-button">
            ❌ Tal vez luego
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Componente para mostrar una lista de perfiles en formato carrusel
 * Permite navegar entre perfiles y gestiona la interacción con cada uno
 *
 * @param {Array} profiles - Lista de perfiles a mostrar
 * @param {number} currentIndex - Índice del perfil actual en la lista
 * @param {Function} handlePrevious - Función para ir al perfil anterior
 * @param {Function} handleNext - Función para ir al siguiente perfil
 * @param {Function} handleLike - Función para dar "Me gusta" al perfil actual
 * @param {Function} handleReject - Función para rechazar el perfil actual
 * @param {boolean} loading - Indica si se están cargando los perfiles
 * @param {Object | null} message - Mensaje de feedback para pasar a MatchCard
 */
const MatchList = ({
  profiles,
  currentIndex,
  handlePrevious,
  handleNext,
  handleLike,
  handleReject,
  loading,
  message,
}) => {
  // Estado para controlar si una tarjeta está mostrando vista detallada
  const [isShowingDetails, setIsShowingDetails] = useState(false);

  // Recibe notificaciones de cambios de vista desde MatchCard
  const handleViewChange = (isDetailView) => {
    setIsShowingDetails(isDetailView);
  };

  // Verificación defensiva de que existe un perfil válido
  const currentProfile =
    profiles &&
    profiles.length > 0 &&
    currentIndex >= 0 &&
    currentIndex < profiles.length
      ? profiles[currentIndex]
      : null;

  return (
    <div className="match-list">
      {loading ? (
        <LoadingSpinner text="Cargando perfiles..." />
      ) : profiles.length > 0 && currentProfile ? (
        <div className="match-carousel">
          {/* Botones de navegación (ocultos en vista detallada) */}
          {!isShowingDetails && (
            <button className="carousel-button prev" onClick={handlePrevious}>
              <span className="arrow">◀</span>
              <span>Anterior</span>
            </button>
          )}

          {/* Tarjeta del perfil actual con verificación defensiva */}
          <MatchCard
            profile={{
              id: currentProfile.id || "unknown",
              name: currentProfile.name || "Nombre no disponible",
              profile_photo: currentProfile.profile_photo || null,
              city: currentProfile.city || "No especificada",
              interests: currentProfile.interests || [],
              presentation: currentProfile.presentation || "",
              special_conditions: currentProfile.special_conditions || "",
              child_stages: currentProfile.child_stages || [],
              // Añadir otros campos relevantes
            }}
            onLike={() =>
              currentProfile &&
              currentProfile.id &&
              handleLike(currentProfile.id)
            }
            onReject={() =>
              currentProfile &&
              currentProfile.id &&
              handleReject(currentProfile.id)
            }
            onViewChange={handleViewChange}
            message={message}
          />

          {/* Botones de navegación (ocultos en vista detallada) */}
          {!isShowingDetails && (
            <button className="carousel-button next" onClick={handleNext}>
              <span>Siguiente</span>
              <span className="arrow">▶</span>
            </button>
          )}
        </div>
      ) : (
        // Mensaje cuando no hay más perfiles disponibles
        <div className="no-more-profiles">
          <h2>¡No hay más perfiles disponibles!</h2>
          <p>
            Vuelve más tarde para encontrar más mamás con intereses con las que
            conectar.
          </p>
        </div>
      )}
    </div>
  );
};

export { MatchCard, MatchList };
