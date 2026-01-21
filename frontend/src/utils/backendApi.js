// API wrapper que maneja automáticamente las llamadas al backend
// En GitHub Pages, redirige a mocks locales en lugar de al backend

const BACKEND_URL = "http://localhost/mommatch/backend";
const IS_GITHUB_PAGES = window.location.hostname === "imleiva.github.io";

// Mapeo de mocks para rutas comunes
const MOCK_DATA = {
  "blog_api.php?action=get_articles": () => import("../data/articles.json").then(m => m.default),
};

export const fetchFromBackend = async (endpoint, options = {}) => {
  // Si estamos en GitHub Pages y tenemos un mock, usar el mock
  if (IS_GITHUB_PAGES && MOCK_DATA[endpoint]) {
    console.log(`[DEMO MODE] Usando mock para: ${endpoint}`);
    const data = await MOCK_DATA[endpoint]();
    return new Response(JSON.stringify({ status: "success", data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Si no estamos en GitHub Pages, hacer la llamada real al backend
  if (!IS_GITHUB_PAGES) {
    return fetch(`${BACKEND_URL}/${endpoint}`, {
      credentials: "include",
      ...options,
    });
  }

  // Si estamos en GitHub Pages pero no hay mock, mostrar error
  console.warn(`[DEMO MODE] No hay mock disponible para: ${endpoint}`);
  return new Response(JSON.stringify({ status: "error", message: "Mock no disponible en modo demo" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
};
