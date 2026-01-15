import React, { useState, useEffect } from "react";
import LoadingSpinner from "./LoadingSpinner";
import classNames from "classnames";
import "./CityAutocomplete.css";

// Este componente de autocompletado para búsqueda de ciudades
// implementa un campo de entrada con búsqueda predictiva que
// muestra sugerencias basadas en lo que la usuaria escribe.
//--
// Lo más complejo fue implementar el debounce para evitar bombardear el servidor
// con peticiones cada vez que se pulsa una tecla

const CityAutocomplete = ({ value, onChange }) => {
  const [timeoutId, setTimeoutIdState] = useState(null);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [localValue, setLocalValue] = useState(value || "");

  useEffect(() => {
    setLocalValue(value || ""); // Sincroniza el valor local con el prop value
  }, [value]);

  const debounceTime = 500;

  // Realiza la petición al backend para obtener sugerencias de ciudades

  const getCities = async (searchValue) => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost/mommatch/backend/get_cities.php?search=${searchValue.toLowerCase()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const res = await response.json();

      if (res.data.length === 0) {
        setCities([]);
        setNoResults(true);
      } else {
        setCities(res.data);
        setNoResults(false);
      }
    } catch (error) {
      console.error("Error al cargar las ciudades:", error);
      setCities([]);
      setNoResults(true);
    } finally {
      setLoading(false);
    }
  };

  // Manejo los cambios en el campo de entrada con técnica debounce

  const updateSearch = (newValue) => {
    setLocalValue(newValue); // Actualizar el valor local

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    setCities([]);
    setNoResults(false);

    if (newValue.trim() === "") {
      setTimeoutIdState(null);
      onChange(newValue); // Notificar al padre incluso si está vacío
      return;
    }

    const newTimeoutId = setTimeout(() => {
      getCities(newValue);
      onChange(newValue); // Notificar al padre después del debounce
    }, debounceTime);

    setTimeoutIdState(newTimeoutId);
  };

  // Maneja la selección de una ciudad de la lista de sugerencias
  const selectElement = (element) => {
    onChange(element.full_name || element.city);
    setCities([]);
    setNoResults(false);
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutIdState(null);
    }
  };

  // Ajusta la tecla Enter para seleccionar la primera opción si existe
  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      if (cities.length > 0) {
        // Seleccionar automáticamente la primera opción si hay sugerencias
        selectElement(cities[0]);
      } else {
        onChange(localValue); // Confirma el valor actual si no hay sugerencias
        setCities([]); // Limpiar las sugerencias
        setNoResults(false); // Reinicia el estado de no resultados
        if (timeoutId) {
          clearTimeout(timeoutId);
          setTimeoutIdState(null);
        }
      }
    }
  };

  return (
    <div className="city-autocomplete">
      <div
        className={classNames("select-container", {
          noResults: noResults && localValue.trim() !== "",
        })}
      >
        <input
          value={localValue}
          onChange={(event) => updateSearch(event.target.value)}
          onKeyDown={handleKeyDown} // Manejar la tecla Enter
          placeholder="Escribe una ciudad..."
        />
        {loading && <LoadingSpinner />}
      </div>

      {cities.length > 0 && localValue.trim() !== "" && (
        <div className="select-container__options">
          {cities.map((city) => (
            <div
              className="select-container__options__option"
              key={city.id}
              onClick={() => selectElement(city)}
            >
              {city.full_name || city.city}
            </div>
          ))}
        </div>
      )}

      {noResults && localValue.trim() !== "" && !loading && (
        <div className="select-container__no-results">
          No se encontraron ciudades.
        </div>
      )}
    </div>
  );
};

export default CityAutocomplete;
