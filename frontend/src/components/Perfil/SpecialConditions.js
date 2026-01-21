import React from "react";

// Este componente muestra las condiciones especiales seleccionadas por la usuaria.
// Lo implementé como un componente separado para poder reutilizarlo tanto en
// la vista de edición como en la vista de perfil

const SpecialConditions = ({ selectedConditions }) => {
  return (
    <div className="mommatch-perfil__conditions-field">
      <label className="mommatch-perfil__form-label">
        Condiciones especiales
      </label>
      <div className="mommatch-perfil__conditions-list">
        {selectedConditions.length > 0 ? (
          selectedConditions.map((condition, index) => (
            <span key={index} className="mommatch-perfil__condition-tag">
              <i
                className={`mommatch-perfil__condition-icon ${condition.icon}`}
              ></i>
              {condition.name}
            </span>
          ))
        ) : (
          <p className="mommatch-perfil__no-conditions">
            No se han seleccionado condiciones especiales
          </p>
        )}
      </div>
    </div>
  );
};

export default SpecialConditions;
