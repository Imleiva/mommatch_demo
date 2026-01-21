# MomMatch Demo

**Versión de demostración totalmente funcional sin backend**

Una plataforma comunitaria que conecta madres para compartir experiencias, recursos y redes de apoyo.

---

## Acerca del Proyecto

MomMatch es una aplicación web diseñada para ayudar a las madres a conectarse entre sí a través de matches, intercambios, eventos y foros comunitarios.

**Esta es una versión DEMO** configurada específicamente para funcionar con datos mock sin necesidad de backend, base de datos ni servidor PHP.

**Demo en vivo**: [https://imleiva.github.io/mommatch_demo/](https://imleiva.github.io/mommatch_demo/)

---

## Funcionalidades

- **Perfiles de Usuario**: Crea y personaliza tu perfil con información familiar, intereses y preferencias
- **Sistema de Matches**: Descubre y conecta con otras madres según intereses y preferencias compartidas
- **Trueques**: Intercambia artículos y recursos dentro de la comunidad
- **Eventos**: Organiza y participa en encuentros comunitarios
- **Foro Comunitario**: Discute temas, comparte consejos y construye conexiones
- **Centro de Ayuda**: Accede a recursos y obtén soporte
- **Panel de Administración**: Gestión de usuarios y contenido de la plataforma

---

## Stack Tecnológico

### Frontend

- **React** 18.2.0
- **React Router DOM** 7.4.1
- **CSS3** con estilos personalizados
- **React Icons** para iconografía
- **Date-fns** para manejo de fechas

### Configuración Demo

- **Datos Mock**: Archivos JSON con datos de ejemplo
- **Detección de Entorno**: Configuración automática para GitHub Pages
- **Sin Backend**: Funciona completamente en el navegador

---

## Estructura del Proyecto

```
mommatch-demo/
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── uploads/           # Imágenes de perfiles y trueques
│   │   └── images/            # Recursos estáticos
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   ├── context/           # Context API (Autenticación)
│   │   ├── services/          # Servicios y API
│   │   ├── data/              # Datos mock en JSON
│   │   ├── config.js          # Configuración de entorno
│   │   └── App.js
│   └── package.json
└── README.md
```

---

## Inicio Rápido

### Requisitos Previos

- **Node.js** 14+ y npm

### Instalación Local

1. **Clona el repositorio**:

   ```bash
   git clone https://github.com/Imleiva/mommatch_demo.git
   cd mommatch-demo
   ```

2. **Instala las dependencias**:

   ```bash
   cd frontend
   npm install
   ```

3. **Inicia el servidor de desarrollo**:

   ```bash
   npm start
   ```

4. La aplicación se abrirá en [http://localhost:3000](http://localhost:3000)

### Usuario Demo

La versión demo incluye una cuenta preconfigurada:

- **Email**: `ana@example.com`
- **Contraseña**: `demo123`

Simplemente haz clic en "Iniciar Sesión" para acceder a la aplicación completa con datos de ejemplo.

---

## Contenido de la Demo

La demostración incluye:

- Perfil de usuario completo (Ana, 32 años)
- Sugerencias de matches con otras madres
- Temas y discusiones del foro
- Listados de eventos y trueques
- Sistema de mensajería
- Navegación completa por todas las funcionalidades

Todos los datos se cargan desde archivos JSON mock y las actualizaciones se almacenan en la sesión del navegador.

---

## Scripts Disponibles

En el directorio `frontend/`:

- **`npm start`** - Inicia el servidor de desarrollo
- **`npm run build`** - Construye la aplicación para producción
- **`npm test`** - Ejecuta las pruebas
- **`npm run deploy`** - Despliega a GitHub Pages

---

## Despliegue

El proyecto está configurado para desplegarse automáticamente en GitHub Pages:

```bash
cd frontend
npm run build
npm run deploy
```

La aplicación se desplegará en: `https://[tu-usuario].github.io/mommatch_demo/`

---

## Configuración

### Detección de Entorno

El archivo `frontend/src/config.js` detecta automáticamente el entorno:

```javascript
const isGitHubPages = window.location.hostname === "imleiva.github.io";
export const config = {
  useMocks: isGitHubPages, // true en GitHub Pages, false en local
  backendUrl: isGitHubPages ? null : "http://localhost/mommatch/backend",
};
```

### Datos Mock

Los datos de ejemplo están en `frontend/src/data/`:

- `mockUsers.json` - Perfiles de usuarias
- `mockArticles.json` - Artículos del blog
- `forumTopicsData.json` - Temas del foro

---

## Compatibilidad de Navegadores

- Chrome (última versión)
- Firefox (última versión)
- Safari (última versión)
- Edge (última versión)

---

## Licencia

Este proyecto es privado y propietario.

---

## Contacto

Para preguntas o soporte, contacta al equipo de desarrollo.

---

## Contribuciones

Contribuciones internas únicamente. Por favor, sigue el estilo de código y estructura existente.
