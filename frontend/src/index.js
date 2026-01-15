import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./styles/global.css";
import "./components/PerfilVista.css";
import "./components/Perfil.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

// Este es el punto de entrada principal de toda la app.
// Tuve que añadir manualmente los imports de los CSS de perfil
// porque me daba problemas de estilos cuando navegaba directamente a esas rutas.
// En el futuro debería organizarlo mejor, pero por ahora funciona bien así.

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
