import React from "react";
import { familyTypes } from "./utils";

// Este componente era la versión inicial del selector de tipo de familia.
// Lo dejé como referencia pero ya no se usa activamente en la aplicación.
// El problema era que tenía dependencias directas del objeto data del componente
// padre, mientras que la versión nueva (FamilyTypeSelector) es más modular
// y recibe solo los datos y callbacks que necesita.

const FamilyInfo = ({ data, handleInputChange, toggleSelection }) => {
  return (
    <div className="form-column">
      <div className="form-group highlight-field family-type-field">
        <label htmlFor="family_type" className="highlight-label">
          Tipo de familia
        </label>
        <select
          id="family_type"
          name="family_type"
          value={data.family_type}
          onChange={handleInputChange}
          className="form-select custom-select"
        >
          {familyTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default FamilyInfo;
