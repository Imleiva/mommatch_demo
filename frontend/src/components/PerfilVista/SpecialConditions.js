import React from "react";

// Este componente es la versión de "solo lectura" para mostrar las condiciones especiales
// en la vista de perfil. Es más simple que en la sección de edición.
// La parte de mapeo de IDs a nombres fue lo más complicado de implementar

const SpecialConditions = ({ conditions, otherCondition, conditionMap }) => {
  return (
    <div>
      {conditions?.length > 0 ? (
        <div className="mommatch-profile-view__tags">
          {conditions.map((condition) => (
            <span key={condition} className="mommatch-profile-view__tag">
              {conditionMap[condition]
                ? `${conditionMap[condition].icon} ${conditionMap[condition].label}`
                : condition}
            </span>
          ))}
        </div>
      ) : (
        <p className="mommatch-profile-view__no-conditions">
          No has especificado condiciones especiales.
        </p>
      )}
      {otherCondition && (
        <div className="mommatch-profile-view__info-group">
          <span className="mommatch-profile-view__info-label">
            Otra condición:
          </span>
          <div className="mommatch-profile-view__tags">
            <span className="mommatch-profile-view__tag">{otherCondition}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecialConditions;
