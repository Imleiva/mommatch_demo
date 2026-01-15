const BACKEND_URL = "http://localhost/mommatch/backend";

// Este archivo contiene la lógica del sistema de matching.
// Separé todas estas funciones del componente principal para mantenerlo más limpio
// Los mensajes temporales dan feedback a las usuarias.

export const handleLike = async (
  userId,
  profiles,
  setProfiles,
  setMatches,
  setLikedProfiles,
  setMessage,
  fetchRealMatches,
  BACKEND_URL,
  setShowMatchCelebration,
  setCurrentMatch
) => {
  try {
    const response = await fetch(`${BACKEND_URL}/register_match.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ target_user_id: userId, action: "like" }),
    });

    const data = await response.json();
    if (data.success) {
      setProfiles((prev) => prev.filter((profile) => profile.id !== userId));

      if (data.message && data.message.includes("match")) {
        // En lugar de mostrar un mensaje simple, se muestra la celebración del "MomMatch"
        const matchedProfile = profiles.find(
          (profile) => profile.id === userId
        );

        if (matchedProfile) {
          setMatches((prev) => [...prev, matchedProfile]);
          // Guardo perfil del match y se activa la celebración
          setCurrentMatch(matchedProfile);
          setShowMatchCelebration(true);
        }

        fetchRealMatches();
      } else {
        const likedProfile = profiles.find((profile) => profile.id === userId);
        if (likedProfile) {
          setLikedProfiles((prev) => [...prev, likedProfile]);
        }

        setMessage({
          type: "info",
          text: "Has dado 'Conectemos' a este perfil",
        });
        setTimeout(() => setMessage(null), 3000);
      }
    } else {
      console.error(data.error || "Error al marcar Me gusta.");
      setMessage({
        type: "error",
        text: "Error al procesar tu acción",
      });
      setTimeout(() => setMessage(null), 3000);
    }
  } catch (error) {
    console.error("Error al enviar Me gusta:", error);
    setMessage({
      type: "error",
      text: "Error de conexión",
    });
    setTimeout(() => setMessage(null), 3000);
  }
};

export const handleReject = async (
  userId,
  profiles,
  setProfiles,
  setRejectedProfiles,
  setMessage,
  BACKEND_URL
) => {
  try {
    const rejectedProfile = profiles.find((profile) => profile.id === userId);

    const response = await fetch(`${BACKEND_URL}/register_match.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ target_user_id: userId, action: "reject" }),
    });

    const data = await response.json();
    if (data.success) {
      setProfiles((prev) => prev.filter((profile) => profile.id !== userId));

      if (rejectedProfile) {
        setRejectedProfiles((prev) => [...prev, rejectedProfile]);
        setMessage({
          type: "info",
          text: "Perfil movido a 'Tal vez luego'",
        });
        setTimeout(() => setMessage(null), 3000);
      }
    } else {
      console.error(data.error || "Error al rechazar usuario.");
    }
  } catch (error) {
    console.error("Error al enviar rechazo:", error);
  }
};

export const reinsertProfile = async (
  profileId,
  rejectedProfiles,
  setProfiles,
  setRejectedProfiles,
  setMessage
) => {
  try {
    const response = await fetch(`${BACKEND_URL}/reinsert_profile.php`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ profile_id: profileId }),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      // Actualiza los estados eliminando el perfil de rechazados y añadiéndolo a candidatos
      const updatedRejectedProfiles = rejectedProfiles.filter(
        (profile) => profile.id !== profileId
      );
      setRejectedProfiles(updatedRejectedProfiles);
      setProfiles((prevProfiles) => [...prevProfiles, data.profile]);
      setMessage({
        type: "success",
        text: "Perfil reinsertado correctamente.",
      });

      // Añadir temporizador para limpiar el mensaje después de 3 segundos
      setTimeout(() => setMessage(null), 3000);
    } else {
      throw new Error(data.error || "Error desconocido.");
    }
  } catch (error) {
    console.error("Error al reinsertar perfil:", error);
    setMessage({
      type: "error",
      text: "Hubo un problema al reinsertar el perfil. Por favor, inténtalo de nuevo.",
    });

    // También añadir temporizador para el mensaje de error
    setTimeout(() => setMessage(null), 3000);
  }
};

export const removeLikedProfile = async (
  profileId,
  setLikedProfiles,
  setMessage,
  BACKEND_URL
) => {
  try {
    const response = await fetch(`${BACKEND_URL}/register_match.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        target_user_id: profileId,
        action: "remove_like",
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.success) {
      setLikedProfiles((prev) =>
        (prev || []).filter((profile) => profile.id !== profileId)
      );

      setMessage({
        type: "success",
        text: "Perfil eliminado de 'Me gusta' correctamente",
      });
      setTimeout(() => setMessage(null), 3000);
    } else {
      throw new Error(data.error || "Error al eliminar el perfil");
    }
  } catch (error) {
    console.error("Error al eliminar perfil de 'Me gusta':", error);
    setMessage({
      type: "error",
      text: "Error al eliminar el perfil. Por favor, inténtalo de nuevo.",
    });
    setTimeout(() => setMessage(null), 3000);
  }
};
