import React from "react";
import { MAX_PRESENTATION_CHARS } from "./utils";

// Este componente es la versión anterior del campo de presentación.
// Mantuve ambos durante el desarrollo para comparar funcionamiento.
// Al final me decidí por PresentationField
// Conservé este por si necesitábamos volver a la implementación
// anterior.

const Presentation = ({ data, handleInputChange }) => {
  return (
    <div className="form-group highlight-field presentation-field">
      <label htmlFor="presentation" className="highlight-label">
        Preséntate a las otras mamás
      </label>
      <textarea
        id="presentation"
        name="presentation"
        value={data.presentation || ""}
        onChange={handleInputChange}
        className="form-input"
        placeholder="Escribe una breve presentación sobre ti para que las demás mamás te conozcan mejor (máximo 500 caracteres)"
        rows="4"
        maxLength={MAX_PRESENTATION_CHARS}
      ></textarea>
      <div
        className={`char-counter ${
          ((data.presentation?.length || 0) / MAX_PRESENTATION_CHARS) * 100 >=
          90
            ? "danger"
            : ((data.presentation?.length || 0) / MAX_PRESENTATION_CHARS) *
                100 >=
              75
            ? "warning"
            : ""
        }`}
      >
        {data.presentation?.length || 0}/{MAX_PRESENTATION_CHARS} caracteres
      </div>
    </div>
  );
};

export default Presentation;
