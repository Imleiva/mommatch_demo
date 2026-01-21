const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import("web-vitals").then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry); // Mide cambios de layout
      getFID(onPerfEntry); // Mide tiempo de respuesta a interacciones
      getFCP(onPerfEntry); // Primer contenido pintado
      getLCP(onPerfEntry); // Contenido principal pintado
      getTTFB(onPerfEntry); // Tiempo hasta primer byte
    });
  }
};

// Lo dejo aquí por si en algún momento quiero revisar el rendimiento de la app.
// Creo que estás métricas son importantes si MomMatch crece.
export default reportWebVitals;
