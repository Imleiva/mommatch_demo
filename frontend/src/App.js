//Componente principal de la aplicación MomMatch
//Este archivo define la estructura de rutas de la aplicación,
//separando las rutas públicas de las protegidas que requieren autenticación.
//Utiliza React Router para la navegación y AuthProvider para la gestión
//del estado de autenticación en toda la aplicación.

import "./App.css";
import "./styles/global.css";
import "./styles/mobile-responsive.css"; // Estilos responsive para móvil
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop"; // Importar el componente ScrollToTop
import MobileWarning from "./components/MobileWarning"; // Banner de advertencia móvil
import React, { useEffect, useState } from "react";
import { getDemoUser } from "./services/api";

// Componentes para rutas públicas (accesibles sin iniciar sesión)
import HomePage from "./components/HomePage"; // Página de inicio/landing
import Conocenos from "./components/Conocenos"; // Información sobre la plataforma
import Blog from "./components/Blog"; // Blog de artículos
import Ayuda from "./components/Ayuda"; // Centro de ayuda
import Login from "./components/Login"; // Inicio de sesión
import Register from "./components/Register"; // Registro de nuevo usuario
import NotFound from "./components/NotFound"; // Página 404

// Componentes para rutas protegidas (requieren autenticación)
import Perfil from "./components/Perfil"; // Editor de perfil
import PerfilVista from "./components/PerfilVista"; // Vista de perfil
import MatchPage from "./components/MatchPage"; // Sistema de matchmaking
import Comunidad from "./components/Comunidad"; // Hub de la comunidad
import Forum from "./components/Forum"; // Foro de discusión
import Trueque from "./components/Trueque"; // Zona de trueque
import TruequeMessages from "./components/TruequeMessages"; // Sistema de mensajería de trueques
import Events from "./components/Events"; // Página de eventos y quedadas

// Componentes para rutas de administración
import AdminLogin from "./components/Admin/AdminLogin";
import AdminDashboard from "./components/Admin/AdminDashboard";

// Agregar un aviso global de que es una demo
const DemoBanner = () => (
  <div
    style={{
      position: "fixed",
      bottom: 0,
      width: "100%",
      backgroundColor: "rgba(255, 204, 0, 0.85)",
      color: "#000",
      textAlign: "center",
      padding: "10px 20px",
      zIndex: 1000,
      fontWeight: "bold",
      backdropFilter: "blur(2px)",
      fontSize: "14px",
    }}
  >
    Esta es una versión demo. Los datos y funcionalidades son simulados.
  </div>
);

//Componente raíz de la aplicación que configura:
//- El enrutador de React Router
//- El proveedor de contexto de autenticación
//- La estructura general de navegación

function App() {
  const [demoUser, setDemoUser] = useState(null);

  useEffect(() => {
    const fetchDemoUser = async () => {
      const user = await getDemoUser();
      setDemoUser(user);
    };
    fetchDemoUser();
  }, []);

  if (!demoUser) {
    return <div>Cargando demo...</div>; // Pantalla de carga mientras se obtienen los datos
  }

  return (
    <Router>
      {/* Proveedor de contexto de autenticación para toda la aplicación */}
      <AuthProvider>
        {/* Banner de advertencia para dispositivos móviles */}
        <MobileWarning />
        {/* Componente que restablece el scroll al cambiar de página */}
        <ScrollToTop />
        {/* Header común para todas las páginas */}
        <Header user={demoUser} />

        <Routes>
          {/* Rutas públicas - Accesibles para todos los usuarios */}
          <Route path="/" element={<HomePage />} />
          <Route path="/conocenos" element={<Conocenos />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/ayuda" element={<Ayuda />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Rutas protegidas - Solo para usuarios autenticados */}
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <PerfilVista />
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil/editar"
            element={
              <ProtectedRoute>
                <Perfil />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches"
            element={
              <ProtectedRoute>
                <MatchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/comunidad"
            element={
              <ProtectedRoute>
                <Comunidad />
              </ProtectedRoute>
            }
          />
          <Route
            path="/comunidad/foro"
            element={
              <ProtectedRoute>
                <Forum />
              </ProtectedRoute>
            }
          />
          <Route
            path="/comunidad/trueques"
            element={
              <ProtectedRoute>
                <Trueque />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mensajes/trueques"
            element={
              <ProtectedRoute>
                <TruequeMessages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/comunidad/eventos"
            element={
              <ProtectedRoute>
                <Events />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Ruta para cualquier URL no definida - Página 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <DemoBanner />
      </AuthProvider>
    </Router>
  );
}

// Configuración global para el comportamiento de scroll
if (typeof window !== "undefined") {
  window.history.scrollRestoration = "manual";
}

export default App;
