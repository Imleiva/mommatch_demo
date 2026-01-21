import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Componente que restablece la posición del scroll al cambiar de página
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Cuando cambia la ruta, hacemos scroll a la parte superior
    // Uso setTimeout para asegurar que se ejecute después de que se renderice la nueva página
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant", // Uso 'instant' para un efecto inmediato
      });

      // también configur el scroll del body y documentElement
      document.body.scrollTop = 0; // Para Safari
      document.documentElement.scrollTop = 0; // Para Chrome, Firefox, IE y Opera
    }, 0);
  }, [pathname]);

  return null;
}

export default ScrollToTop;
