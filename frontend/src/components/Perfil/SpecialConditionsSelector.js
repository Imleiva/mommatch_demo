import React from "react";

// Este componente es un selector de condiciones especiales que permite a las
// usuarias marcar circunstancias particulares de sus hijos o familia.
// Lo diseñé con botones tipo "tag" que se activan/desactivan con un clic,
// haciendo la interfaz intuitiva y visual con los iconos correspondientes.
//--
// Lo desarrollé para complementar el componente SpecialConditions que solo
// muestra las condiciones en modo de lectura, mientras que este permite
// seleccionarlas durante la edición del perfil

const SpecialConditionsSelector = ({
  specialConditions,
  selectedConditions,
  onConditionToggle,
}) => {
  return (
    <div className="form-group highlight-field special-conditions-field">
      <label className="highlight-label">Condiciones especiales</label>
      <div className="profile-special-conditions-list">
        {specialConditions.map((condition) => (
          <button
            key={condition.id}
            type="button"
            className={`special-condition-tag ${
              selectedConditions.includes(condition.id) ? "selected" : ""
            }`}
            onClick={() => onConditionToggle(condition.id)}
          >
            <span className="condition-icon">{condition.icon}</span>
            {condition.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SpecialConditionsSelector;
