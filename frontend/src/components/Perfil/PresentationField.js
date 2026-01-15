import React from "react";

// Este componente maneja el campo de presentación
// Implementé un contador de caracteres inteligente que cambia de color
// según se acerca al límite (amarillo al 75%, rojo al 90%).
// Esta pequeña característica da un feedback visual muy útil a las
// usuarias sin necesidad de instrucciones adicionales. Quería que
// fuera intuitivo y que no tuvieran sorpresas al intentar guardar
// el formulario por exceder el límite

const PresentationField = ({
  presentation,
  charCount,
  maxChars,
  onInputChange,
}) => {
  return (
    <div className="form-group highlight-field presentation-field">
      <label htmlFor="presentation" className="highlight-label">
        Preséntate a las otras mamás
      </label>
      <textarea
        id="presentation"
        name="presentation"
        value={presentation || ""}
        onChange={onInputChange}
        className="form-input"
        placeholder="Escribe una breve presentación sobre ti para que las demás mamás te conozcan mejor (máximo 500 caracteres)"
        rows="4"
        maxLength={maxChars}
      ></textarea>
      <div
        className={`char-counter ${
          (charCount / maxChars) * 100 >= 90
            ? "danger"
            : (charCount / maxChars) * 100 >= 75
            ? "warning"
            : ""
        }`}
      >
        {charCount}/{maxChars} caracteres
      </div>
    </div>
  );
};

export default PresentationField;
