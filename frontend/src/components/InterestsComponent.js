import React, { useState, useEffect } from "react";
import "./Perfil.css";

// Este componente permite a las usuarias seleccionar sus intereses.
// Fue uno de los más complicados de implementar, especialmente la
// funcionalidad de añadir nuevos intereses personalizados.
//--
// Tuve que lidiar con muchos casos, como intereses que ya
// existen, validaciones de longitud, sincronización con el backend, etc.
// También añadí un sistema de respaldo con intereses predefinidos por
// si la API falla, para que las usuarias siempre tengan opciones

const FALLBACK_INTERESTS = [
  { id: "fotografía", name: "Fotografía de bebés" },
  { id: "minimalista", name: "Maternidad minimalista" },
  { id: "mindfulness", name: "Mindfulness maternal" },
  { id: "pintura", name: "Pintura" },
  { id: "porteo", name: "Porteo ergonómico" },
  { id: "postparto", name: "Recuperación postparto" },
  { id: "viajes", name: "Viajar con niños" },
  { id: "lectura", name: "Lectura" },
  { id: "cocina", name: "Cocina" },
  { id: "deporte", name: "Deporte" },
  { id: "música", name: "Música" },
  { id: "manualidades", name: "Manualidades" },
  { id: "senderismo", name: "Senderismo" },
  { id: "yoga", name: "Yoga" },
];

const InterestsComponent = ({
  selectedInterests = [],
  onInterestChange = () => {}, // Proporcionar una función vacía por defecto
  interests: receivedInterests = [],
  isLoading = false,
  onAddNewInterest,
}) => {
  const [interests, setInterests] = useState(FALLBACK_INTERESTS);
  const [newInterest, setNewInterest] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [inputError, setInputError] = useState("");

  // Usar los intereses recibidos del servidor o los predefinidos como respaldo
  useEffect(() => {
    console.log("Intereses seleccionados al iniciar:", selectedInterests);
    console.log("Intereses recibidos del servidor:", receivedInterests);

    // Si recibimos intereses del servidor, los usamos
    if (receivedInterests && receivedInterests.length > 0) {
      setInterests(receivedInterests);
    } else {
      // Si no, usamos los fallback
      setInterests(FALLBACK_INTERESTS);
    }
  }, [receivedInterests, selectedInterests]);

  // Validación del input en tiempo real
  useEffect(() => {
    if (newInterest.length > 50) {
      setInputError("El interés no puede tener más de 50 caracteres.");
    } else if (
      interests.some(
        (i) =>
          (typeof i === "string" &&
            i.toLowerCase() === newInterest.toLowerCase().trim()) ||
          (i.name && i.name.toLowerCase() === newInterest.toLowerCase().trim())
      )
    ) {
      setInputError("Este interés ya existe en la lista.");
    } else {
      setInputError("");
    }
  }, [newInterest, interests]);

  // Depuración
  useEffect(() => {
    console.log("Estado actual:", {
      receivedInterests,
      interests,
      selectedInterests,
      isLoading,
    });
  }, [receivedInterests, interests, selectedInterests, isLoading]);

  // Añadir un nuevo interés
  const handleAddInterest = async () => {
    if (!newInterest.trim()) return;

    try {
      if (onAddNewInterest) {
        // Usar la función proporcionada por el padre
        await onAddNewInterest(newInterest.trim());
        setNewInterest("");
        setShowAddForm(false);
      }
    } catch (error) {
      setInputError(error.message || "Error al añadir el interés.");
    }
  };

  if (isLoading) {
    return (
      <div className="interests-container">
        <h3 className="interests-title">Tus Intereses</h3>
        <div className="interests-loading">Cargando intereses...</div>
      </div>
    );
  }

  // Este es el caso especial que detecta si hay intereses seleccionados pero que no existen en la lista
  // y los agrega directamente a la lista de intereses
  const displayInterests = [...interests];
  if (selectedInterests && selectedInterests.length > 0) {
    selectedInterests.forEach((selectedInterest) => {
      // Buscar si ya existe en la lista de intereses
      const exists = displayInterests.some(
        (interest) =>
          (typeof interest === "string" && interest === selectedInterest) ||
          interest.name === selectedInterest ||
          interest.id === selectedInterest
      );

      // Si no existe, agrégalo
      if (!exists) {
        displayInterests.push({
          id: selectedInterest,
          name: selectedInterest,
        });
      }
    });
  }

  // Función interna que maneja el cambio de intereses con verificación
  const handleInterestChange = (isSelected, valueToUse) => {
    // Verificar si onInterestChange es una función antes de llamarla
    if (typeof onInterestChange === "function") {
      onInterestChange(
        isSelected
          ? selectedInterests.filter((i) => i !== valueToUse)
          : [...selectedInterests, valueToUse]
      );
    } else {
      console.warn("onInterestChange no es una función o no está definida");
    }
  };

  return (
    <div className="interests-container">
      <div className="interests-header interests-header-inline">
        <h3 className="interests-title">Tus Intereses</h3>
      </div>
      {showAddForm && (
        <div
          className="add-interest-form-inline"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            margin: "0.7rem 0 1.2rem 0",
          }}
        >
          <input
            type="text"
            value={newInterest || ""}
            onChange={(e) => setNewInterest(e.target.value)}
            placeholder="Escribe un nuevo interés"
            className={`interest-input ${inputError ? "error" : ""}`}
            maxLength={50}
            style={{
              borderRadius: "20px",
              width: "500px",
              minWidth: 0,
              padding: "0.3rem 0.6rem",
              fontSize: "0.9rem",
            }}
          />
          <button
            type="button"
            disabled={!newInterest.trim() || !!inputError || isLoading}
            className="save-interest-button add-interest-button"
            onClick={handleAddInterest}
          >
            {isLoading ? "Guardando..." : "Guardar"}
          </button>
          {inputError && (
            <div className="error-message" style={{ marginLeft: "0.5rem" }}>
              {inputError}
            </div>
          )}
        </div>
      )}
      <button
        className="cancel-interest-button"
        style={{
          borderRadius: "25px",
          backgroundColor: "#ff6f61",
          fontFamily: "Poppins",
          padding: "0rem 1rem",
          height: "2rem",
          margin: "0.4rem",
        }}
        onClick={(e) => {
          e.preventDefault();
          if (showAddForm && newInterest.trim()) {
            handleAddInterest();
          }
          setShowAddForm(!showAddForm);
          setInputError("");
        }}
        disabled={isLoading}
      >
        {showAddForm ? "Cancelar" : "+ Añadir interés"}
      </button>

      <div className="interests-tags">
        {displayInterests.map((interest, index) => {
          const interestName =
            typeof interest === "string" ? interest : interest.name;
          const interestId =
            typeof interest === "string" ? interest : interest.id;

          // Verificar si está seleccionado, comparando tanto por id como por nombre
          const isSelected =
            selectedInterests.includes(interestId) ||
            selectedInterests.includes(interestName);

          return (
            <button
              key={interestId || index}
              type="button"
              className={`tag ${isSelected ? "selected" : ""}`}
              onClick={() => handleInterestChange(isSelected, interestName)}
            >
              {interestName}
            </button>
          );
        })}
      </div>

      {displayInterests.length === 0 && !showAddForm && !isLoading && (
        <p className="no-interests">
          No hay intereses disponibles. ¡Sé la primera en añadir uno!
        </p>
      )}
    </div>
  );
};

export default React.memo(InterestsComponent);
