import React, { useState, useEffect } from "react";
import "./MobileWarning.css";

const MobileWarning = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  if (!isMobile || !isVisible) return null;

  return (
    <div className="mobile-warning-banner">
      <div className="mobile-warning-content">
        <span className="mobile-warning-icon">💻</span>
        <div className="mobile-warning-text">
          <strong>Versión Desktop Recomendada</strong>
          <p>Esta aplicación está optimizada para escritorio. Estamos trabajando en la versión móvil.</p>
        </div>
        <button 
          className="mobile-warning-close"
          onClick={() => setIsVisible(false)}
          aria-label="Cerrar aviso"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default MobileWarning;
