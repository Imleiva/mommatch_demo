import "../Perfil.css";

// Este componente permite a las usuarias elegir qué tipo de conexiones buscan:
// presenciales, virtuales o ambas. Diseñé las opciones como tarjetas visuales
// con título y descripción detallada para que la elección sea más clara.
//--
// Originalmente lo implementé como botones normales, pero cambié a inputs de tipo
// radio con labels personalizados para mejorar la accesibilidad

const ConnectionTypeSelector = ({ value, onChange }) => {
  const handleOptionChange = (e) => {
    onChange({
      target: {
        name: "connection_type",
        value: e.target.value,
      },
    });
  };

  return (
    <div className="form-group highlight-field connection-type-form-group">
      <label className="highlight-label">¿Qué tipo de conexiones buscas?</label>

      <div className="modern-radio-options">
        <div className="modern-radio-option">
          <input
            type="radio"
            id="connection-inperson"
            name="connection_type"
            value="inPerson"
            checked={value === "inPerson"}
            onChange={handleOptionChange}
          />
          <label htmlFor="connection-inperson">
            <div className="option-content">
              <span className="option-title">Presencial</span>
              <span className="option-description">
                Prefiero conocer a otras mamás en persona para quedar, tomar un
                café o hacer actividades juntas.
              </span>
            </div>
          </label>
        </div>

        <div className="modern-radio-option">
          <input
            type="radio"
            id="connection-remote"
            name="connection_type"
            value="remote"
            checked={value === "remote"}
            onChange={handleOptionChange}
          />
          <label htmlFor="connection-remote">
            <div className="option-content">
              <span className="option-title">Virtual</span>
              <span className="option-description">
                Prefiero conectar de forma virtual a través de videollamadas o
                chat.
              </span>
            </div>
          </label>
        </div>

        <div className="modern-radio-option">
          <input
            type="radio"
            id="connection-any"
            name="connection_type"
            value="any"
            checked={value === "any"}
            onChange={handleOptionChange}
          />
          <label htmlFor="connection-any">
            <div className="option-content">
              <span className="option-title">Ambas opciones</span>
              <span className="option-description">
                Estoy abierta tanto a conexiones presenciales como virtuales.
              </span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default ConnectionTypeSelector;
