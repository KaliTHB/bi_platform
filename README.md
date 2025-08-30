# File: README.md
# Business Intelligence Platform

A comprehensive TypeScript-based Business Intelligence platform designed for multi-tenant enterprise environments, featuring workspace-isolated sessions, custom role-based permissions, file-based plugin architecture, and a dedicated webview panel for dashboard consumption.

## 🚀 Features

### Core Platform
- **Multi-Tenant Architecture**: Complete workspace isolation with independent user sessions
- **Custom Permission System**: Flexible role-based access control with union permission inheritance  
- **File-Based Plugin System**: Statically compiled data source and chart plugins with workspace configuration
- **Dataset-Centric Security**: Chart access controlled through underlying dataset permissions
- **Transformation Pipeline**: Multi-stage dataset transformations with maximum 3-level chain depth

### Data Integration
- **20+ Data Source Connectors**: PostgreSQL, MySQL, MongoDB, BigQuery, Snowflake, etc.
- **Real-time Query Execution**: Connection pooling and intelligent caching
- **Advanced Transformations**: Visual transformation builder with DAX-like calculated fields
- **Row-Level Security**: 6-tier RLS hierarchy with dynamic policy application

### Visualization System  
- **60+ Chart Types**: Across 6 visualization libraries (ECharts, D3.js, Plotly.js, Chart.js, etc.)
- **Interactive Features**: Drill-down, cross-filtering, and real-time updates
- **Mobile-Responsive**: Optimized for desktop, tablet, and mobile consumption
- **Professional Export**: PDF, Excel, CSV, PNG, SVG export capabilities

### Webview Panel System (NEW)
- **Category-Based Navigation**: Hierarchical dashboard organization with expand/collapse
- **Triple-Layer Security**: Webview + Dashboard + Dataset access validation
- **Customizable Theming**: Per-webview branding, colors, and navigation settings
- **Analytics Tracking**: Comprehensive user navigation and interaction analytics

## 🏗 Architecture Overview

```
Frontend (Next.js + TypeScript)
├── Admin Panel (User/Role/Plugin Management)
├── Builder Panel (Dashboard/Chart/Dataset Creation) 
└── Webview Panel (Category-Based Dashboard Consumption)

API Services (Express.js + TypeScript)
├── Authentication & Permission Services
├── Dataset & Query Execution Services
├── Dashboard & Chart Management Services
└── Webview & Category Services

File-Based Plugin System
├── Data Source Plugins (PostgreSQL, MySQL, MongoDB, etc.)
└── Chart Plugins (ECharts, D3.js, Plotly.js, etc.)

Database Layer
├── PostgreSQL 15+ (Primary data store)
├── Redis 7.2+ (Caching & sessions)
└── File Storage (Exports, uploads, thumbnails)
```

## 🛠 Installation

### Prerequisites
- Node.js 20.10.0+ LTS
- PostgreSQL 15.0+
- Redis 7.2+
- Docker & Docker Compose (optional)

### Quick Start with Docker

1. Clone the repository:
```bash
git clone <repository-url>
cd bi-platform
```

2. Copy environment configuration:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the platform:
```bash
docker-compose up -d
```

4. Access the application:
- Web Application: http://localhost:3000
- API Documentation: http://localhost:5000/api-docs
- Health Check: http://localhost/health

### Manual Installation

#### Backend Setup
```bash
cd api-services
npm install
npm run build
npm run migrate
npm start
```

#### Frontend Setup
```bash
cd web-application
npm install
npm run build
npm start
```

## 📖 Usage Guide

### 1. Initial Setup
1. Create your first workspace at `/workspace-selector`
2. Configure user roles and permissions in `/workspace/{slug}/admin/users`
3. Set up data source connections in `/workspace/{slug}/admin/plugins`

### 2. Data Management
1. Create datasets from your data sources at `/workspace/{slug}/datasets`
2. Build transformation pipelines for data cleaning and enrichment
3. Configure row-level security policies for data access control

### 3. Dashboard Creation
1. Use the dashboard builder at `/workspace/{slug}/dashboard-builder`
2. Add charts from 60+ available chart types across multiple libraries
3. Configure interactive filters and drill-down capabilities

### 4. Category Organization
1. Create dashboard categories at `/workspace/{slug}/admin/categories`
2. Organize dashboards hierarchically with icons and colors
3. Set up featured dashboards and sorting preferences

### 5. Webview Configuration
1. Create webview panels at `/workspace/{slug}/admin/webviews`
2. Configure themes, branding, and navigation settings
3. Set up user access permissions for each webview

### 6. Dashboard Consumption
1. Users access dashboards via webview panels at `/{webview-name}/`
2. Navigate through categories and discover dashboards
3. Interact with charts and export content as needed

## 🔧 Configuration

### Database Configuration
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bi_platform
DB_USER=postgres
DB_PASSWORD=password
DB_MAX_CONNECTIONS=20
```

### Redis Configuration
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### JWT Configuration
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### Plugin Configuration
Plugins are file-based and configured at the workspace level:
- Data source plugins: `api-services/src/plugins/datasources/`
- Chart plugins: `web-application/src/components/charts/`

## 🚀 Development

### API Development
```bash
cd api-services
npm run dev          # Start development server
npm run test         # Run tests
npm run lint         # Run linting
npm run migrate      # Run database migrations
```

### Frontend Development
```bash
cd web-application
npm run dev          # Start development server
npm run test         # Run tests
npm run lint         # Run linting
npm run storybook    # Start Storybook
```

### Adding New Plugins

#### Data Source Plugin
1. Create plugin file in `api-services/src/plugins/datasources/{category}/{name}.ts`
2. Implement the `DataSourcePlugin` interface
3. Register plugin in `api-services/src/plugins/datasources/index.ts`
4. Add configuration schema and connection logic

#### Chart Plugin
1. Create React component in `web-application/src/components/charts/{library}/{name}.tsx`
2. Implement the `ChartPluginConfig` interface
3. Register plugin in `web-application/src/components/charts/index.ts`
4. Add configuration schema and rendering logic

## 🧪 Testing

### Backend Tests
```bash
cd api-services
npm run test                    # Unit tests
npm run test:watch             # Watch mode
npm run test:coverage          # Coverage report
```

### Frontend Tests
```bash
cd web-application
npm run test                   # Unit tests
npm run test:watch            # Watch mode
npm run test:coverage         # Coverage report
npx playwright test           # E2E tests
```

### Integration Tests
```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration

# Cleanup
docker-compose -f docker-compose.test.yml down
```

## 📊 Performance & Scaling

### Query Performance
- Connection pooling: 20 connections per data source
- Query timeout: 300 seconds maximum
- Result caching: 1 hour default TTL
- Concurrent query limits: 5 per user, 50 per workspace

### Caching Strategy
- Redis cache hierarchy with multiple TTL levels
- Session data: 5-minute TTL
- User permissions: 5-minute TTL
- Query results: 15-minute TTL
- Plugin configurations: 30-minute TTL

### Scaling Considerations
- Horizontal scaling support with load balancers
- Database read replicas for query distribution
- Redis clustering for cache scaling
- CDN integration for static assets

## 🔒 Security

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Custom role-based access control (RBAC)
- Multi-factor authentication support (optional)
- Azure AD integration for enterprise SSO

### Data Security
- AES-256 encryption for sensitive credentials
- TLS/SSL required for all database connections
- Row-level security with dynamic policy application
- Complete audit trail for all user actions

### Network Security
- HTTPS-only communication in production
- CORS configuration for cross-origin requests
- Rate limiting on API endpoints
- SQL injection prevention
- XSS protection headers

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User authentication
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/workspaces` - User workspaces

### Webview Panel Endpoints
- `GET /api/webview/{webviewName}` - Webview configuration
- `GET /api/webview/{webviewName}/categories` - Category navigation
- `GET /api/webview/{webviewName}/{dashboardSlug}` - Dashboard access
- `POST /api/webview/{webviewName}/analytics` - Analytics tracking

### Category Management
- `GET /api/categories/{workspaceId}` - List categories
- `POST /api/categories` - Create category
- `PUT /api/categories/{id}` - Update category
- `DELETE /api/categories/{id}` - Delete category

### Export Options
All endpoints support multiple export formats:
- JSON: All GET endpoints
- CSV: List endpoints with tabular data
- Excel: List endpoints with tabular data  
- PDF: Dashboard and chart endpoints
- PNG/SVG: Chart endpoints

## 🌐 Deployment

### Production Deployment
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with SSL
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables
See `.env.example` for all required environment variables.

### Health Monitoring
- `/health` - Application health check
- `/api/health` - API service health
- Prometheus metrics endpoint
- Winston logging with rotation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Write comprehensive tests for new features
- Update documentation for API changes
- Follow conventional commit messages
- Ensure all tests pass before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Documentation: [Link to docs]
- Issues: [GitHub Issues]
- Discussions: [GitHub Discussions]
- Email: support@yourdomain.com

---