//Servicios API
//Este archivo centraliza todas las llamadas a la API del backend,
//haciendo interfaces consistentes para la comunicación entre frontend y backend
//

import articles from "../data/articles.json";
import childAgeStages from "../data/child_age_stages.json";
import cities from "../data/cities.json";
import events from "../data/events.json";
import forumReplies from "../data/forum_replies.json";
import forumTopics from "../data/forum_topics.json";
import interests from "../data/interests.json";

//Verifica si la sesión del usuario es válida
// @returns {Promise<Object>} Datos del usuario si la sesión es válida
// @throws {Error} Si la sesión no es válida o hay un error de servidor

export const verifySession = async () => {
  return {
    user: { id: 1, name: "Demo User", email: "demo@example.com" },
    valid: true,
  };
};

//Verifica si el usuario está autenticado antes de hacer peticiones
// @returns {Promise<boolean>} Verdadero si está autenticado, falso en otro caso

export const isAuthenticated = async () => {
  return true; // Assume the user is always authenticated in demo mode
};

// Update mock data to include only moms from Spain
const MOCK_MATCHES = [
  { id: 1, name: "Ana", age: 28, city: "Madrid", isMom: true },
  { id: 2, name: "Lucía", age: 35, city: "Barcelona", isMom: true },
];

// Obtiene la lista de perfiles de posibles matches para el usuario actual
// @returns {Promise<Array>} Lista de perfiles de potenciales matches
// @throws {Error} Si hay un problema al obtener los datos

export const fetchMatches = async () => {
  return MOCK_MATCHES.filter((profile) => profile.isMom);
};

// Autentica a un usuario en el sistema
// @param {Object} credentials - Credenciales de inicio de sesión
// @param {string} credentials.email - Email del usuario
// @param {string} credentials.password - Contraseña del usuario
// @returns {Promise<Object>} Datos del usuario autenticado
// @throws {Error} Si las credenciales son inválidas o hay un error de servidor

export const login = async (credentials) => {
  return {
    user: { id: 1, name: "Demo User", email: credentials.email },
    token: "demo-token",
  };
};

// Obtiene los perfiles que el usuario ha marcado como "Tal vez luego"
// @returns {Promise<Array>} Lista de perfiles rechazados temporalmente
// @throws {Error} Si hay un problema al obtener los datos

export const fetchTalvezLuego = async () => {
  return [
    { id: 3, name: "Carla", age: 40, city: "Valencia", isMom: true },
    { id: 4, name: "Diana", age: 28, city: "Sevilla", isMom: true },
  ];
};

// Obtiene los perfiles con los que la usuaria ha mostrado interés en conectar
// @returns {Promise<Array>} Lista de perfiles con los que la usuaria quiere conectar
// @throws {Error} Si hay un problema al obtener los datos

export const fetchConectemos = async () => {
  return [
    { id: 5, name: "Elena", age: 30, city: "Madrid", isMom: true },
    { id: 6, name: "Marta", age: 25, city: "Málaga", isMom: true },
  ];
};

//Registra la decisión de la usuaria sobre un perfil (conectemos/tal vez luego)
//@param {number} userId - ID del usuario sobre el que se toma la decisión
//@param {string} action - Tipo de acción ('conectemos' o 'tal vez luego')
//@returns {Promise<Object>} Resultado de la operación
//@throws {Error} Si hay un problema al registrar la acción

export const registerMatch = async (userId, action) => {
  return {
    success: true,
    message: `Action '${action}' registered for user ${userId}`,
  };
};

// Obtiene la lista de ciudades disponibles para selección en el perfil
// @returns {Promise<Array>} Lista de ciudades disponibles
// @throws {Error} Si hay un problema al obtener los datos

export const fetchCities = async () => {
  return cities;
};

// Replace backend call for fetching articles
export const fetchArticles = async () => {
  return articles;
};

// Replace backend call for fetching child age stages
export const fetchChildAgeStages = async () => {
  return childAgeStages;
};

// Replace backend call for fetching events
export const fetchEvents = async () => {
  return events;
};

// Replace backend call for fetching forum replies
export const fetchForumReplies = async () => {
  return forumReplies;
};

// Replace backend call for fetching forum topics
export const fetchForumTopics = async () => {
  return forumTopics;
};

// Replace backend call for fetching interests
export const fetchInterests = async () => {
  return interests;
};

// Simula el registro de un nuevo usuario
// @param {Object} userData - Datos del usuario a registrar
// @param {string} userData.name - Nombre del usuario
// @param {string} userData.email - Email del usuario
// @param {string} userData.password - Contraseña del usuario
// @returns {Promise<Object>} Datos del usuario registrado
export const register = async (userData) => {
  const newUser = {
    id: Date.now(), // Genera un ID único basado en la marca de tiempo
    name: userData.name,
    email: userData.email,
    password: userData.password, // En un entorno real, esto estaría encriptado
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profile_completed: 0, // Perfil incompleto por defecto
  };

  // Simula agregar el usuario a la base de datos mock
  return newUser;
};

// Configurar la demo para que inicie con la usuaria "Ana"
export const getDemoUser = async () => {
  return {
    id: 1,
    name: "Ana",
    email: "ana@example.com",
    profile_completed: 1,
    last_active: "2025-06-10T01:53:09",
    created_at: "2025-04-07T16:07:42",
    updated_at: "2025-06-10T01:53:09",
    photo: "/mommatch_demo/images/profiles/ana.jpg", // Ruta simulada para la foto
  };
};
