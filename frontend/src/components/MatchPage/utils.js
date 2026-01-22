import { config } from "../../config";

export const BACKEND_URL = config.useMocks ? null : "http://localhost/mommatch/backend";

// Problema con URLs de las fotos
// Tuve que gestionar varios formatos diferentes porque las fotos venían
// de diferentes fuentes y con rutas relativas o absolutas.
// Este formateo me asegura que siempre se muestren correctamente.
// Si no hay foto, uso una imagen por defecto.

export const formatPhotoUrl = (photoPath, BACKEND_URL) => {
  // Modo demo
  if (config.useMocks) {
    if (!photoPath || photoPath.trim() === "") {
      return `${process.env.PUBLIC_URL}/uploads/profiles/default_profile.jpg`;
    }

    // Si ya es una URL completa, devolverla tal como está
    if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
      return photoPath;
    }

    // Si comienza con /public/, remover el /public/ y usar PUBLIC_URL
    if (photoPath.startsWith("/public/uploads/profiles/")) {
      return `${process.env.PUBLIC_URL}${photoPath.substring(7)}`;
    }

    // Si comienza con public/, remover el public/ y usar PUBLIC_URL
    if (photoPath.startsWith("public/uploads/profiles/")) {
      return `${process.env.PUBLIC_URL}/${photoPath.substring(7)}`;
    }

    // Caso por defecto para nombres de archivo simples
    return `${process.env.PUBLIC_URL}/uploads/profiles/${photoPath}`;
  }

  // Modo backend
  if (!photoPath || photoPath.trim() === "") {
    return `${BACKEND_URL}/public/uploads/profiles/default_profile.jpg`;
  }

  // Si ya es una URL completa, devolverla tal como está
  if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
    return photoPath;
  }

  // Si la ruta ya incluye /mommatch/backend/, convertir a URL completa
  if (photoPath.startsWith("/mommatch/backend/")) {
    return `http://localhost${photoPath}`;
  }

  // Si comienza con /public/uploads/profiles/, añadir solo el BACKEND_URL
  if (photoPath.startsWith("/public/uploads/profiles/")) {
    return `${BACKEND_URL}${photoPath}`;
  }

  // Si comienza con public/uploads/profiles/, añadir BACKEND_URL con /
  if (photoPath.startsWith("public/uploads/profiles/")) {
    return `${BACKEND_URL}/${photoPath}`;
  }

  // Caso por defecto para nombres de archivo simples
  return `${BACKEND_URL}/public/uploads/profiles/${photoPath}`;
};

export const fetchRealMatches = async (BACKEND_URL, setMatches, setMessage) => {
  // En modo demo, no hacer fetch
  if (config.useMocks) {
    return;
  }

  try {
    const realMatchesResponse = await fetch(
      `${BACKEND_URL}/get_real_matches.php`,
      {
        credentials: "include",
      }
    );

    if (realMatchesResponse.ok) {
      const realMatchesData = await realMatchesResponse.json();
      if (realMatchesData.success) {
        const uniqueMatches = [];
        const matchIds = new Set();

        if (
          realMatchesData.profiles &&
          Array.isArray(realMatchesData.profiles)
        ) {
          realMatchesData.profiles.forEach((profile) => {
            if (!matchIds.has(profile.id)) {
              if (profile.unread_count !== undefined) {
                profile.hasNewMessages = profile.unread_count > 0;
              }

              if (typeof profile.id === "string") {
                profile.id = parseInt(profile.id, 10);
              }

              if (typeof profile.unread_count === "string") {
                profile.unread_count = parseInt(profile.unread_count, 10);
                profile.hasNewMessages = profile.unread_count > 0;
              }

              matchIds.add(profile.id);
              uniqueMatches.push(profile);
            }
          });
        }

        setMatches(uniqueMatches);
        console.log("Matches únicos cargados:", uniqueMatches.length);
      }
    }
  } catch (error) {
    console.error("Error fetching real matches:", error);
    setMessage({
      type: "error",
      text: "Hubo un problema al cargar los matches reales. Por favor, inténtalo de nuevo.",
    });
  }
};
