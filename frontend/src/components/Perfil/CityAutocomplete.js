import React from "react";

// Este componente proporciona un campo de búsqueda con autocompletado
// para ciudades españolas. Implementa la
// validación para permitir solo caracteres válidos en nombres de ciudades.
// --
// La expresión regular que uso filtra números y caracteres extraños, pero
// permite letras con acentos, espacios y algunos caracteres especiales
// como guiones o apóstrofes que son comunes en nombres de ciudades.
//--
// El desplegable de sugerencias aparece solo cuando hay coincidencias,
// lo que mejora la experiencia de usuario y evita mostrar listas vacías

const CityAutocomplete = ({
  city,
  onCitySearch,
  filteredCities,
  onCitySelect,
}) => {
  // Función para validar entrada de solo caracteres alfabéticos
  const handleCityInput = (e) => {
    const inputValue = e.target.value;
    // Permitir letras, espacios, acentos y algunos caracteres especiales comunes en nombres de ciudades
    // Rechazar números y caracteres extraños
    if (
      /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s\-'.]*$/.test(inputValue) ||
      inputValue === ""
    ) {
      onCitySearch(e);
    }
  };

  return (
    <div className="form-group city-field">
      <label htmlFor="city" className="highlight-label">
        Ciudad
      </label>
      <div className="city-autocomplete highlight-field">
        <input
          type="text"
          id="city"
          name="city"
          value={city}
          onChange={handleCityInput}
          placeholder="Ej: Madrid"
          className="form-input"
          title="Por favor, ingresa solo letras (sin números o caracteres especiales)"
        />
        {filteredCities.length > 0 && (
          <ul className="city-suggestions">
            {filteredCities.map((city) => (
              <li
                key={city.id}
                onClick={() => onCitySelect(city)}
                className="city-suggestion-item"
              >
                {city.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CityAutocomplete;
