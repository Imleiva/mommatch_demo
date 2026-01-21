import { useState, useEffect } from "react";
import { config } from "../../config";
import LoadingSpinner from "../LoadingSpinner";

// Este componente maneja la carga y visualización de la foto de perfil.
// Fue bastante complicado lidiar con el caché del navegador, que a veces
// no mostraba la foto actualizada después de subirla. Para solucionarlo
// añadí un parámetro de timestamp a la URL de la imagen.
//--
// También agregué un estado de carga con spinner para dar feedback visual
// mientras se sube la foto, y un manejador de errores que muestra la imagen
// por defecto si hay algún problema al cargar la foto del usuario.
//--
// El truco del key={photoUrl} me ayudó para forzar la recarga
// de la imagen cuando cambia la URL.

const ProfilePhoto = ({ currentPhoto, onFileChange }) => {
  // Definir la URL correcta de la foto por defecto según el entorno
  const defaultPhotoUrl = config.useMocks
    ? `${process.env.PUBLIC_URL}/uploads/profiles/default_profile.jpg`
    : "http://localhost/mommatch/backend/public/uploads/profiles/default_profile.jpg";

  const [photoUrl, setPhotoUrl] = useState(currentPhoto || defaultPhotoUrl);
  const [loading, setLoading] = useState(false);

  // Actualizar la URL de la foto cuando cambia currentPhoto
  useEffect(() => {
    if (currentPhoto) {
      // Añadir un parámetro de timestamp si no existe ya uno
      const hasTimestamp = currentPhoto.includes("?t=");
      const newUrl = hasTimestamp
        ? currentPhoto
        : `${currentPhoto}?t=${new Date().getTime()}`;

      setPhotoUrl(newUrl);
    } else {
      setPhotoUrl(defaultPhotoUrl);
    }
  }, [currentPhoto]);

  const handleFileChange = (e) => {
    setLoading(true);
    // Llamar al controlador original
    onFileChange(e);
    // Después de un tiempo, terminar la carga (por si acaso el controlador no actualiza el estado)
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="form-group photo-upload-section">
      <div className="perfil-edicion__photo-container">
        {loading ? (
          <LoadingSpinner size="medium" text="Subiendo..." color="#007bff" />
        ) : (
          <img
            src={photoUrl}
            alt="Foto de perfil"
            className="perfil-edicion__photo"
            key={photoUrl} // Forzar recarga de la imagen cuando cambia la URL
            onError={(e) => {
              console.log("Error al cargar la imagen:", photoUrl);
              e.target.onerror = null;
              e.target.src = defaultPhotoUrl;
            }}
          />
        )}
      </div>
      <input
        type="file"
        accept="image/jpeg, image/png, image/webp"
        onChange={handleFileChange}
        id="profilePhoto"
        style={{ display: "none" }}
      />
      <label htmlFor="profilePhoto" className="upload-button">
        {photoUrl !== defaultPhotoUrl
          ? "📷 Cambiar foto"
          : "📷 Seleccionar foto"}
      </label>
    </div>
  );
};

export default ProfilePhoto;
