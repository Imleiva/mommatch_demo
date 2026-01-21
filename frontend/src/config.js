/**
 * Configuración de ambiente para la app
 * Detecta si estamos en GitHub Pages y ajusta las URLs
 */

const isGitHubPages = window.location.hostname === 'imleiva.github.io';
const isDevelopment = !isGitHubPages;

export const config = {
  isDevelopment,
  isGitHubPages,
  // En GitHub Pages, no hacer llamadas al backend
  useMocks: isGitHubPages,
  backendUrl: isDevelopment 
    ? 'http://localhost/mommatch/backend'
    : null, // No usar backend en GitHub Pages
};

export default config;
