import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../Perfil.css";
import ProfileForm from "./ProfileForm";
import {
  formatPhotoUrl,
  verifySession,
  BACKEND_URL_CONSTANT as BACKEND_URL,
  specialConditions,
  familyTypes,
} from "./utils";

// Este componente es el cerebro de todo el módulo de perfil, coordinando todos los
// subcomponentes y manejando la lógica de estado y comunicación con el backend.
// --
// Me dio bastantes problemas la gestión de las etapas de los hijos. Tuve
// problemas con la conversión de tipos (llegaban como strings pero necesitaba numbers)
// y con arrays vacíos que se rompían en el .map(). Dee ahí tantos console.log y
// comprobaciones extra que normalmente no incluiría.
//--
// Otro punto complicado fue el manejo de intereses, especialmente cuando añadían
// uno nuevo que no existía en la base de datos. Tuve que crear un endpoint específico
// y sincronizar bien los estados para que no hubiera inconsistencias

const MAX_PRESENTATION_CHARS = 500;

const Perfil = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

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
  });

  const [cities] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [interests, setInterests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [setIsFormTouched] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedChildStages, setSelectedChildStages] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) verifySession();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!user?.id) return;

    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setMessage({ text: "", type: "" });

        // Añadir un parámetro de timestamp para evitar caché
        const timestamp = new Date().getTime();
        const profileResponse = await fetch(
          `${BACKEND_URL}/get_profile.php?user_id=${user.id}&t=${timestamp}`,
          { credentials: "include" }
        );

        if (!profileResponse.ok) {
          throw new Error(`Error HTTP: ${profileResponse.status}`);
        }

        const profileResult = await profileResponse.json();

        if (profileResult.success) {
          console.log("Detalle completo de respuesta:", profileResult);

          const parsedProfile = {
            ...profileResult.profile,
          };

          // Extraer la presentación para actualizar el contador de caracteres
          const presentation = parsedProfile.presentation || "";

          // Preparar los intereses del usuario
          let userInterests = [];

          // Verificar si hay intereses en el perfil
          if (profileResult.interests && profileResult.interests.length > 0) {
            userInterests = profileResult.interests;
            console.log("Intereses encontrados en el perfil:", userInterests);
          } else {
            console.log("No se encontraron intereses en el perfil");
          }

          setFormData({
            city: parsedProfile.city || "",
            country: parsedProfile.country || "",
            specialConditions: parsedProfile.special_conditions || [],
            numberOfChildren: Number(parsedProfile.number_of_children) || 0,
            interests: userInterests,
            user_id: user.id,
            current_photo: formatPhotoUrl(parsedProfile.profile_photo),
            mother_age: parsedProfile.mother_age || "",
            family_type: parsedProfile.family_type || "monoparental",
            presentation: presentation,
          });

          // Simplificamos la gestión de etapas
          if (
            profileResult.child_stage_ids &&
            Array.isArray(profileResult.child_stage_ids)
          ) {
            // Usar el array de IDs que ahora viene directamente del backend
            console.log(
              "Usando array de IDs proporcionado por el backend:",
              profileResult.child_stage_ids
            );
            setSelectedChildStages(profileResult.child_stage_ids);
          } else if (
            profileResult.child_stages &&
            Array.isArray(profileResult.child_stages)
          ) {
            // Fallback al comportamiento anterior
            const stageIds = profileResult.child_stages.map((stage) =>
              Number(stage.id)
            );
            console.log("Extrayendo IDs de child_stages:", stageIds);
            setSelectedChildStages(stageIds);
          } else {
            console.log(
              "No se encontraron etapas de hijos, usando array vacío"
            );
            setSelectedChildStages([]);
          }
        } else {
          throw new Error(profileResult.error || "Error al cargar el perfil.");
        }
      } catch (error) {
        console.error("Error general cargando datos:", error);
        setMessage({
          text: "Error al cargar los datos. Por favor recarga la página.",
          type: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [user?.id]);

  useEffect(() => {
    const fetchInterests = async () => {
      setIsLoading(true);
      
      // Usar datos mock en modo demo
      if (!BACKEND_URL) {
        const mockInterests = [
          { id: 1, name: "Yoga" },
          { id: 2, name: "Lectura" },
          { id: 3, name: "Naturaleza" },
          { id: 4, name: "Cocina" },
          { id: 5, name: "Arte" },
          { id: 6, name: "Música" },
          { id: 7, name: "Deportes" },
          { id: 8, name: "Fotografía" }
        ];
        setInterests(mockInterests);
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`${BACKEND_URL}/get_interests.php`, {
          credentials: "include",
        });
        const data = await response.json();

        if (data.success) {
          console.log("Intereses cargados:", data.data);
          setInterests(data.data);
        } else {
          console.error("Error al obtener intereses:", data.error);
        }
      } catch (error) {
        console.error("Error al conectar con el backend:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Solo cargamos intereses si no tenemos datos
    if (interests.length === 0) {
      fetchInterests();
    }
  }, [interests.length]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setIsFormTouched(true);
  };

  const handleFileChange = async (file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("profile_photo", file);

    try {
      const response = await fetch(`${BACKEND_URL}/actualizar_perfil.php`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setFormData((prev) => ({
          ...prev,
          // Forzar recarga de la imagen cuando se sube una nueva foto
          current_photo: formatPhotoUrl(data.profile?.photo_url, true),
        }));
        setMessage({ text: "Foto actualizada correctamente", type: "success" });
      } else {
        setMessage({
          text: data.error || "Error al actualizar la foto",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error al subir la foto:", error);
      setMessage({ text: "Error al subir la foto", type: "error" });
    }
  };

  const handleCitySearch = (e) => {
    const searchTerm = e.target.value.trim().toLowerCase();
    setFormData((prev) => ({ ...prev, city: e.target.value }));

    const filtered = cities.filter((city) => {
      if (city && typeof city.name === "string") {
        return city.name.toLowerCase().includes(searchTerm);
      }
      return false;
    });

    setFilteredCities(filtered);
  };

  const handleCitySelect = (selectedCity) => {
    setFormData((prev) => ({ ...prev, city: selectedCity.name }));
    setFilteredCities([]);
  };

  const handleConditionToggle = (conditionId) => {
    setFormData((prev) => {
      const newConditions = prev.specialConditions.includes(conditionId)
        ? prev.specialConditions.filter((id) => id !== conditionId)
        : [...prev.specialConditions, conditionId];
      return { ...prev, specialConditions: newConditions };
    });
    setIsFormTouched(true);
  };

  const handleAddNewInterest = async (interestName) => {
    // En modo demo, agregar localmente sin llamar al backend
    if (!BACKEND_URL) {
      const newInterest = {
        id: Date.now(), // ID temporal
        name: interestName
      };
      setInterests((prev) => [...prev, newInterest]);
      setSelectedInterests((prev) => [...prev, newInterest.name]);
      setFormData((prev) => ({
        ...prev,
        interests: [...prev.interests, newInterest.name],
      }));
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/add_interest.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interest: interestName }),
      });

      const data = await response.json();
      if (data.success) {
        setInterests((prev) => [...prev, data.interest]);
        setSelectedInterests((prev) => [...prev, data.interest.name]);
        setFormData((prev) => ({
          ...prev,
          interests: [...prev.interests, data.interest.name],
        }));
      } else {
        throw new Error(data.message || "Error al añadir el interés");
      }
    } catch (error) {
      console.error("Error al añadir interés:", error);
    }
  };

  const handleInterestChange = (newInterests) => {
    setSelectedInterests(newInterests);
    setFormData((prevData) => ({
      ...prevData,
      interests: newInterests,
    }));
    setIsFormTouched(true);
  };

  // La función para manejar cambios en las etapas seleccionadas
  const handleChildStagesChange = useCallback(
    (newStages) => {
      console.log("Perfil - handleChildStagesChange llamado con:", newStages);

      // Asegurar que siempre sea un array de números
      const numericStages = Array.isArray(newStages)
        ? newStages.map((id) => Number(id))
        : [];

      setSelectedChildStages(numericStages);
      // Usar la función setIsFormTouched de forma segura
      if (typeof setIsFormTouched === "function") {
        setIsFormTouched(true);
      }

      console.log("Perfil - selectedChildStages actualizado a:", numericStages);
    },
    [setIsFormTouched]
  ); // Añadir setIsFormTouched como dependencia

  // Modificación clave: función handleSave mejorada con más verificaciones
  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Debugging completo de datos críticos antes de enviar
      console.log("Perfil - Guardando con estos datos:");
      console.log("  - selectedChildStages:", selectedChildStages);
      console.log("  - selectedChildStages tipo:", typeof selectedChildStages);
      console.log(
        "  - selectedChildStages es array:",
        Array.isArray(selectedChildStages)
      );
      console.log(
        "  - selectedChildStages contenido:",
        JSON.stringify(selectedChildStages)
      );

      // IMPORTANTE: Asegurar que child_age_stages siempre sea un array limpio de números
      const childAgeStages = Array.isArray(selectedChildStages)
        ? selectedChildStages.map((id) => Number(id))
        : [];

      // Verificar que no hay duplicados (por si acaso)
      const uniqueStages = [...new Set(childAgeStages)];
      if (uniqueStages.length !== childAgeStages.length) {
        console.warn(
          "Perfil - Se detectaron etapas duplicadas, se eliminarán:",
          childAgeStages,
          "->",
          uniqueStages
        );
      }

      const payload = {
        user_id: user?.id,
        city: data.city || "",
        country: data.country || "",
        specialConditions: data.specialConditions || [],
        number_of_children: data.numberOfChildren || 0,
        profile_photo: data.current_photo || "",
        mother_age: data.mother_age || "",
        family_type: data.family_type || "monoparental",
        presentation: data.presentation || "",
        interests: selectedInterests || [],
        child_age_stages: uniqueStages,
        profile_update: true, // Indicar que es una actualización intencional
      };

      console.log(
        "Perfil - Payload completo (stringified):",
        JSON.stringify(payload)
      );
      console.log(
        "Perfil - Campo crítico child_age_stages:",
        JSON.stringify(payload.child_age_stages)
      );

      // Forzar el Content-Type y Accept para asegurar JSON
      const response = await fetch(`${BACKEND_URL}/actualizar_perfil.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      console.log("Perfil - Status de la respuesta:", response.status);

      // Verificar que la respuesta es correcta
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Respuesta de error:", errorText);
        throw new Error(
          `Error en la respuesta del servidor (${response.status}): ${errorText}`
        );
      }

      const result = await response.json();
      console.log("Perfil - Respuesta completa del servidor:", result);

      // Mostrar mensaje de éxito y redirigir
      if (result.success) {
        setMessage({
          text: "Perfil guardado correctamente",
          type: "success",
        });

        // Hacer una pausa antes de redirigir para que el usuario vea el mensaje
        setTimeout(() => {
          navigate("/perfil");
        }, 1500);
      } else {
        throw new Error(
          result.error || "Error desconocido al guardar el perfil"
        );
      }
    } catch (error) {
      console.error("Error al guardar el perfil:", error);
      setMessage({
        text: `Error al guardar el perfil: ${error.message}`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOrExit = async (e) => {
    e.preventDefault();
    navigate("/perfil");
  };

  return (
    <div className="perfil-edicion__container">
      <div className="perfil-edicion__header">
        <h1>Editar Perfil</h1>
      </div>
      <div className="perfil-edicion__form">
        {/* Verificar que realmente se está pasando la función correcta */}
        {console.log(
          "Perfil - Rendering ProfileForm, onChildStagesChange:",
          typeof handleChildStagesChange
        )}
        <ProfileForm
          data={data}
          filteredCities={filteredCities}
          specialConditions={specialConditions}
          familyTypes={familyTypes}
          maxChars={MAX_PRESENTATION_CHARS}
          message={message}
          onInputChange={handleInputChange}
          onFileChange={handleFileChange}
          onCitySearch={handleCitySearch}
          onCitySelect={handleCitySelect}
          onConditionToggle={handleConditionToggle}
          onSave={handleSave}
          onSaveOrExit={handleSaveOrExit}
          selectedInterests={selectedInterests}
          onInterestChange={handleInterestChange}
          interests={interests}
          isLoading={isLoading}
          onAddNewInterest={handleAddNewInterest}
          selectedChildStages={selectedChildStages}
          onChildStagesChange={handleChildStagesChange}
        />
      </div>
    </div>
  );
};

export default Perfil;
