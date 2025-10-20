# Collaborative Task Manager

A modern, real-time collaborative task management application built with the MERN stack, featuring AI-powered insights, real-time collaboration, and a responsive design.

## 🚀 Features

### Core Functionality
- **Real-time Collaboration**: Live updates using Socket.IO for seamless team collaboration
- **Kanban Board**: Drag-and-drop task management with customizable columns
- **Project Management**: Create, manage, and organize projects with team members
- **User Authentication**: Secure authentication with NextAuth.js supporting GitHub and Google OAuth
- **Role-based Access Control**: Admin and user roles with appropriate permissions

### AI-Powered Features
- **AI Task Assistance**: Ask AI questions about specific tasks using Google Gemini
- **Project Summaries**: Generate intelligent project summaries with task statistics
- **Smart Insights**: AI-powered analysis of project progress and task distribution

### Modern UI/UX
- **Responsive Design**: Mobile-first design that works seamlessly across all devices
- **Dark/Light Mode**: Adaptive theming for better user experience
- **Real-time Presence**: See who's currently viewing projects with live user presence
- **Optimistic Updates**: Instant UI feedback with automatic rollback on errors

### Technical Features
- **Type Safety**: Full TypeScript implementation across frontend and backend
- **Real-time Updates**: Socket.IO integration for live collaboration
- **Caching**: Redis-based caching for improved performance
- **Rate Limiting**: API rate limiting to prevent abuse
- **Error Handling**: Comprehensive error handling and user feedback
- **Testing**: Unit and integration tests for critical components

## 🛠 Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **React Query** - Data fetching and state management
- **NextAuth.js** - Authentication solution
- **Socket.IO Client** - Real-time communication
- **React Hook Form** - Form handling
- **DND Kit** - Drag and drop functionality
- **Lucide React** - Icon library

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type-safe JavaScript
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Socket.IO** - Real-time communication
- **Redis** - Caching and session storage
- **JWT** - JSON Web Tokens for authentication
- **Google Gemini AI** - AI integration
- **Helmet** - Security middleware
- **Express Rate Limit** - Rate limiting

### DevOps & Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **MongoDB** - Database
- **Redis** - Caching layer
- **Nginx** - Reverse proxy (production)
- **Infisical** - Secret management and environment variables

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **Docker** and **Docker Compose** (for containerized setup)
- **Git** (for version control)

## 🚀 Quick Start

### Option 1: Docker Setup (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd collaborative-task-manager
   ```

2. **Set up environment variables**

   **Option A: Using .env file (Traditional)**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # MongoDB Configuration
   MONGO_ROOT_USERNAME=admin
   MONGO_ROOT_PASSWORD=your-strong-root-password
   MONGO_DATABASE=collaborative-task-manager
   MONGO_APP_USERNAME=taskmanager_user
   MONGO_APP_PASSWORD=your-strong-app-password
   
   # Redis Configuration
   REDIS_PASSWORD=your-strong-redis-password
   
   # JWT and Authentication
   JWT_SECRET=your-jwt-secret-here
   NEXTAUTH_SECRET=your-nextauth-secret-here
   NEXTAUTH_URL=http://localhost:3100
   
   # API URLs
   NEXT_PUBLIC_API_URL=http://localhost:5000
   INTERNAL_API_URL=http://taskmanager-backend:5000
   FRONTEND_URL=http://localhost:3100
   
   # OAuth Providers (Optional)
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   # AI Configuration (Optional)
   GEMINI_API_KEY=your-gemini-api-key
   ```

   **Option B: Using Infisical (Recommended for Production)**
   
   This project supports [Infisical](https://infisical.com/) for secure environment variable management:
   
   1. **Set up Infisical tokens**:
      ```bash
      # Create .env with only Infisical tokens
      echo "INFISICAL_TOKEN_NEXT_FE=your-frontend-infisical-token" > .env
      echo "INFISICAL_TOKEN_NEXT_BE=your-backend-infisical-token" >> .env
      ```
   
   2. **Configure your Infisical project** with the required environment variables listed above
   
   3. **The application will automatically fetch** all other environment variables from Infisical at runtime
   
   **Benefits of using Infisical**:
   - 🔒 Centralized secret management
   - 🔄 Automatic secret rotation
   - 👥 Team collaboration on secrets
   - 📊 Audit logs for secret access
   - 🌍 Environment-specific configurations

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3100
   - Backend API: http://localhost:5000
   - MongoDB: localhost:2109 (for database tools)

### Option 2: Local Development Setup

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd collaborative-task-manager
   npm install
   ```

2. **Setup MongoDB and Redis**
   - Install and start MongoDB locally
   - Install and start Redis locally
   - Update connection strings in `.env` or configure in Infisical

3. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend && npm install
   
   # Install backend dependencies
   cd ../backend && npm install
   ```

4. **Run database migrations**
   ```bash
   cd backend
   npm run migrate
   ```

5. **Start development servers**
   ```bash
   # From root directory
   npm run dev
   ```

   Or start individually:
   ```bash
   # Frontend (from frontend directory)
   npm run dev
   
   # Backend (from backend directory)
   npm run dev
   ```

## 🔧 Environment Variables

This project supports two methods for environment variable management:

### Method 1: Traditional .env Files

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_ROOT_USERNAME` | MongoDB root username | `admin` |
| `MONGO_ROOT_PASSWORD` | MongoDB root password | `strongpassword123` |
| `MONGO_DATABASE` | Database name | `collaborative-task-manager` |
| `MONGO_APP_USERNAME` | App database user | `taskmanager_user` |
| `MONGO_APP_PASSWORD` | App database password | `apppassword123` |
| `REDIS_PASSWORD` | Redis password | `redispassword123` |
| `JWT_SECRET` | JWT signing secret | `your-jwt-secret` |
| `NEXTAUTH_SECRET` | NextAuth secret | `your-nextauth-secret` |
| `NEXTAUTH_URL` | Application URL | `http://localhost:3100` |

### Optional Variables (for full functionality)

| Variable | Description | Required For |
|----------|-------------|--------------|
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | GitHub authentication |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | GitHub authentication |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Google authentication |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Google authentication |
| `GEMINI_API_KEY` | Google Gemini API key | AI features |

### Method 2: Infisical Integration (Recommended)

This project is configured to work with [Infisical](https://infisical.com/) for secure secret management:

#### Infisical Setup

| Variable | Description | Required |
|----------|-------------|----------|
| `INFISICAL_TOKEN_NEXT_FE` | Frontend Infisical service token | ✅ |
| `INFISICAL_TOKEN_NEXT_BE` | Backend Infisical service token | ✅ |

#### Infisical Benefits
- **🔒 Security**: Encrypted secret storage with access controls
- **🔄 Rotation**: Automatic secret rotation capabilities  
- **👥 Collaboration**: Team-based secret management
- **📊 Auditing**: Complete audit logs for secret access
- **🌍 Multi-Environment**: Separate configs for dev/staging/prod
- **🚀 CI/CD Integration**: Seamless deployment pipeline integration

#### Setting up Infisical
1. Create an account at [Infisical](https://infisical.com/)
2. Create a new project for your task manager
3. Add all the required environment variables to your Infisical project
4. Generate service tokens for frontend and backend
5. Set the `INFISICAL_TOKEN_NEXT_FE` and `INFISICAL_TOKEN_NEXT_BE` in your `.env` file
6. The application will automatically fetch all other secrets from Infisical

## 📱 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Project Endpoints
- `GET /api/projects` - Get user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Task Endpoints
- `GET /api/projects/:id/tasks` - Get project tasks
- `POST /api/projects/:id/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PUT /api/tasks/:id/move` - Move task (drag & drop)

### AI Endpoints
- `POST /api/ai/tasks/:id/question` - Ask AI about task
- `POST /api/ai/projects/:id/summary` - Generate project summary
- `GET /api/ai/projects/:id/summary/latest` - Get latest summary
- `GET /api/ai/health` - Check AI service status

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm run test

# Run frontend tests
npm run test:frontend

# Run backend tests
npm run test:backend

# Run tests in watch mode
npm run test:watch
```

### Test Coverage
```bash
# Frontend test coverage
cd frontend && npm run test:coverage

# Backend test coverage
cd backend && npm run test:coverage
```

## 🚀 Deployment

### Production Build
```bash
# Build all services
npm run build

# Build individually
npm run build:frontend
npm run build:backend
```

### Docker Production Deployment
1. Update environment variables for production
2. Use production Docker Compose configuration
3. Set up reverse proxy (Nginx recommended)
4. Configure SSL certificates
5. Set up monitoring and logging

### Environment-Specific Configurations
- **Development**: Hot reloading, debug logs, development databases
- **Staging**: Production-like environment for testing
- **Production**: Optimized builds, security headers, production databases

## 🔒 Security Features

- **Authentication**: Secure JWT-based authentication
- **Authorization**: Role-based access control
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive input validation and sanitization
- **Security Headers**: Helmet.js for security headers
- **CORS**: Configured CORS for cross-origin requests
- **Password Hashing**: bcrypt for secure password storage

## 🎯 Key Features Showcase

### Real-time Collaboration
- Live cursor tracking and user presence
- Instant task updates across all connected clients
- Real-time notifications for project changes

### AI Integration
- Natural language task queries
- Intelligent project summaries
- Task completion predictions
- Smart task recommendations

### Mobile-First Design
- Responsive Kanban board with touch support
- Mobile-optimized navigation and interactions
- Progressive Web App capabilities

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Follow the existing code style
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js** team for the amazing React framework
- **MongoDB** for the flexible database solution
- **Socket.IO** for real-time communication
- **Google** for the Gemini AI API
- **Tailwind CSS** for the utility-first CSS framework

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the API documentation above

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
  - Real-time collaboration
  - AI integration
  - Mobile-responsive design
  - Complete CRUD operations
  - Authentication and authorization

---

**Built with ❤️ for DevVoid Software Engineer Assignment**