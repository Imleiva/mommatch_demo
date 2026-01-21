import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import CityAutocomplete from "../CityAutocomplete";
import "./FilterSidebar.css";

// Barra lateral de filtros intuitiva pero completa,
// con opciones para filtrar por varios criterios
// El autocompletado de ciudades me dio algunos problemas, sobre todo
// con la gestión del estado y la sincronización con el componente padre.
// Las etapas de edad y condiciones especiales están implementadas como
// botones tipo "tag" que se pueden seleccionar/deseleccionar, lo que
// creo que hace la interfaz más amigable que usar checkboxes

// Datos estáticos para etapas de edad
const AGE_STAGES = [
  { id: 1, name: "Bebé (0-2 años)" },
  { id: 2, name: "Primera infancia (3-5 años)" },
  { id: 3, name: "Infantil (6-9 años)" },
  { id: 4, name: "Preadolescente (10-12 años)" },
  { id: 5, name: "Adolescente (13-17 años)" },
  { id: 6, name: "Mayor de edad (18+ años)" },
];

const FilterSidebar = ({
  filters,
  handleFilterChange,
  applyFilters,
  handleConditionToggle,
  handleCityInputChange,
  specialConditions,
}) => {
  // Nuevo estado para etapas de edad seleccionadas
  const [selectedStages, setSelectedStages] = useState([]);

  // Cargar etapas de edad seleccionadas cuando cambian los filtros
  useEffect(() => {
    if (filters.childAgeStages) {
      setSelectedStages(filters.childAgeStages);
    }
  }, [filters.childAgeStages]);

  // Función para manejar la entrada de la ciudad y aplicar el filtro
  const handleCityInputKeyDown = (e) => {
    if (e.key === "Enter") {
      applyFilters(); // Aplicar filtros cuando se presiona Enter
    }
  };

  // Manejar selección de etapas de edad
  const handleStageSelect = (stageId) => {
    const numericId = Number(stageId);
    const newStages = selectedStages.includes(numericId)
      ? selectedStages.filter((id) => id !== numericId)
      : [...selectedStages, numericId];

    setSelectedStages(newStages);
    handleFilterChange("childAgeStages", newStages);
  };

  // Función para restablecer todos los filtros a sus valores predeterminados
  const handleResetFilters = () => {
    // Restablecer todos los filtros a sus valores iniciales
    handleFilterChange("connectionType", "any");
    handleFilterChange("specialConditions", { value: [], ignore: false });
    handleFilterChange("childAgeStages", []);
    handleCityInputChange(""); // Limpiar el campo de ciudad
    setSelectedStages([]);
    applyFilters(); // Aplicar los filtros reseteados inmediatamente
  };

  return (
    <aside className="filters-sidebar">
      <h2>Filtros de búsqueda</h2>
      <div className="filters-container">
        {/* Priorizar ciudad */}
        <div className="filter-group">
          <label className="filter-title">Ciudad</label>
          <CityAutocomplete
            value={filters.city || ""}
            onChange={(city) => handleCityInputChange(city)}
            onKeyDown={handleCityInputKeyDown}
            placeholder="Introduce una ciudad..."
            className="city-input"
          />
        </div>

        <div className="filter-divider"></div>

        {/* Tipo de conexión */}
        <div className="filter-group">
          <h3 className="filter-title">Tipo de conexión:</h3>
          <div className="connection-options">
            <button
              className={`connection-option ${
                filters.connectionType === "inPerson" ? "selected" : ""
              }`}
              onClick={() => handleFilterChange("connectionType", "inPerson")}
            >
              Quedar en persona
            </button>
            <button
              className={`connection-option ${
                filters.connectionType === "remote" ? "selected" : ""
              }`}
              onClick={() => handleFilterChange("connectionType", "remote")}
            >
              Conexión a distancia
            </button>
            <button
              className={`connection-option ${
                filters.connectionType === "any" ? "selected" : ""
              }`}
              onClick={() => handleFilterChange("connectionType", "any")}
            >
              Cualquier tipo
            </button>
          </div>
        </div>

        <div className="filter-divider"></div>

        {/* Etapas de edad de hijos - Estilo mejorado */}
        <div className="filter-group">
          <h3 className="filter-title">Etapas de edad de hijos:</h3>
          <div className="child-stages-filter">
            {AGE_STAGES.map((stage) => (
              <button
                key={stage.id}
                className={`filter-tag ${
                  selectedStages.includes(stage.id) ? "selected" : ""
                }`}
                onClick={() => handleStageSelect(stage.id)}
              >
                {stage.name}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-divider"></div>

        {/* Condiciones especiales */}
        <div className="filter-group">
          <h3 className="filter-title">Condiciones especiales:</h3>
          <div className="special-conditions-tags">
            {specialConditions.map((condition, index) => (
              <button
                key={index}
                className={`special-condition-tag ${
                  filters.specialConditions.value.includes(condition)
                    ? "selected"
                    : ""
                }`}
                onClick={() => handleConditionToggle(condition)}
              >
                {condition}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-divider"></div>
      </div>

      <div className="filter-actions">
        <button
          type="button"
          className="btn-reset-filters"
          onClick={handleResetFilters}
        >
          Eliminar Filtros
        </button>

        <button
          type="button"
          className="btn-apply-filters"
          onClick={applyFilters}
        >
          Aplicar Filtros
        </button>
      </div>
    </aside>
  );
};

FilterSidebar.propTypes = {
  filters: PropTypes.object.isRequired,
  cityInputValue: PropTypes.string,
  handleFilterChange: PropTypes.func.isRequired,
  confirmCityFilter: PropTypes.func,
  applyFilters: PropTypes.func.isRequired,
  toggleIgnoreFilter: PropTypes.func,
  handleConditionToggle: PropTypes.func.isRequired,
  handleCityInputChange: PropTypes.func.isRequired,
  specialConditions: PropTypes.array.isRequired,
};

export default FilterSidebar;
