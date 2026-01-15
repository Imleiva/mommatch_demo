import React from "react";

// Componente para seleccionar el tipo de familia.
// Es básicamente un wrapper sobre un select nativo pero con estilos
// consistentes con el resto del formulario de perfil.
//--
// Intenté usar un componente más visual como el de ConnectionTypeSelector,
// pero al haber tantas opciones de tipos de familia resultaba demasiado
// extenso y el dropdown tradicional funcionaba mejor

const FamilyTypeSelector = ({
  familyTypes,
  selectedFamilyType,
  onFamilyTypeChange,
}) => {
  return (
    <div className="form-group highlight-field family-type-field">
      <label htmlFor="family_type" className="highlight-label">
        Tipo de familia
      </label>
      <select
        id="family_type"
        name="family_type"
        value={selectedFamilyType}
        onChange={onFamilyTypeChange}
        className="form-input"
      >
        {familyTypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default FamilyTypeSelector;
