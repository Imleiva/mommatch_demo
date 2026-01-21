import { useEffect } from "react";
import ProfilePhoto from "./ProfilePhoto";
import CityAutocomplete from "../CityAutocomplete";
import FamilyTypeSelector from "./FamilyTypeSelector";
import SpecialConditionsSelector from "./SpecialConditionsSelector";
import PresentationField from "./PresentationField";
import MessageDisplay from "./MessageDisplay";
import InterestsComponent from "../InterestsComponent";
import ConnectionTypeSelector from "./ConnectionTypeSelector";
import ChildStagesSelector from "./ChildStagesSelector";

// Este componente es el formulario principal para la edición del perfil.
// Lo estructuré en varias secciones para
// hacerlo más manejable tanto para mi como para las usuarias.
// Me costó bastante hacer que el componente de etapas de los hijos funcionara
// correctamente - tuve varios bugs con la conversión de tipos (strings vs numbers)
// y con el manejo de arrays vacíos. Por eso añadí tantas verificaciones y logs.
//--
// La distribución en columnas la diseñé pensando en aprovechar bien el espacio

const ProfileForm = ({
  data,
  filteredCities,
  specialConditions,
  familyTypes,
  charCount,
  maxChars,
  message,
  onInputChange,
  onFileChange,
  onCitySearch,
  onConditionToggle,
  onSave,
  onSaveOrExit,
  selectedInterests,
  onInterestChange,
  interests,
  isLoading,
  onAddNewInterest,
  updateNumberOfChildren,
  selectedChildStages = [],
  onChildStagesChange,
}) => {
  // Asegurarse de que data sea siempre un objeto válido
  const safeData = data || {};

  // Mejorar la función intermediaria de manejo de etapas
  const handleChildStagesChange = (newStages) => {
    console.log("ProfileForm - handleChildStagesChange recibió:", newStages);

    // Verificación robusta del callback
    if (typeof onChildStagesChange !== "function") {
      console.error(
        "ProfileForm - Error crítico: onChildStagesChange no es una función"
      );
      return;
    }

    // Asegurar que los datos son un array de números
    const numericStages = Array.isArray(newStages)
      ? newStages.map((id) => Number(id))
      : [];

    console.log("ProfileForm - Enviando etapas normalizadas:", numericStages);

    // Llamar al callback del componente padre con los datos normalizados
    onChildStagesChange(numericStages);
  };

  // Añadir log en un useEffect para identificar problemas en cada renderizado
  useEffect(() => {
    console.log("ProfileForm - Renderizado con estos datos de etapas:", {
      selectedChildStages: Array.isArray(selectedChildStages)
        ? selectedChildStages
        : "No es array",
      selectedChildStagesLength: Array.isArray(selectedChildStages)
        ? selectedChildStages.length
        : "N/A",
      onChildStagesChangeType: typeof onChildStagesChange,
    });
  }, [selectedChildStages, onChildStagesChange]);

  return (
    <form onSubmit={onSave} className="profile-edit-form">
      <MessageDisplay message={message} />

      <div className="profile-section">
        <h2 className="section-title">Foto de perfil</h2>
        <ProfilePhoto
          currentPhoto={safeData.current_photo || ""}
          onFileChange={onFileChange}
        />
      </div>

      <div className="profile-section">
        <h2 className="section-title">Información básica</h2>
        <div className="form-columns">
          {/* Primera columna - Datos básicos */}
          <div className="form-column">
            <div className="form-group city-field highlight-field">
              <label htmlFor="city" className="highlight-label">
                Ciudad
              </label>
              <CityAutocomplete
                value={safeData.city || ""}
                onChange={(value) => {
                  // Simulamos un evento con el nuevo valor para mantener compatibilidad
                  onCitySearch({ target: { value } });
                }}
              />
            </div>
            <div className="form-group highlight-field country-field">
              <label htmlFor="country" className="highlight-label">
                País
              </label>
              <input
                type="text"
                id="country"
                name="country"
                value={safeData.country || ""}
                onChange={(e) => {
                  // Validar que solo se ingresen caracteres alfabéticos
                  const inputValue = e.target.value;
                  if (
                    /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s\-'.]*$/.test(inputValue) ||
                    inputValue === ""
                  ) {
                    onInputChange(e);
                  }
                }}
                className="form-input"
                placeholder="Ej: España (opcional)"
                title="Por favor, ingresa solo letras (sin números o caracteres especiales)"
                style={{ backgroundColor: "white" }}
              />
            </div>
            <div className="form-group highlight-field age-field">
              <label htmlFor="mother_age" className="highlight-label">
                Tu edad
              </label>
              <input
                type="number"
                id="mother_age"
                name="mother_age"
                value={
                  safeData.mother_age !== null &&
                  safeData.mother_age !== undefined
                    ? safeData.mother_age
                    : ""
                }
                onChange={onInputChange}
                className="form-input"
                min="18"
                max="99"
                placeholder="Ej: 35"
              />
            </div>
            <div className="form-group highlight-field children-count-field">
              <label htmlFor="numberOfChildren" className="highlight-label">
                Número de hijos
              </label>
              <input
                type="number"
                id="numberOfChildren"
                name="numberOfChildren"
                value={
                  safeData.numberOfChildren !== null &&
                  safeData.numberOfChildren !== undefined
                    ? safeData.numberOfChildren
                    : 0
                }
                onChange={(e) => updateNumberOfChildren(e.target.value)}
                className="form-input"
                min="0"
                max="12"
              />
            </div>
          </div>

          {/* Segunda columna - Tipo de familia */}
          <div className="form-column">
            <FamilyTypeSelector
              familyTypes={familyTypes}
              selectedFamilyType={safeData.family_type || "monoparental"}
              onFamilyTypeChange={onInputChange}
            />

            {/* Mover el selector de etapas de edad de los hijos a la segunda columna */}
            <div className="form-group highlight-field child-stages-field">
              <label className="highlight-label">Edad de tus hij@s</label>
              <ChildStagesSelector
                selectedStages={
                  Array.isArray(selectedChildStages)
                    ? selectedChildStages.map((id) => Number(id))
                    : []
                }
                onChange={handleChildStagesChange}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Tercera columna - Condiciones especiales */}
          <div className="form-column">
            <SpecialConditionsSelector
              specialConditions={specialConditions}
              selectedConditions={safeData.specialConditions || []}
              onConditionToggle={onConditionToggle}
            />
          </div>
        </div>
      </div>

      <div className="profile-section">
        <h2 className="section-title">Preferencias de conexión</h2>
        <div className="form-group">
          <ConnectionTypeSelector
            value={safeData.connection_type || "any"}
            onChange={onInputChange}
          />
        </div>
      </div>

      <div className="profile-section">
        <InterestsComponent
          selectedInterests={selectedInterests || []}
          onInterestChange={onInterestChange}
          interests={interests || []}
          isLoading={isLoading}
          onAddNewInterest={onAddNewInterest}
        />
      </div>

      <div className="profile-section">
        <h2 className="section-title">Sobre mí</h2>
        <PresentationField
          presentation={safeData.presentation || ""}
          charCount={charCount}
          maxChars={maxChars}
          onInputChange={onInputChange}
          charCounterClass={
            ((safeData.presentation?.length || 0) / maxChars) * 100 >= 90
              ? "danger"
              : ((safeData.presentation?.length || 0) / maxChars) * 100 >= 75
              ? "warning"
              : ""
          }
        />
      </div>

      <div className="profile-actions">
        <button
          type="button"
          className="profile-submit-button"
          onClick={onSaveOrExit}
        >
          Guardar y volver a tu perfil
        </button>
      </div>
    </form>
  );
};

export default ProfileForm;
