import React, { useState, useEffect, useRef } from "react";
import "../App.css";

// Componente autocomplete personalizado y reutilizable para
// no depender de librerías externas.
//--
// Maneja tanto la actualización interna del estado
// como la comunicación con el componente padre a través de eventos
// sintéticos. Así logré que sea compatible con formularios controlados de React.

const CustomAutocomplete = ({
  suggestions = [],
  inputProps = {},
  onSelect,
  placeholder = "Escriba para buscar...",
}) => {
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [inputValue, setInputValue] = useState(inputProps.value || "");
  const wrapperRef = useRef(null);

  // Actualizar el valor interno si cambia desde fuera
  useEffect(() => {
    if (inputProps.value !== undefined) {
      setInputValue(inputProps.value);
    }
  }, [inputProps.value]);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleChange = (e) => {
    const userInput = e.target.value;
    setInputValue(userInput);

    // Filtrar sugerencias
    const filtered = suggestions.filter(
      (suggestion) =>
        suggestion.toLowerCase().indexOf(userInput.toLowerCase()) > -1
    );

    // Actualizar estados
    setFilteredSuggestions(filtered);
    setShowSuggestions(userInput.length > 0);
    setActiveIndex(0);

    // Pasar el evento al handler original si existe
    if (inputProps.onChange) {
      inputProps.onChange(e);
    }
  };

  const handleClick = (suggestion) => {
    // Actualizar valor interno
    setInputValue(suggestion);

    // Cerrar sugerencias y reiniciar el índice activo
    setFilteredSuggestions([]);
    setShowSuggestions(false);
    setActiveIndex(0);

    // Notificar selección
    if (onSelect) {
      onSelect(suggestion);
    }

    // Actualizar valor en componente padre
    if (inputProps.onChange) {
      const syntheticEvent = {
        target: {
          name: inputProps.name || "",
          value: suggestion,
        },
        preventDefault: () => {},
        stopPropagation: () => {},
      };
      inputProps.onChange(syntheticEvent);
    }
  };

  const handleKeyDown = (e) => {
    // Enter key
    if (e.keyCode === 13) {
      if (filteredSuggestions.length > 0 && showSuggestions) {
        handleClick(filteredSuggestions[activeIndex]);
        e.preventDefault();
      }
    }
    // Up arrow
    else if (e.keyCode === 38) {
      if (activeIndex === 0) return;
      setActiveIndex(activeIndex - 1);
      e.preventDefault();
    }
    // Down arrow
    else if (e.keyCode === 40) {
      if (activeIndex === filteredSuggestions.length - 1) return;
      setActiveIndex(activeIndex + 1);
      e.preventDefault();
    }
    // Escape
    else if (e.keyCode === 27) {
      setShowSuggestions(false);
      e.preventDefault();
    }
  };

  // Separamos las propiedades que no queremos pasar directamente al input
  const { ...restInputProps } = inputProps;

  return (
    <div className="autocomplete-container" ref={wrapperRef}>
      <input
        type="text"
        className="custom-autocomplete"
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        value={inputValue}
        autoComplete="off"
        {...restInputProps}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="autocomplete-items">
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={index === activeIndex ? "autocomplete-active" : ""}
              onClick={() => handleClick(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomAutocomplete;
