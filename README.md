# MomMatch Demo 🌸

**Versión DEMO de MomMatch - Totalmente funcional sin backend**

Una plataforma comunitaria que conecta madres para compartir experiencias, recursos y redes de apoyo.

Esta es una versión de demostración configurada EXPRESAMENTE para funcionar con datos mock sin necesidad del backend, base de datos ni servidor. Perfecta para demos, presentaciones y exploración de funcionalidades.

## 🎯 Overview

MomMatch es una aplicación web diseñada para ayudar a las madres a conectarse entre sí a través de matches, intercambios, eventos y foros comunitarios. Esta es la versión DEMO que muestra todas las funcionalidades de la aplicación.

## Features

- User Profiles: Create and customize your mother profile with family information
- Matches: Discover and connect with other mothers based on shared interests and preferences
- Trueques: Exchange items and resources within the community
- Events: Organize and participate in community gatherings
- Forum: Discuss topics, share advice, and build connections
- Help Center: Access resources and get support
- Admin Dashboard: Manage users and platform content

## Technology Stack

Frontend:
- React 18.2.0
- React Router DOM 7.4.1
- CSS3 with custom styling

Backend:
- PHP with PDO database abstraction
- MySQL database
- RESTful API architecture

## Project Structure

```
mommatch/
├── frontend/                 # React application
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── context/         # Authentication context
│   │   ├── services/        # API services
│   │   ├── mock-data/       # Demo data
│   │   └── styles/          # Global styles
│   └── package.json
├── backend/                 # PHP API
│   ├── db.php              # Database connection
│   ├── cors.php            # CORS configuration
│   └── [API endpoints]
├── node_modules/           # Frontend dependencies
├── package.json            # Root package configuration
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 14+ and npm
- PHP 7.4+ (for backend)
- MySQL 5.7+ (for database)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Imleiva/mommatch_demo.git
cd mommatch
```

2. Install dependencies:
```bash
npm install
cd frontend
npm install
cd ..
```

3. Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

### Demo User

The demo version comes with a pre-configured user account:
- Email: ana@example.com
- Password: demo123

Simply click "Iniciar Sesión" to access the full application with sample data.

## Features in Demo

The demo includes:
- Sample user profile (Ana)
- Mock match suggestions
- Sample forum topics and discussions
- Example events and trueques listings
- Complete navigation through all features

All data is loaded from mock JSON files and updates are stored in the browser session.

## Available Scripts

`npm start` - Start the React development server

`npm build` - Build the frontend for production

`npm test` - Run tests

## Database

The demo uses mock data stored in JSON files located in `frontend/src/mock-data/`. For production use, configure the backend database connection in `backend/db.php`.

## API Documentation

The backend provides RESTful endpoints for:
- User authentication and profiles
- Match suggestions and preferences
- Messaging and chat
- Forum management
- Event and trueque handling
- Admin operations

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is private and proprietary.

## Contact

For questions or support, please contact the development team.

## Contributing

Internal contributions only. Please follow the existing code style and structure.
