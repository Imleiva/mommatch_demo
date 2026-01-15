const BACKEND_URL = "http://localhost/mommatch/backend";

// Este archivo centraliza todas las utilidades, constantes y funciones auxiliares
// que se utilizan en los componentes del módulo de perfil.
//--
// La función de formatPhotoUrl me dio bastantes problemas.
// Por eso creé esta función que maneja todos los casos y además permite forzar
// una recarga añadiendo un timestamp cuando es necesario.
//--
// También incluí aquí todas las constantes como los tipos de familia y condiciones
// especiales para no repetirlas en cada componente. Si necesitamos añadir nuevas
// opciones, solo hay que modificar este archivo.

/**
 * Formatea la URL de una foto de perfil, añadiendo timestamp solo cuando es necesario
 * @param {string} photoPath La ruta de la foto
 * @param {boolean} forceRefresh Si es true, fuerza una recarga añadiendo timestamp
 * @returns {string} URL formateada
 */
export const formatPhotoUrl = (photoPath, forceRefresh = false) => {
  if (!photoPath) {
    return `${BACKEND_URL}/public/uploads/profiles/default_profile.jpg`;
  }

  if (photoPath.startsWith("http")) {
    return photoPath;
  }

  // Construir la URL base según el formato de la ruta
  let baseUrl = "";
  if (photoPath.startsWith("/public/uploads/profiles/")) {
    baseUrl = `${BACKEND_URL}${photoPath}`;
  } else if (photoPath.startsWith("/public/uploads/")) {
    baseUrl = `${BACKEND_URL}${photoPath}`;
  } else if (photoPath.startsWith("public/uploads/profiles/")) {
    baseUrl = `${BACKEND_URL}/${photoPath}`;
  } else {
    baseUrl = photoPath;
  }

  // Añadir timestamp solo cuando se requiere forzar una recarga
  return forceRefresh ? `${baseUrl}?t=${new Date().getTime()}` : baseUrl;
};

export const verifySession = async () => {
  try {
    const response = await fetch(
      "http://localhost:3000/mommatch/backend/verify_session.php",
      {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      }
    );

    const data = await response.json();

    if (!data.authenticated) {
      throw new Error("Sesión no válida");
    }
  } catch (error) {
    console.error("Error verificando la sesión:", error.message);
  }
};

export const BACKEND_URL_CONSTANT = BACKEND_URL;

// Constantes para el formulario
export const specialConditions = [
  { id: "movilidad", label: "Movilidad", icon: "♿" },
  { id: "sensoriales", label: "Sensoriales", icon: "👁️" },
  { id: "auditiva", label: "Auditiva", icon: "👂" },
  { id: "aprendizaje", label: "Aprendizaje", icon: "📚" },
  { id: "medicas", label: "Médicas", icon: "🩺" },
  { id: "emocionales", label: "Emocionales", icon: "😊" },
  { id: "neurodivergencias", label: "Neurodivergencias", icon: "🧠" },
  { id: "otras", label: "Otras", icon: "❓" },
];

export const familyTypes = [
  { value: "monoparental", label: "Monoparental" },
  { value: "biparental", label: "Biparental" },
  {
    value: "reconstituida",
    label: "Reconstituida (con padrastro/madrastra)",
  },
  {
    value: "extendida",
    label: "Extendida (con otros familiares en el hogar)",
  },
  { value: "adoptiva", label: "Adoptiva" },
  { value: "acogida", label: "De Acogida" },
  {
    value: "coparentalidad",
    label: "Coparentalidad (crianza sin ser pareja)",
  },
  { value: "lgtbi", label: "LGTBI+ (dos mamás/diversa)" },
  { value: "subrogada", label: "Subrogada" },
  { value: "custodia_compartida", label: "Custodia Compartida" },
  { value: "multicultural", label: "Multicultural" },
  { value: "nomada_digital", label: "Nómada/Digital" },
  { value: "otro", label: "Otro" },
];

export const MAX_PRESENTATION_CHARS = 500;
