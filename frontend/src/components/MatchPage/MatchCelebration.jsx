import { useState, useEffect } from "react";
import "./MatchCelebration.css";
import { formatPhotoUrl, BACKEND_URL } from "./utils";
import { config } from "../../config";
import profilePreferencesData from "../../mock-data/profile_preferences.json";

const MatchCelebration = ({ match, currentUser, onClose }) => {
  const [videoError, setVideoError] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  // Obtener el perfil completo del usuario actual
  useEffect(() => {
    // Modo demo: usar datos mock
    if (config.useMocks) {
      const demoProfile = profilePreferencesData.find((p) => p.user_id === 1);
      if (demoProfile) {
        setCurrentUserProfile(demoProfile);
      }
      return;
    }

    // Modo backend
    const fetchCurrentUserProfile = async () => {
      if (currentUser?.id) {
        try {
          const response = await fetch(`${BACKEND_URL}/get_profile.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ user_id: currentUser.id }),
          });
          const data = await response.json();
          if (data.success) {
            setCurrentUserProfile(data.profile);
          }
        } catch (error) {
          console.error("Error obteniendo perfil del usuario actual:", error);
        }
      }
    };

    fetchCurrentUserProfile();
  }, [currentUser]);

  return (
    <div className="mommatch-celebration-overlay">
      <div className="mommatch-celebration-modal">
        {/* Video de fondo  */}
        {!videoError ? (
          <video
            className="celebration-background-video"
            autoPlay
            muted
            loop
            playsInline
            onError={() => setVideoError(true)}
          >
            <source src="/assets/celebration-animation.mp4" type="video/mp4" />
          </video>
        ) : (
          <div className="celebration-particles-advanced">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="confetti-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
        )}

        <div className="celebration-overlay-content">
          <h2>¡MomMatch! 🎉</h2>
          <div className="match-profiles">
            {" "}
            <div className="profile-circle your-profile">
              <img
                src={
                  formatPhotoUrl(
                    currentUserProfile?.profile_photo,
                    BACKEND_URL,
                  ) ||
                  (config.useMocks
                    ? `${process.env.PUBLIC_URL}/uploads/profiles/default_profile.jpg`
                    : `${BACKEND_URL}/public/uploads/profiles/default_profile.jpg`)
                }
                alt={currentUser?.name || "Tu perfil"}
                onError={(e) => {
                  e.target.src = config.useMocks
                    ? `${process.env.PUBLIC_URL}/uploads/profiles/default_profile.jpg`
                    : `${BACKEND_URL}/public/uploads/profiles/default_profile.jpg`;
                }}
              />
            </div>
            <div className="connection-icon">
              <div className="connection-pulse">
                <span className="connection-symbol">✨</span>
              </div>
            </div>
            <div className="profile-circle match-profile">
              <img
                src={
                  formatPhotoUrl(match.profile_photo, BACKEND_URL) ||
                  (config.useMocks
                    ? `${process.env.PUBLIC_URL}/uploads/profiles/default_profile.jpg`
                    : `${BACKEND_URL}/public/uploads/profiles/default_profile.jpg`)
                }
                alt={match.name}
                onError={(e) => {
                  e.target.src = config.useMocks
                    ? `${process.env.PUBLIC_URL}/uploads/profiles/default_profile.jpg`
                    : `${BACKEND_URL}/public/uploads/profiles/default_profile.jpg`;
                }}
              />
            </div>
          </div>{" "}
          <p className="match-message">¡Tú y {match.name} queréis conectar!</p>
          <p className="match-submessage">
            Puedes acceder al chat desde la sección "Matches" para comenzar a
            charlar
          </p>
          <div className="match-actions">
            <button className="btn-primary btn-continue" onClick={onClose}>
              Seguir viendo perfiles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchCelebration;
