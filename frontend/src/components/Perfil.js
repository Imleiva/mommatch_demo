import React, { useState, useEffect } from "react";
import "./Perfil.css";
import { useAuth } from "../context/AuthContext";
import { config } from "../config";
import { fetchCities } from "../services/api";
import ProfileForm from "./Perfil/ProfileForm";
import LoadingSpinner from "./LoadingSpinner";
import { useNavigate } from "react-router-dom";
import { specialConditions, familyTypes } from "./Perfil/utils";
import profilePreferencesData from "../mock-data/profile_preferences.json";

// Este componente maneja la edición del perfil de la usuaria
// Gestiona la carga y actualización de datos personales, foto de perfil,
// intereses, condiciones especiales y preferencias de conexión
// Incluye validación de campos, gestión de errores y comunicación
// con el backend para guardar los cambios.

// Constantes
const BACKEND_URL = config.useMocks
  ? null
  : "http://localhost/mommatch/backend";
const MAX_PRESENTATION_CHARS = 500;

// Formateador de URL de foto de perfil
const formatPhotoUrl = (photoPath) => {
  if (!photoPath) {
    if (config.useMocks) {
      return `/mommatch_demo/uploads/profiles/default_profile.jpg`;
    }
    return `${BACKEND_URL}/public/uploads/profiles/default_profile.jpg`;
  }
  return photoPath.startsWith("http")
    ? photoPath
    : `http://localhost${photoPath}`;
};

const Perfil = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [interestsLoading, setInterestsLoading] = useState(true);
  const [availableInterests, setAvailableInterests] = useState([]);
  const [cities, setCities] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [charCount, setCharCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedChildStages, setSelectedChildStages] = useState([]);

  // Estado del formulario de perfil
  const [data, setFormData] = useState({
    city: "",
    country: "",
    specialConditions: [],
    numberOfChildren: 0,
    interests: [],
    user_id: user?.id || null,
    current_photo: null,
    mother_age: "",
    family_type: "monoparental",
    presentation: "",
    connection_type: "any",
    hasAgeError: false,
  });

  // Cargar ciudades
  useEffect(() => {
    const loadCities = async () => {
      try {
        const response = await fetchCities();
        setCities(response);
      } catch (error) {
        console.error("Error al cargar ciudades:", error);
      } finally {
        setLoading(false);
      }
    };
    loadCities();
  }, []);

  // Cargar datos del perfil
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id) return;

      try {
        // Usar datos mock en GitHub Pages
        if (config.useMocks) {
          const mockProfile = profilePreferencesData.find(
            (p) => p.user_id === user.id
          );

          if (mockProfile) {
            setFormData((prev) => ({
              ...prev,
              mother_age: mockProfile.mother_age,
              city: mockProfile.city,
              country: mockProfile.country,
              family_type: mockProfile.family_type,
              presentation: mockProfile.presentation,
              numberOfChildren: mockProfile.number_of_children,
              specialConditions: mockProfile.special_conditions || [],
              interests: mockProfile.interests || [],
              current_photo: `${
                process.env.PUBLIC_URL
              }${mockProfile.profile_photo.replace("/public", "")}`,
              profile_photo: mockProfile.profile_photo,
            }));
            setCharCount(mockProfile.presentation?.length || 0);
          }

          setLoading(false);
          return;
        }

        const timestamp = new Date().getTime();
        const response = await fetch(
          `${BACKEND_URL}/get_profile.php?user_id=${user.id}&t=${timestamp}`,
          { credentials: "include" }
        );

        const result = await response.json();
        if (result.success) {
          let photoUrl = result.profile.profile_photo;
          if (photoUrl) photoUrl = `${photoUrl}?t=${timestamp}`;

          setFormData((prev) => ({
            ...prev,
            ...result.profile,
            current_photo:
              photoUrl || formatPhotoUrl(result.profile.profile_photo),
            city: result.profile.city || "",
            numberOfChildren: result.profile.number_of_children || 0,
            specialConditions: result.profile.special_conditions || [],
          }));
        }
      } catch (error) {
        console.error("Error al cargar datos del perfil:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user?.id]);

  // Cargar intereses disponibles
  useEffect(() => {
    const fetchInterests = async () => {
      if (!user?.id) return;

      // Usar datos mock en modo demo
      if (config.useMocks) {
        const mockInterests = [
          { id: 1, name: "Yoga" },
          { id: 2, name: "Lectura" },
          { id: 3, name: "Naturaleza" },
          { id: 4, name: "Cocina" },
          { id: 5, name: "Arte" },
          { id: 6, name: "Música" },
          { id: 7, name: "Deportes" },
          { id: 8, name: "Fotografía" },
        ];
        setAvailableInterests(mockInterests);
        setInterestsLoading(false);
        return;
      }

      try {
        setInterestsLoading(true);
        const response = await fetch(`${BACKEND_URL}/get_interests.php`, {
          credentials: "include",
        });

        const result = await response.json();
        if (result.success) {
          setAvailableInterests(result.data);
        }
      } catch (error) {
        console.error("Error al cargar intereses:", error);
      } finally {
        setInterestsLoading(false);
      }
    };

    fetchInterests();
  }, [user?.id]);

  // Manejar cambios en formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "mother_age") {
      const newValue = value.replace(/[^0-9]/g, "").slice(0, 2);
      const age = parseInt(newValue, 10);

      if (newValue && (isNaN(age) || age < 18 || age > 99)) {
        setErrorMessage("La edad debe estar entre 18 y 99 años.");
        setFormData((prev) => ({
          ...prev,
          [name]: newValue,
          hasAgeError: true,
        }));
      } else {
        setErrorMessage("");
        setFormData((prev) => ({
          ...prev,
          [name]: newValue,
          hasAgeError: newValue ? false : prev.hasAgeError,
        }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (name === "presentation") {
      setCharCount(value.length);
    }
  };

  // Manejar cambios de foto
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profile_photo", file);

    try {
      setMessage({ text: "Subiendo foto...", type: "info" });

      const response = await fetch(`${BACKEND_URL}/actualizar_perfil.php`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        const timestamp = new Date().getTime();
        const photoUrlWithCache = `${result.data.profile.photo_url}?t=${timestamp}`;

        setFormData((prev) => ({
          ...prev,
          profile_photo: result.data.profile.photo_url,
          current_photo: photoUrlWithCache,
        }));

        setMessage({
          text: "Foto de perfil actualizada con éxito",
          type: "success",
        });
      } else {
        setMessage({
          text:
            "Error al subir la foto: " + (result.error || "Error desconocido"),
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error técnico al subir la foto:", error);
      setMessage({
        text: "Error al subir la foto. Por favor, intenta de nuevo.",
        type: "error",
      });
    }
  };

  // Funciones para el autocomplete de ciudades
  const handleCitySearch = (e) => {
    const searchTerm = e.target.value.trim().toLowerCase();
    setFormData((prev) => ({ ...prev, city: e.target.value }));
    setFilteredCities(
      Array.isArray(cities)
        ? cities.filter((city) => city.name.toLowerCase().includes(searchTerm))
        : []
    );
  };

  const handleCitySelect = (selectedCity) => {
    setFormData((prev) => ({ ...prev, city: selectedCity.name }));
    setFilteredCities([]);
  };

  // Manejar selección de condiciones especiales
  const handleConditionToggle = (conditionId) => {
    setFormData((prev) => ({
      ...prev,
      specialConditions: prev.specialConditions.includes(conditionId)
        ? prev.specialConditions.filter((id) => id !== conditionId)
        : [...prev.specialConditions, conditionId],
    }));
  };

  // Manejar cambios en intereses
  const handleInterestChange = (updatedInterests) => {
    setFormData((prev) => ({
      ...prev,
      interests: updatedInterests,
    }));
  };

  // Añadir nuevo interés
  const handleAddNewInterest = async (newInterest) => {
    try {
      const response = await fetch(`${BACKEND_URL}/add_interest.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interest: newInterest }),
      });

      const result = await response.json();

      if (result.success) {
        setAvailableInterests((prev) => [...prev, result.interest]);
        handleInterestChange([...data.interests, result.interest.name]);
        return result.interest;
      } else {
        throw new Error(result.error || "Error al añadir el interés");
      }
    } catch (error) {
      console.error("Error al añadir nuevo interés:", error);
      throw error;
    }
  };

  // Guardar perfil
  const handleSave = async () => {
    if (data.hasAgeError) {
      setMessage({
        text: "Por favor, corrige la edad antes de guardar (18-99 años)",
        type: "error",
      });
      return;
    }

    try {
      const payload = {
        ...data,
        number_of_children: parseInt(data.numberOfChildren, 10),
        profile_photo: data.profile_photo,
      };

      delete payload.numberOfChildren;
      delete payload.current_photo;

      const response = await fetch(`${BACKEND_URL}/actualizar_perfil.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        const updatedNumberOfChildren =
          result.data?.profile?.number_of_children;

        setMessage({ text: "Perfil actualizado con éxito", type: "success" });

        setTimeout(() => {
          setFormData((prev) => ({
            ...prev,
            numberOfChildren:
              updatedNumberOfChildren !== undefined
                ? parseInt(updatedNumberOfChildren, 10)
                : prev.numberOfChildren,
          }));
        }, 100);
      } else {
        setMessage({ text: "Error al actualizar el perfil", type: "error" });
      }
    } catch (error) {
      console.error("Error al guardar el perfil:", error);
      setMessage({ text: "Error al guardar el perfil", type: "error" });
    }
  };

  // Guardar y salir
  const handleSaveOrExit = async () => {
    // En modo demo, solo navegar sin guardar
    if (config.useMocks) {
      navigate("/perfil");
      return;
    }

    try {
      const payload = {
        ...data,
        profile_photo: data.profile_photo,
        child_age_stages: selectedChildStages,
      };
      delete payload.numberOfChildren;
      delete payload.current_photo;

      await fetch(`${BACKEND_URL}/actualizar_perfil.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      navigate("/perfil");
    } catch (error) {
      console.error("Error al guardar el perfil:", error);
    }
  };

  // Actualizar número de hijos
  const updateNumberOfChildren = async (value) => {
    // En modo demo, solo actualizar el estado local
    if (config.useMocks) {
      const numberValue = parseInt(value, 10);
      setFormData((prev) => ({ ...prev, numberOfChildren: numberValue }));
      return { success: true };
    }

    try {
      const numberValue = parseInt(value, 10);

      const response = await fetch(`${BACKEND_URL}/update_children.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number_of_children: numberValue,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setFormData((prev) => ({
          ...prev,
          numberOfChildren: result.data.number_of_children,
        }));
        return true;
      } else {
        console.error("Error al actualizar número de hijos:", result.error);
        return false;
      }
    } catch (error) {
      console.error("Error técnico al actualizar número de hijos:", error);
      return false;
    }
  };

  // Manejar cambios en las etapas de edad de hijos
  const handleChildStagesChange = (newStages) => {
    console.log("Perfil.js - handleChildStagesChange llamado con:", newStages);

    // Asegurar que siempre sea un array de números
    const numericStages = Array.isArray(newStages)
      ? newStages.map((id) => Number(id))
      : [];

    setSelectedChildStages(numericStages);
  };

  // Mostrar spinner mientras carga
  if (loading) {
    return <LoadingSpinner text="Cargando perfil..." />;
  }

  if (interestsLoading) {
    return <LoadingSpinner text="Cargando intereses..." />;
  }

  // Renderizar el formulario de perfil
  return (
    <div className="perfil-container">
      <div className="perfil-header">
        <h1>Editar Perfil</h1>
      </div>
      <div className="perfil-form-wrapper">
        <ProfileForm
          data={data}
          filteredCities={filteredCities}
          specialConditions={specialConditions}
          familyTypes={familyTypes}
          charCount={charCount}
          maxChars={MAX_PRESENTATION_CHARS}
          message={message}
          onInputChange={handleInputChange}
          onFileChange={handleFileChange}
          onCitySearch={handleCitySearch}
          onCitySelect={handleCitySelect}
          onConditionToggle={handleConditionToggle}
          onSave={handleSave}
          onSaveOrExit={handleSaveOrExit}
          selectedInterests={data.interests}
          onInterestChange={handleInterestChange}
          interests={availableInterests}
          isLoading={interestsLoading}
          onAddNewInterest={handleAddNewInterest}
          updateNumberOfChildren={updateNumberOfChildren}
          errorMessage={errorMessage}
          selectedChildStages={selectedChildStages}
          onChildStagesChange={handleChildStagesChange}
        />
        {errorMessage && <p className="error-message">{errorMessage}</p>}
      </div>
    </div>
  );
};

export default Perfil;
