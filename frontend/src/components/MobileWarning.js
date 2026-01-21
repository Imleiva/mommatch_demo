import React, { useState, useEffect } from "react";
import "./MobileWarning.css";

const MobileWarning = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  if (!isMobile || isDismissed) return null;

  return (
    <div className={`mobile-warning-banner ${isMinimized ? 'minimized' : ''}`}>
      {!isMinimized ? (
        <div className="mobile-warning-content">
          <span className="mobile-warning-icon">💻</span>
          <div className="mobile-warning-text">
            <strong>Versión Desktop Recomendada</strong>
            <p>App optimizada para escritorio</p>
          </div>
          <button 
            className="mobile-warning-minimize"
            onClick={() => setIsMinimized(true)}
            aria-label="Minimizar"
          >
            ▼
          </button>
          <button 
            className="mobile-warning-close"
            onClick={() => setIsDismissed(true)}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="mobile-warning-minimized" onClick={() => setIsMinimized(false)}>
          💻 Ver en Desktop • Toca para expandir
        </div>
      )}
    </div>
  );
};

export default MobileWarning;
