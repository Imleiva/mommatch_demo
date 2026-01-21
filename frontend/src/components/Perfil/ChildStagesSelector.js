import { useEffect } from "react";
import "./ChildStagesSelector.css";

// Component q permite seleccionar las etapas de edad de los hijos
// Fue uno de los más complicados de implementar correctamente por los
// problemas con la conversión de tipos (string vs number) en los IDs.
//--
// Algunas etapas no se marcaban como seleccionadas,
// hasta que descubrí que a veces los IDs venían como
// strings y otras veces como numbers. Por eso hay tantos console.log y
// conversiones explícitas con Number().

// Datos estáticos para simplificar
const STATIC_STAGES = [
  { id: 1, stage_name: "Bebé", age_range: "0-2 años" },
  { id: 2, stage_name: "Primera infancia", age_range: "3-5 años" },
  { id: 3, stage_name: "Infantil", age_range: "6-9 años" },
  { id: 4, stage_name: "Preadolescente", age_range: "10-12 años" },
  { id: 5, stage_name: "Adolescente", age_range: "13-17 años" },
  { id: 6, stage_name: "Mayor de edad", age_range: "18+ años" },
];

const ChildStagesSelector = ({
  selectedStages = [],
  onChange,
  isLoading = false,
}) => {
  // Añadir log detallado al montar el componente y cuando cambian las props
  useEffect(() => {
    console.log("ChildStagesSelector - Montado/Actualizado con props:", {
      selectedStages: Array.isArray(selectedStages)
        ? selectedStages
        : "No es array",
      selectedStagesType: typeof selectedStages,
      selectedStagesLength: Array.isArray(selectedStages)
        ? selectedStages.length
        : "N/A",
      onChangeType: typeof onChange,
    });

    // Verificar si hay etapas seleccionadas no numéricas y convertirlas
    if (Array.isArray(selectedStages)) {
      const hasNonNumeric = selectedStages.some((id) => typeof id !== "number");
      if (hasNonNumeric) {
        console.warn(
          "ChildStagesSelector - Detectados IDs no numéricos, se convertirán a números"
        );
        // No hacemos la conversión aquí para evitar un bucle con onChange
      }
    }
  }, [selectedStages, onChange]);

  // Función mejorada para detectar si una etapa está seleccionada
  const isStageSelected = (stageId) => {
    if (!Array.isArray(selectedStages)) {
      console.warn(
        "ChildStagesSelector - isStageSelected: selectedStages no es array"
      );
      return false;
    }

    // Forzar conversión a número para ambos valores
    const numericId = Number(stageId);
    // Usar método includes para simplificar la comparación después de normalizar
    const normalizedSelectedStages = selectedStages.map((id) => Number(id));
    const isSelected = normalizedSelectedStages.includes(numericId);

    // Log para debugging con datos completos
    console.log(`Etapa ${stageId} seleccionada: ${isSelected}`, {
      stageId,
      numericId,
      normalizedSelectedStages,
      selectedStages,
    });

    return isSelected;
  };

  // Función para manejar la selección/deselección de etapas
  const handleStageClick = (stageId) => {
    console.log("ChildStagesSelector - Click en etapa:", stageId);

    if (typeof onChange !== "function") {
      console.error("ChildStagesSelector - Error: onChange no es una función");
      return;
    }

    // Asegurar que selectedStages es un array
    const safeSelected = Array.isArray(selectedStages) ? selectedStages : [];

    // Convertir el ID a número
    const numericId = Number(stageId);

    // Verificar si esta etapa ya está seleccionada
    const isSelected = safeSelected.some((id) => Number(id) === numericId);

    let newSelectedStages;
    if (isSelected) {
      // Eliminar la etapa de la selección
      newSelectedStages = safeSelected.filter((id) => Number(id) !== numericId);
      console.log("ChildStagesSelector - Etapa deseleccionada:", stageId);
    } else {
      // Añadir la etapa a la selección
      newSelectedStages = [...safeSelected, numericId];
      console.log("ChildStagesSelector - Etapa seleccionada:", stageId);
    }

    console.log("ChildStagesSelector - Nueva selección:", newSelectedStages);

    // Llamar al callback con las nuevas etapas seleccionadas
    onChange(newSelectedStages);
  };

  if (isLoading) {
    return (
      <div className="child-stages-loading">Cargando etapas de edad...</div>
    );
  }

  return (
    <div className="child-stages-selector">
      <div className="child-stages-list">
        {STATIC_STAGES.map((stage) => (
          <button
            key={stage.id}
            type="button"
            className={`child-stage-item ${
              isStageSelected(stage.id) ? "selected" : ""
            }`}
            onClick={() => handleStageClick(stage.id)}
            aria-pressed={isStageSelected(stage.id)}
          >
            <div className="child-stage-content">
              <div className="child-stage-name">{stage.stage_name}</div>
              <div className="child-stage-age">{stage.age_range}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChildStagesSelector;
