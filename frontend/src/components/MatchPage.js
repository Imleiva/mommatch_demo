import { useEffect, useState } from "react";
import ChatOverlay from "./MatchPage/ChatOverlay";
import { useAuth } from "../context/AuthContext";
import MatchCelebration from "./MatchPage/MatchCelebration";
import FilterSidebar from "./MatchPage/FilterSidebar";
import MatchTabs from "./MatchPage/MatchTabs";
import { formatPhotoUrl, fetchRealMatches } from "./MatchPage/utils";
import {
  handleLike,
  handleReject,
  reinsertProfile,
  removeLikedProfile,
} from "./MatchPage/profileLogic";
import MatchListContainer from "./MatchPage/MatchListContainer";
import "./MatchPage.css";
import { config } from "../config";

// Este componente representa la página principal de coincidencias (matches) en MomMatch
// Permite a las usuarias ver perfiles de posibles amigas, filtrar coincidencias,
// y tomar decisiones sobre si conectar o no con otras madres
// Implementa la funcionalidad principal de matchmaking de la aplicación.

// URL base del backend para realizar las solicitudes a la API
const BACKEND_URL = config.useMocks ? null : "http://localhost/mommatch/backend";

// Componente principal MatchPage que muestra perfiles sugeridos para hacer match
const MatchPage = () => {
  const { user } = useAuth(); // Obtener información del usuario actual  // Estados para gestionar los datos y la interfaz de usuario
  const [profiles, setProfiles] = useState([]); // Perfiles sugeridos para mostrar
  const [loading, setLoading] = useState(false); // Estado de carga para mostrar spinner
  const [showLoading, setShowLoading] = useState(false); // Estado para controlar la visualización del loading con delay
  // Estado para los filtros de búsqueda de perfiles
  const [filters, setFilters] = useState({
    connectionType: "any", // Tipo de conexión: presencial, remota o ambas
    specialConditions: { value: [], ignore: false }, // Condiciones especiales seleccionadas
    prioritizeCity: false, // Si se debe priorizar la misma ciudad
    city: "", // Ciudad para priorizar en la búsqueda
    childAgeStages: [], // Etapas de edad de los hijos seleccionadas
  });
  // Estado para mostrar la celebración de un match
  const [showMatchCelebration, setShowMatchCelebration] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(null);

  // Estado local para manejar los filtros temporalmente
  const [localFilters, setLocalFilters] = useState(filters);

  // Reintroducir la declaración de `cityInputValue` para resolver el error de ESLint
  const [cityInputValue] = useState("");

  // Nueva función para confirmar el filtro de ciudad (por ejemplo, al presionar Enter)
  const confirmCityFilter = () => {
    setLocalFilters((prevFilters) => ({
      ...prevFilters,
      city: cityInputValue.trim(), // Actualizar el filtro con el valor confirmado
    }));
  };

  // Reintroduce `handleCityInputChange` to update the city filter value
  const handleCityInputChange = (value) => {
    setLocalFilters((prevFilters) => ({
      ...prevFilters,
      city: value,
    }));
  };

  // Función para manejar cambios en los filtros localmente
  const handleLocalFilterChange = (filterName, value) => {
    setLocalFilters((prevFilters) => ({
      ...prevFilters,
      [filterName]: value,
    }));
  };

  // Función para aplicar los filtros confirmados
  const applyFilters = () => {
    setFilters(localFilters); // Actualizar los filtros globales
  };
  // Función para restablecer todos los filtros y mostrar todos los perfiles
  const resetAllFilters = () => {
    const defaultFilters = {
      connectionType: "any",
      specialConditions: { value: [], ignore: false },
      prioritizeCity: false,
      city: "",
      childAgeStages: [],
    };

    setLocalFilters(defaultFilters);
    setFilters(defaultFilters);
  };

  const [message, setMessage] = useState(null); // Mensajes de información o error
  const [matches, setMatches] = useState([]); // Perfiles con los que se ha hecho match mutuo
  const [likedProfiles, setLikedProfiles] = useState([]); // Perfiles a los que has dado "Conectemos"
  const [rejectedProfiles, setRejectedProfiles] = useState([]); // Perfiles a los que has dado "Tal vez luego"
  const [currentIndex, setCurrentIndex] = useState(0); // Índice del perfil actual mostrado
  const [activeSection, setActiveSection] = useState("matches"); // Sección activa: matches, conectemos o tal vez luego
  const [activeChat, setActiveChat] = useState(null); // Chat activo con un perfil

  // Opciones predefinidas para los filtros
  const specialConditions = [
    "Movilidad",
    "Sensoriales",
    "Auditiva",
    "Aprendizaje",
    "Médicas",
    "Emocionales",
    "Neurodivergencias",
    "Otras",
  ];

  // Hook de efecto para cargar matches desde localStorage al iniciar
  useEffect(() => {
    const savedMatches = localStorage.getItem("matches");
    if (savedMatches) {
      setMatches(JSON.parse(savedMatches));
    }
  }, []);

  // Hook de efecto para guardar matches en localStorage cuando cambian
  useEffect(() => {
    localStorage.setItem("matches", JSON.stringify(matches));
  }, [matches]);

  // Función para cargar las preferencias de match guardadas del usuario
  const fetchMatchPreferences = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/get_match_preferences.php`, {
        credentials: "include", // Incluye cookies para mantener la sesión
      });

      if (!response.ok) {
        throw new Error("Error al obtener las preferencias de coincidencia");
      }

      const data = await response.json(); // Si hay preferencias guardadas, actualiza el estado de filtros
      if (data.success && data.preferences) {
        // Excluir la ciudad del usuario de las preferencias para evitar filtrado automático
        const { city, ...preferencesWithoutCity } = data.preferences;
        console.log(
          "Ciudad del usuario excluida del filtrado automático:",
          city
        );
        console.log(
          "Preferencias aplicadas sin ciudad:",
          preferencesWithoutCity
        );
        setFilters((prevFilters) => ({
          ...prevFilters,
          ...preferencesWithoutCity,
          city: "", // Asegurar que la ciudad siempre empiece vacía
        }));
      }
    } catch (error) {
      console.error("Error al cargar las preferencias de coincidencia:", error);
    }
  };

  // Función para obtener perfiles filtrados del servidor según los criterios seleccionados
  const fetchFilteredProfiles = async (currentFilters) => {
    try {
      // Construye los parámetros de búsqueda basados en los filtros actuales
      const params = new URLSearchParams();

      // Agrega filtro de tipo de conexión
      if (currentFilters.connectionType !== "any") {
        params.append("connectionType", currentFilters.connectionType);
      }

      // Agrega filtro de condiciones especiales si no está ignorado
      if (
        !currentFilters.specialConditions.ignore &&
        currentFilters.specialConditions.value.length > 0
      ) {
        params.append(
          "specialConditions",
          JSON.stringify(currentFilters.specialConditions.value)
        );
      }

      // Agrega filtro de ciudad si el valor no está vacío
      if (currentFilters.city.trim() !== "") {
        params.append("city", currentFilters.city);
      }

      // Realiza la petición al backend con los parámetros de filtro
      const response = await fetch(
        `${BACKEND_URL}/get_matches.php?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Error al obtener perfiles filtrados");
      }

      const data = await response.json();

      // Actualiza el estado con los perfiles filtrados
      setProfiles(data.profiles || []);
      setCurrentIndex(0); // Reinicia el índice al aplicar nuevos filtros

      // Muestra mensaje si no hay perfiles que coincidan con los filtros
      if (data.profiles.length === 0) {
        setMessage({
          type: "info",
          text: "No se encontraron perfiles que coincidan con tus filtros. Prueba con criterios diferentes.",
        });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error) {
      console.error("Error al cargar perfiles filtrados:", error);
      setMessage({
        type: "error",
        text: "Hubo un problema al aplicar los filtros. Por favor, inténtalo de nuevo.",
      });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLoading(false); // Oculta el indicador de carga
    }
  };
  // Hook de efecto para cargar datos iniciales cuando cambian los filtros
  useEffect(() => {
    const fetchMatchesData = async () => {
      setLoading(true);
      
      // Añadir un pequeño delay antes de mostrar el loading para evitar parpadeos
      const loadingTimeout = setTimeout(() => {
        setShowLoading(true);
      }, 200);

      try {
        const requestURL = new URL(`${BACKEND_URL}/get_matches.php`);

        // Añadir parámetro de ciudad con debug para verificar que funciona
        if (filters.city && filters.city.trim() !== "") {
          requestURL.searchParams.append("city", filters.city.trim());
          console.log("Filtrando por ciudad:", filters.city.trim());
        }
        if (filters.connectionType !== "any") {
          requestURL.searchParams.append(
            "connectionType",
            filters.connectionType
          );
        }

        requestURL.searchParams.append(
          "cityNotRelevant",
          filters.prioritizeCity ? "false" : "true"
        );

        if (
          !filters.specialConditions.ignore &&
          filters.specialConditions.value.length > 0
        ) {
          requestURL.searchParams.append(
            "specialConditions",
            JSON.stringify(filters.specialConditions.value)
          );
        }

        // Añadir filtro de etapas de edad de hijos
        if (filters.childAgeStages && filters.childAgeStages.length > 0) {
          requestURL.searchParams.append(
            "childAgeStages",
            JSON.stringify(filters.childAgeStages)
          );
          console.log("Filtrando por etapas de edad:", filters.childAgeStages);
        }

        console.log("URL final de búsqueda:", requestURL.toString());

        const response = await fetch(requestURL, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          console.error(data.error);
          setMessage({ text: data.error, type: "error" });
          return;
        }

        // Filtrar perfiles únicos basados en el ID
        const uniqueProfiles = data.profiles.reduce((acc, profile) => {
          if (!acc.some((p) => p.id === profile.id)) {
            acc.push(profile);
          }
          return acc;
        }, []);

        setProfiles(uniqueProfiles); // Actualizar el estado con perfiles únicos

        // 2. Carga perfiles a los que el usuario ha dado "Conectemos"
        const likedResponse = await fetch(`${BACKEND_URL}/get_conectemos.php`, {
          credentials: "include",
        });

        if (likedResponse.ok) {
          const likedData = await likedResponse.json();
          if (likedData.success) {
            setLikedProfiles(likedData.profiles || []);
          }
        }

        // 3. Carga perfiles a los que el usuario ha rechazado ("Tal vez luego")
        const rejectedResponse = await fetch(
          `${BACKEND_URL}/get_talvezluego.php`,
          {
            credentials: "include",
          }
        );

        if (rejectedResponse.ok) {
          const rejectedData = await rejectedResponse.json();
          if (rejectedData.success) {
            setRejectedProfiles(rejectedData.profiles || []);
          }
        }

        // 4. Carga matches reales (likes mutuos)
        const realMatchesResponse = await fetch(
          `${BACKEND_URL}/get_real_matches.php`,
          {
            credentials: "include",
          }
        );

        if (realMatchesResponse.ok) {
          const realMatchesData = await realMatchesResponse.json();
          if (realMatchesData.success) {
            const uniqueMatches = realMatchesData.profiles.reduce(
              (acc, profile) => {
                if (!acc.some((p) => p.id === profile.id)) {
                  acc.push(profile);
                }
                return acc;
              },
              []
            );

            setMatches(uniqueMatches);
          }
        }
      } catch (error) {
        console.error("Error fetching matches data:", error);
        setMessage({
          type: "error",
          text: "Hubo un problema al cargar los perfiles. Por favor, inténtalo de nuevo.",
        });      } finally {
        clearTimeout(loadingTimeout);
        setLoading(false);
        setShowLoading(false);
      }
    };

    fetchMatchesData();
  }, [filters]);

  // Hook de efecto para verificar la sesión del usuario
  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/verify_session.php`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
      } catch (error) {
        console.error("Error verifying session:", error);
      }
    };

    verifySession();
  }, []);

  // Hook de efecto para cargar filtros guardados localmente
  useEffect(() => {
    const savedFilters = localStorage.getItem("matchFilters");
    if (savedFilters) {
      const parsedFilters = JSON.parse(savedFilters);
      // Ignorar el valor de la ciudad al cargar los filtros
      const updatedFilters = { ...parsedFilters, city: "" };
      setFilters(updatedFilters);
      fetchFilteredProfiles(updatedFilters); // Llamada corregida
    }
  }, []);

  // Hook de efecto para cargar preferencias de match del servidor
  useEffect(() => {
    fetchMatchPreferences();
  }, []);

  // Hook de efecto para ajustar currentIndex cuando cambia el array de perfiles
  useEffect(() => {
    // Si los perfiles cambian, verifica que el índice sigue siendo válido
    if (profiles.length > 0 && currentIndex >= profiles.length) {
      setCurrentIndex(0); // Reinicia al primer perfil si el índice está fuera de rango
    } else if (profiles.length === 0) {
      setCurrentIndex(0); // También reinicia si no hay perfiles
    }
  }, [profiles, currentIndex]);

  // Función para activar/desactivar un filtro específico
  const toggleIgnoreFilter = (name) => {
    setLocalFilters((prev) => ({
      ...prev,
      [name]: { ...prev[name], ignore: !prev[name].ignore },
    }));
  };
  // Función wrapper para fetchRealMatches con parámetros predefinidos
  const fetchRealMatchesWrapper = () =>
    fetchRealMatches(BACKEND_URL, setMatches, setMessage);

  // Función para manejar el like de un perfil
  const handleLikeWrapper = (userId) =>
    handleLike(
      userId,
      profiles,
      setProfiles,
      setMatches,
      setLikedProfiles,
      setMessage,
      fetchRealMatchesWrapper,
      BACKEND_URL,
      setShowMatchCelebration,
      setCurrentMatch
    );

  // Función wrapper para manejar el rechazo de un perfil
  const handleRejectWrapper = (userId) =>
    handleReject(
      userId,
      profiles,
      setProfiles,
      setRejectedProfiles,
      setMessage,
      BACKEND_URL
    );

  // Función para reinsertar un perfil rechazado a la lista de candidatos
  const reinsertProfileWrapper = (profileId) =>
    reinsertProfile(
      profileId,
      rejectedProfiles,
      setProfiles,
      setRejectedProfiles,
      setMessage
    );

  // Función para iniciar un chat con un match
  const handleChat = (userId) => {
    // Busca el perfil correspondiente entre los matches
    const selectedMatch = matches.find((profile) => profile.id === userId);

    if (selectedMatch) {
      setActiveChat(selectedMatch);
    } else {
      console.error(`No se encontró el perfil con ID ${userId}`);
      setMessage({
        type: "error",
        text: "No se pudo iniciar el chat con este perfil",
      });

      // Limpia el mensaje después de 3 segundos
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Función para cerrar la ventana de chat activa
  const handleCloseChat = () => {
    setActiveChat(null);
  };

  // Función para avanzar al siguiente perfil (con verificación)
  const handleNext = () => {
    if (profiles.length > 0) {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % profiles.length);
    }
  };

  // Función para volver al perfil anterior (con verificación)
  const handlePrevious = () => {
    if (profiles.length > 0) {
      setCurrentIndex(
        (prevIndex) => (prevIndex - 1 + profiles.length) % profiles.length
      );
    }
  };

  // Función para activar/desactivar una condición especial en el filtro
  const handleConditionToggle = (condition) => {
    setLocalFilters((prev) => {
      const newConditions = prev.specialConditions.value.includes(condition)
        ? prev.specialConditions.value.filter((c) => c !== condition)
        : [...prev.specialConditions.value, condition];
      return {
        ...prev,
        specialConditions: { ...prev.specialConditions, value: newConditions },
      };
    });
  };

  // Función para cambiar entre secciones (matches, conectemos, tal vez luego)
  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  // Este componente representa la página principal de matches.
  // Aquí se gestionan las interacciones entre los usuarios y sus posibles conexiones.
  // Muestra el loading con animación de puntos mientras se obtienen los perfiles
  if (loading) {
    return (
      <div className="match-page">
        <h1>Encuentra tu Mamá Match</h1>
        {showLoading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Renderiza la interfaz de usuario completa de MatchPage
  return (
    <div className="match-page">
      <h1>Encuentra tu Mamá Match</h1>
      {/* Panel lateral para los filtros de búsqueda */}
      <FilterSidebar
        filters={localFilters} // Usar los filtros locales
        cityInputValue={cityInputValue} // Pasar el valor local del input
        handleFilterChange={handleLocalFilterChange} // Manejar cambios localmente
        confirmCityFilter={confirmCityFilter} // Confirmar el filtro al presionar Enter
        applyFilters={applyFilters} // Confirmar los cambios
        toggleIgnoreFilter={toggleIgnoreFilter}
        handleConditionToggle={handleConditionToggle}
        handleCityInputChange={handleCityInputChange} // Pass the function to FilterSidebar
        specialConditions={specialConditions}
      />
      {/* Panel de pestañas para mostrar matches, likes y rechazos */}
      <MatchTabs
        activeSection={activeSection}
        matches={matches}
        likedProfiles={likedProfiles}
        rejectedProfiles={rejectedProfiles}
        handleSectionChange={handleSectionChange}
        handleChat={handleChat}
        reinsertProfile={reinsertProfileWrapper}
        removeLikedProfile={removeLikedProfile} // Pass the removeLikedProfile function
        setLikedProfiles={setLikedProfiles} // Pass the setLikedProfiles state updater
        setMessage={setMessage} // Pass the setMessage state updater
        formatPhotoUrl={formatPhotoUrl}
      />
      {/* Lista de perfiles disponibles para hacer match.
          Incluye botones para "Conectemos" y "Tal vez luego". */}
      <div className="match-list-container">
        {/* Componente que muestra la tarjeta del perfil actual */}
        <MatchListContainer
          profiles={profiles}
          currentIndex={currentIndex}
          handlePrevious={handlePrevious}
          handleNext={handleNext}
          handleLike={handleLikeWrapper}
          handleReject={handleRejectWrapper}
          loading={loading}
          message={message} // Pasar el mensaje solo a las tarjetas
          resetFilters={resetAllFilters} // Pasar la función para resetear filtros
        />{" "}
        {/* Ventana de chat superpuesta sobre la interfaz cuando está activo */}
        <ChatOverlay
          activeChat={activeChat}
          handleCloseChat={handleCloseChat}
        />
      </div>{" "}
      {/* Modal de celebración cuando hay un match */}
      {showMatchCelebration && currentMatch && (
        <MatchCelebration
          match={currentMatch}
          currentUser={user}
          onClose={() => setShowMatchCelebration(false)}
        />
      )}
      {/* Muestra un mensaje si no hay más perfiles disponibles o si ocurre un error. */}
    </div>
  );
};

export default MatchPage;
