import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "./PerfilVista/Header";
import ProfileCard from "./PerfilVista/ProfileCard";
import SpecialConditions from "./PerfilVista/SpecialConditions";
import MessageAlert from "./PerfilVista/MessageAlert";
import LoadingSpinner from "./LoadingSpinner";
import "./PerfilVista.css";

// Este componente muestra la vista del perfil de la usuaria.
// Es la versión de "solo lectura" del perfil, donde se puede ver toda la
// información pero no modificarla.
// Incluye secciones para mostrar la información personal, presentación,
// detalles familiares, condiciones especiales e intereses.

const BACKEND_URL = "http://localhost/mommatch/backend";

const PerfilVista = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [refreshKey, setRefreshKey] = useState(0);
  const [childStages, setChildStages] = useState([]);

  const conditionMap = {
    movilidad: { label: "Movilidad", icon: "♿" },
    sensoriales: { label: "Sensoriales", icon: "👁️" },
    auditiva: { label: "Auditiva", icon: "👂" },
    aprendizaje: { label: "Aprendizaje", icon: "📚" },
    medicas: { label: "Médicas", icon: "🩺" },
    emocionales: { label: "Emocionales", icon: "😊" },
    neurodivergencias: { label: "Neurodivergencias", icon: "🧠" },
    otras: { label: "Otras", icon: "❓" },
  };

  const formatPhotoUrl = (photoPath, forceRefresh = true) => {
    if (!photoPath)
      return `${BACKEND_URL}/public/uploads/profiles/default_profile.jpg`;

    const baseUrl = photoPath.split("?")[0];
    return forceRefresh ? `${baseUrl}?t=${new Date().getTime()}` : baseUrl;
  };

  const normalizeSpecialConditions = (conditions) => {
    if (!conditions) return [];

    if (typeof conditions === "string") {
      try {
        if (conditions.trim().startsWith("[")) {
          const parsedConditions = JSON.parse(conditions);
          return Array.isArray(parsedConditions) ? parsedConditions : [];
        } else {
          return [conditions];
        }
      } catch (e) {
        console.error("Error al parsear condiciones especiales:", e);
        return [];
      }
    }

    if (Array.isArray(conditions)) {
      return conditions;
    }

    return [];
  };

  useEffect(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        setLoading(true);

        // Añadir un parámetro de timestamp para evitar caché
        const timestamp = new Date().getTime();
        const response = await fetch(
          `${BACKEND_URL}/get_profile.php?user_id=${user.id}&t=${timestamp}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log("PerfilVista - Datos completos recibidos:", data);

        if (!data.success) {
          throw new Error(data.error || "Error en la respuesta del servidor");
        }

        if (isMounted) {
          // Validar que el perfil existe en la respuesta
          if (!data.profile) {
            throw new Error("Datos de perfil no encontrados en la respuesta");
          }

          const normalizedConditions = normalizeSpecialConditions(
            data.profile.special_conditions
          );

          setProfile({
            ...data.profile,
            special_conditions: normalizedConditions,
            profile_photo: formatPhotoUrl(data.profile.profile_photo, false),
          });

          // Simplificar el manejo de etapas - Usamos directamente child_stages
          if (data.child_stages) {
            console.log(
              "PerfilVista - Etapas de hijos encontradas:",
              data.child_stages
            );
            setChildStages(
              Array.isArray(data.child_stages) ? data.child_stages : []
            );
          } else {
            console.log(
              "PerfilVista - No se encontraron etapas de hijos en la respuesta"
            );
            setChildStages([]);
          }
        }
      } catch (error) {
        console.error("Error al cargar el perfil:", error);
        if (isMounted) {
          setMessage({
            text: "No se pudo cargar el perfil. Por favor, intenta de nuevo más tarde.",
            type: "error",
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (user?.id) {
      fetchProfile();
    }

    return () => {
      isMounted = false;
    };
  }, [user?.id, refreshKey]);

  const handleEdit = () => {
    navigate("/perfil/editar");
  };

  const formatFamilyType = (type) => {
    if (!type) return "No especificado";

    // Dividir por guiones bajos o espacios y capitalizar cada palabra
    return type
      .split(/[_\s]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  if (loading) {
    return <LoadingSpinner text="Cargando perfil..." />;
  }

  if (!profile) {
    return (
      <div className="mommatch-profile-view">
        <div className="mommatch-profile-view__error-container">
          <h2>No se pudo cargar el perfil</h2>
          <button
            onClick={() => window.location.reload()}
            className="mommatch-profile-view__button"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mommatch-profile-view">
      <div className="mommatch-profile-view__header-container">
        <Header
          profilePhoto={profile.profile_photo || formatPhotoUrl(null)}
          onEdit={handleEdit}
        />
      </div>

      <ProfileCard
        title="Información Personal"
        className="mommatch-profile-view__info-card"
      >
        <div className="mommatch-profile-view__info-group">
          <span className="mommatch-profile-view__info-label">Edad</span>
          <span className="mommatch-profile-view__info-value">
            {profile.mother_age || "No especificada"}
          </span>
        </div>
        <div className="mommatch-profile-view__info-group">
          <span className="mommatch-profile-view__info-label">Ciudad</span>
          <span className="mommatch-profile-view__info-value">
            {profile.city || "No especificada"}
          </span>
        </div>
        <div className="mommatch-profile-view__info-group">
          <span className="mommatch-profile-view__info-label">
            Tipo de Familia
          </span>
          <span className="mommatch-profile-view__info-value">
            {formatFamilyType(profile.family_type)}
          </span>
        </div>
      </ProfileCard>

      <ProfileCard
        title="Mi Presentación"
        className="mommatch-profile-view__presentacion-card"
      >
        <p className="mommatch-profile-view__presentation">
          {profile.presentation || "No has añadido una presentación todavía."}
        </p>
      </ProfileCard>

      <ProfileCard
        title="Más detalles"
        className="mommatch-profile-view__estado-card"
      >
        <div className="mommatch-profile-view__info-group">
          <span className="mommatch-profile-view__subheading">
            Número de hij@s
          </span>
          <span className="mommatch-profile-view__info-value">
            {profile.number_of_children || 0}
          </span>
        </div>

        <div className="mommatch-profile-view__info-group">
          <span className="mommatch-profile-view__subheading">
            Edad de tus hij@s
          </span>
          {childStages && childStages.length > 0 ? (
            <div className="mommatch-profile-view__tags">
              {childStages.map((stage) => (
                <span key={stage.id} className="mommatch-profile-view__tag">
                  {stage.stage_name} ({stage.age_range})
                </span>
              ))}
            </div>
          ) : (
            <p className="mommatch-profile-view__no-data">No especificada.</p>
          )}
        </div>

        <div className="mommatch-profile-view__info-group">
          <span className="mommatch-profile-view__subheading">
            Condiciones Especiales
          </span>
          <SpecialConditions
            conditions={profile.special_conditions}
            otherCondition={profile.other_condition}
            conditionMap={conditionMap}
          />
        </div>
      </ProfileCard>

      <ProfileCard
        title="Mis Intereses"
        className="mommatch-profile-view__intereses-card"
      >
        {profile.interests && profile.interests.length > 0 ? (
          <div className="mommatch-profile-view__tags">
            {profile.interests.map((interest, index) => (
              <span key={index} className="mommatch-profile-view__tag">
                {interest}
              </span>
            ))}
          </div>
        ) : (
          <p className="mommatch-profile-view__no-tags">
            No has añadido intereses todavía.
          </p>
        )}
      </ProfileCard>

      {message.text && <MessageAlert message={message} />}
    </div>
  );
};

export default PerfilVista;
