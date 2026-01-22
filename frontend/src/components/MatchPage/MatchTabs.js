import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { formatPhotoUrl } from "../MatchPage/utils";
import { BACKEND_URL } from "../MatchPage/utils";
import { config } from "../../config";

// Este componente gestiona las pestañas de matches, likes y rechazados.
// Me dio bastantes problemas evitar duplicados en la lista
// de matches, especialmente cuando se actualizan los mensajes no leídos.
//
// Implementé un sistema de eventos personalizados para que los componentes
// se comuniquen entre sí (cuando se leen mensajes o se cierra un chat).
// También añadí polling cada 30 segundos para mantener actualizado el
// estado de mensajes no leídos sin tener que implementar websockets.

const MatchTabs = ({
  activeSection,
  matches,
  likedProfiles,
  rejectedProfiles,
  handleSectionChange,
  handleChat,
  reinsertProfile,
  removeLikedProfile,
  setLikedProfiles,
  setMessage,
}) => {
  // Estado local para seguir los mensajes no leídos, inicializado desde las propiedades de matches
  const [localMatches, setLocalMatches] = useState([]);

  // Actualiza el estado local cuando cambian los matches - con eliminación adecuada de duplicados
  useEffect(() => {
    // Filtrar cualquier match duplicado antes de establecer el estado
    const uniqueMatches = matches.reduce((unique, match) => {
      // Solo añadir el match si no está ya en el array
      if (!unique.some((item) => item.id === match.id)) {
        unique.push(match);
      }
      return unique;
    }, []);

    setLocalMatches(uniqueMatches);
  }, [matches]);

  // Escucha eventos personalizados del componente MatchChat
  useEffect(() => {
    const handleMessageRead = (event) => {
      const { matchId } = event.detail;

      // Actualiza el estado local para quitar la notificación de este match
      setLocalMatches((prevMatches) =>
        prevMatches.map((match) =>
          match.id === matchId
            ? { ...match, hasNewMessages: false, unreadCount: 0 }
            : match
        )
      );
    };

    // Escucha ambos eventos que podrían marcar mensajes como leídos
    window.addEventListener("messagesMarkedAsRead", handleMessageRead);
    window.addEventListener("matchChatClosed", handleMessageRead);

    return () => {
      window.removeEventListener("messagesMarkedAsRead", handleMessageRead);
      window.removeEventListener("matchChatClosed", handleMessageRead);
    };
  }, []);

  // Fuerza la actualización de matches para verificar nuevos mensajes periódicamente, con manejo de errores
  useEffect(() => {
    // En modo demo, no hacer polling
    if (config.useMocks) {
      return;
    }

    const refreshMatchStatus = async () => {
      // Protección adicional dentro de la función async
      if (config.useMocks || !BACKEND_URL) {
        return;
      }
      
      try {
        const response = await fetch(`${BACKEND_URL}/get_real_matches.php`, {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Elimina duplicados antes de actualizar el estado
            const uniqueProfiles = data.profiles.reduce((unique, profile) => {
              if (!unique.some((item) => item.id === profile.id)) {
                unique.push(profile);
              }
              return unique;
            }, []);

            setLocalMatches(uniqueProfiles);
          }
        }
      } catch (error) {
        console.warn("Error al actualizar el estado de los matches:", error);
      }
    };

    // Actualiza cada 30 segundos
    const intervalId = setInterval(refreshMatchStatus, 30000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <aside className="filters-sidebar" style={{ right: "3rem", left: "auto" }}>
      <h2>Tus Matches</h2>
      <div className="filters-container">
        {/* Botones para cambiar de sección */}
        <div className="match-tabs">
          <button
            className={`match-tab-button ${
              activeSection === "matches" ? "active" : ""
            }`}
            onClick={() => handleSectionChange("matches")}
          >
            Matches
          </button>
          <button
            className={`match-tab-button ${
              activeSection === "liked" ? "active" : ""
            }`}
            onClick={() => handleSectionChange("liked")}
          >
            Perfiles que me han gustado
          </button>
          <button
            className={`match-tab-button ${
              activeSection === "rejected" ? "active" : ""
            }`}
            onClick={() => handleSectionChange("rejected")}
          >
            Perfiles descartados
          </button>
        </div>

        <div className="filter-divider"></div>

        {/* Contenido basado en la sección activa */}
        <div className="match-section-content">
          {" "}
          {activeSection === "matches" && (
            <>
              {localMatches && localMatches.length > 0 ? (
                <div className="matches-grid">
                  {localMatches.map((profile) => (
                    <div
                      key={`match-${profile.id}`}
                      className="match-mini-card"
                    >
                      <div className="match-mini-photo-container">
                        <img
                          src={formatPhotoUrl(
                            profile.profile_photo,
                            BACKEND_URL
                          )}
                          alt={profile.name}
                          className="match-mini-photo"
                        />
                        {/* Indicador de mensajes nuevos - usando localMatches en lugar de matches */}
                        {profile.hasNewMessages && (
                          <div
                            className="new-messages-indicator"
                            title="Nuevos mensajes"
                          ></div>
                        )}
                      </div>
                      <div className="match-mini-info">
                        <p className="match-mini-name">{profile.name}</p>
                        <button
                          className="chat-mini-button"
                          onClick={() => {
                            // Marca como leído inmediatamente en la interfaz cuando se abre el chat
                            setLocalMatches((prevMatches) =>
                              prevMatches.map((match) =>
                                match.id === profile.id
                                  ? {
                                      ...match,
                                      hasNewMessages: false,
                                      unreadCount: 0,
                                    }
                                  : match
                              )
                            );

                            // Notifica al servidor para marcar los mensajes como leídos (solo en modo backend)
                            if (!config.useMocks) {
                              fetch(`${BACKEND_URL}/mark_messages_read.php`, {
                                method: "POST",
                                credentials: "include",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ matchId: profile.id }),
                              }).catch((error) => {
                                console.warn(
                                  "Error al marcar mensajes como leídos:",
                                  error
                                );
                              });
                            }

                            // Lanza un evento personalizado para otros componentes
                            window.dispatchEvent(
                              new CustomEvent("messagesMarkedAsRead", {
                                detail: { matchId: profile.id },
                              })
                            );

                            handleChat(profile.id);
                          }}
                        >
                          Chat
                          {/* Muestra indicador numérico de mensajes si hay disponibles */}
                          {profile.hasNewMessages && (
                            <span className="message-count">•</span>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-section-message">
                  Aún no tienes matches. Cuando otra usuaria también te dé
                  "Conectemos", aparecerá aquí y podrás chatear con ella.
                </p>
              )}
            </>
          )}{" "}
          {activeSection === "liked" && (
            <>
              <h3 className="section-title">Perfiles que me han gustado</h3>
              {likedProfiles && likedProfiles.length > 0 ? (
                <div className="mini-profiles-grid">
                  {likedProfiles.map((profile) => (
                    <div
                      key={`liked-${profile.id || profile.user_id}`}
                      className="mini-profile-card"
                    >
                      <img
                        src={formatPhotoUrl(profile.profile_photo, BACKEND_URL)}
                        alt={profile.name}
                        className="mini-profile-photo"
                      />
                      <p className="mini-profile-name">{profile.name}</p>{" "}
                      <button
                        className="remove-mini-button"
                        onClick={() =>
                          removeLikedProfile(
                            profile.id || profile.user_id,
                            setLikedProfiles,
                            setMessage,
                            BACKEND_URL
                          )
                        }
                        title="Eliminar perfil de 'Me gusta'"
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-section-message">
                  No has dado "Conectemos" a ningún perfil todavía.
                </p>
              )}
            </>
          )}{" "}
          {activeSection === "rejected" && (
            <>
              <h3 className="section-title">Perfiles descartados</h3>
              {rejectedProfiles && rejectedProfiles.length > 0 ? (
                <div className="mini-profiles-grid">
                  {rejectedProfiles.map((profile) => (
                    <div
                      key={`rejected-${profile.id || profile.user_id}`}
                      className="mini-profile-card"
                    >
                      <img
                        src={formatPhotoUrl(profile.profile_photo, BACKEND_URL)}
                        alt={profile.name}
                        className="mini-profile-photo"
                      />
                      <p className="mini-profile-name">{profile.name}</p>
                      <button
                        className="reinsert-mini-button"
                        onClick={() => reinsertProfile(profile.id || profile.user_id)}
                        title="Reinsertar perfil"
                      >
                        ↺
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-section-message">
                  No has descartado ningún perfil todavía.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

MatchTabs.propTypes = {
  activeSection: PropTypes.string.isRequired,
  matches: PropTypes.array.isRequired,
  likedProfiles: PropTypes.array.isRequired,
  rejectedProfiles: PropTypes.array.isRequired,
  handleSectionChange: PropTypes.func.isRequired,
  handleChat: PropTypes.func.isRequired,
  reinsertProfile: PropTypes.func.isRequired,
  removeLikedProfile: PropTypes.func.isRequired,
  setLikedProfiles: PropTypes.func.isRequired,
  setMessage: PropTypes.func.isRequired,
};

export default MatchTabs;
