# Business Intelligence Platform

A comprehensive, enterprise-grade Business Intelligence platform built with TypeScript, featuring multi-tenant workspaces, advanced permissions, file-based plugins, and powerful dashboard creation capabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-20.10.0%2B-green)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-15%2B-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/redis-7.2%2B-red)](https://redis.io/)

## 🌟 Key Features

### 🏢 Multi-Tenant Architecture
- **Workspace Isolation**: Complete data and session isolation between workspaces
- **Flexible User Management**: Users can belong to multiple workspaces with different roles
- **Custom Branding**: Per-workspace themes, logos, and branding options

### 🔐 Advanced Security & Permissions
- **Role-Based Access Control (RBAC)**: Granular permissions system with union inheritance
- **Row-Level Security**: Dataset-level access controls with custom policies
- **Audit Logging**: Comprehensive activity tracking for compliance and monitoring
- **JWT Authentication**: Secure token-based authentication with refresh tokens

### 🔌 File-Based Plugin System
- **Data Source Plugins**: PostgreSQL, MySQL, MongoDB, and more (easily extensible)
- **Chart Plugins**: 60+ chart types across ECharts, D3.js, Plotly.js, and Chart.js
- **Static Compilation**: Plugins are statically compiled for optimal performance
- **Workspace Configuration**: Enable/disable plugins per workspace

### 📊 Professional Dashboard Builder
- **Drag & Drop Interface**: Intuitive dashboard creation with responsive grid layout
- **Advanced Chart Configuration**: Comprehensive styling and interaction options
- **Real-time Collaboration**: Multiple users can edit dashboards simultaneously
- **Template System**: Save and reuse dashboard templates

### 🔄 Dataset Management & Transformations
- **Source Datasets**: Connect directly to databases with custom queries
- **Transformation Datasets**: Multi-stage data transformations with 3-level chain depth
- **Query Caching**: Intelligent caching with configurable TTL
- **Schema Introspection**: Automatic column type detection and metadata

### 🌐 Webview Panel System
- **Dedicated Consumption Interface**: Clean, distraction-free dashboard viewing
- **Category-Based Navigation**: Organize dashboards hierarchically
- **Custom Themes**: Per-webview styling and branding
- **Public Access**: Share dashboards with external users

### 📈 Advanced Analytics & Export
- **Usage Analytics**: Dashboard and chart view tracking
- **Performance Metrics**: Query execution time monitoring
- **Multiple Export Formats**: PDF, PNG, CSV, Excel exports
- **Scheduled Reports**: Automated report generation and distribution

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Admin Panel   │  Builder Panel  │    Webview Panel        │
│   - Users       │  - Dashboards   │    - Category Nav       │
│   - Roles       │  - SQL Editor   │    - Dashboard View     │
│   - Settings    │  - Data Sources │    - Mobile Support     │
└─────────────────┴─────────────────┴─────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    API Services Layer                       │
├─────────────────┬─────────────────┬─────────────────────────┤
│  Authentication │ Dataset Service │   Dashboard Service     │
│  Permission     │ Query Execution │   Webview Service       │
│  Workspace      │ Transformation  │   Export Service        │
└─────────────────┴─────────────────┴─────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                File-Based Plugin System                     │
├─────────────────────────────────┬───────────────────────────┤
│        Data Source Plugins      │      Chart Plugins        │
│        - PostgreSQL             │      - ECharts Components │
│        - MySQL/MariaDB          │      - D3.js Components   │
│        - MongoDB                │      - Plotly Components  │
│        - Cloud Databases        │      - Custom Components  │
└─────────────────────────────────┴───────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                             │
├─────────────────┬─────────────────┬─────────────────────────┤
│   PostgreSQL    │     Redis       │    File Storage         │
│   - User Data   │   - Sessions    │    - Exports            │
│   - Workspaces  │   - Query Cache │    - Uploads            │
│   - Permissions │   - Plugin      │    - Thumbnails         │
│   - Audit Logs  │     Configs     │                         │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 20.10.0+ LTS
- **PostgreSQL**: 15.0+
- **Redis**: 7.2+
- **Docker & Docker Compose**: Latest (recommended)

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**
```bash
git clone <repository-url>
cd bi-platform
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start the platform**
```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

4. **Access the application**
- Web Application: http://localhost:3000
- API Documentation: http://localhost:3001/api-docs
- Health Check: http://localhost/health

5. **Default credentials**
- Email: `admin@system.local`
- Password: `admin123`

### Option 2: Manual Installation

#### Backend Setup
```bash
cd api-services
npm install
npm run build

# Set up database
npm run db:migrate
npm run db:seed

# Start server
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

### 1. Initial Workspace Setup

1. **Login** with the default admin account
2. **Create your first workspace** via the workspace selector
3. **Configure user roles** in workspace settings
4. **Set up data source connections** in the admin panel

### 2. Data Source Configuration

1. Navigate to **Admin → Data Sources**
2. **Add new data source** using available plugins
3. **Test connection** to ensure proper configuration
4. **Configure workspace-specific settings**

### 3. Dataset Creation

1. Go to **Datasets** section
2. **Create source dataset** connected to your data source
3. **Write SQL query** to define the data
4. **Test and validate** the dataset
5. **Set up permissions** for different user roles

### 4. Dashboard Building

1. Access the **Dashboard Builder**
2. **Create new dashboard** or use existing template
3. **Add charts** by dragging from the component library
4. **Configure each chart** with appropriate data and styling
5. **Arrange layout** using the responsive grid system
6. **Save and publish** your dashboard

### 5. Webview Panel Setup

1. Navigate to **Admin → Webviews**
2. **Create new webview** with custom branding
3. **Organize dashboards** into categories
4. **Configure access permissions**
5. **Share public URL** with end users

### 6. User Management

1. Go to **Admin → Users & Roles**
2. **Create custom roles** with specific permissions
3. **Invite new users** via email
4. **Assign roles** based on user responsibilities
5. **Monitor user activity** through audit logs

## 🔧 Configuration

### Environment Variables

Key configuration options in `.env`:

```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_DB=bi_platform
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password

# Redis
REDIS_HOST=localhost
REDIS_PASSWORD=your_secure_redis_password

# Security
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
NEXTAUTH_SECRET=your_nextauth_secret

# API Configuration
API_PORT=3001
FRONTEND_URL=http://localhost:3000

# Features
FEATURE_SQL_EDITOR=true
FEATURE_DASHBOARD_BUILDER=true
FEATURE_DATA_EXPORTS=true
FEATURE_API_ACCESS=true
```

### Plugin Configuration

#### Adding Data Source Plugins

1. Create plugin directory: `api-services/src/plugins/datasources/your-plugin/`
2. Implement plugin interface in `index.js`
3. Add manifest.json with plugin metadata
4. Restart the application

#### Adding Chart Plugins

1. Create plugin directory: `api-services/src/plugins/charts/your-chart/`
2. Define chart configuration in `manifest.json`
3. Plugin will be automatically discovered
4. Configure per workspace in admin panel

### Workspace Settings

Each workspace can be configured with:

- **Theme**: Light, dark, or auto
- **Timezone**: User timezone for date displays
- **Features**: Enable/disable specific functionality
- **Limits**: Query timeouts, export limits, etc.
- **Branding**: Logo, colors, custom CSS

## 📊 API Documentation

### Authentication

```bash
# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password",
  "workspace_slug": "my-workspace"
}

# Get current user
GET /api/auth/verify
Authorization: Bearer <token>
```

### Workspaces

```bash
# Get user workspaces
GET /api/workspaces
Authorization: Bearer <token>

# Create workspace
POST /api/workspaces
{
  "name": "My Workspace",
  "slug": "my-workspace",
  "description": "Workspace description"
}
```

### Datasets

```bash
# Get datasets
GET /api/datasets?workspaceId=<id>

# Query dataset
POST /api/datasets/<id>/query
{
  "filters": [
    {
      "column": "status",
      "operator": "equals",
      "value": "active"
    }
  ],
  "limit": 100,
  "offset": 0
}
```

### Dashboards & Charts

```bash
# Get dashboards
GET /api/dashboards?workspaceId=<id>

# Create chart
POST /api/charts
{
  "dashboard_id": "<dashboard-id>",
  "dataset_id": "<dataset-id>",
  "name": "Sales Chart",
  "type": "line-chart",
  "config": { ... },
  "position": { "x": 0, "y": 0, "width": 6, "height": 4 }
}
```

## 🔌 Plugin Development

### Data Source Plugin Structure

```javascript
// api-services/src/plugins/datasources/my-plugin/index.js
class MyDataSourcePlugin {
  async connect(config) {
    // Establish connection
    return connection;
  }

  async disconnect(connection) {
    // Close connection
  }

  async executeQuery(connection, query, params = []) {
    // Execute query and return results
    return {
      rows: [...],
      columns: [...]
    };
  }

  async testConnection(config) {
    // Test connection
    return true;
  }
}

module.exports = new MyDataSourcePlugin();
```

### Chart Plugin Manifest

```json
{
  "name": "Custom Chart",
  "type": "custom-chart",
  "version": "1.0.0",
  "description": "Custom chart implementation",
  "category": "custom",
  "library": "echarts",
  "config_schema": {
    "type": "object",
    "required": ["data_column"],
    "properties": {
      "data_column": {
        "type": "string",
        "title": "Data Column"
      }
    }
  },
  "supported_data_types": ["number", "string"],
  "min_columns": 1,
  "max_columns": 5
}
```

## 🚀 Deployment

### Production Deployment

1. **Build production images**
```bash
docker-compose -f docker-compose.prod.yml build
```

2. **Configure SSL certificates**
```bash
# Place certificates in ./ssl/
cp your-cert.pem ./ssl/cert.pem
cp your-key.pem ./ssl/key.pem
```

3. **Deploy with SSL**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bi-platform-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bi-platform-api
  template:
    metadata:
      labels:
        app: bi-platform-api
    spec:
      containers:
      - name: api
        image: bi-platform-api:latest
        ports:
        - containerPort: 3001
        env:
        - name: POSTGRES_HOST
          value: "postgres-service"
        - name: REDIS_HOST
          value: "redis-service"
```

### Environment-Specific Configurations

#### Development
- Debug logging enabled
- Hot reloading for both frontend and backend
- Development database with sample data
- All features enabled
- Relaxed security for testing

#### Staging
- Production-like environment
- SSL certificates (can be self-signed)
- Limited sample data
- Monitoring enabled
- Performance testing

#### Production
- Optimized builds
- SSL certificates from trusted CA
- Database backups
- Monitoring and alerting
- Security hardening
- CDN integration

## 📊 Monitoring & Analytics

### Application Metrics

- **Request Rate**: API requests per second
- **Response Times**: P50, P95, P99 response times
- **Error Rates**: HTTP error rates by endpoint
- **Database Performance**: Query execution times
- **Cache Hit Rates**: Redis cache effectiveness

### Business Metrics

- **User Activity**: Dashboard views, chart interactions
- **Workspace Usage**: Active workspaces, user engagement
- **Data Volume**: Dataset sizes, query frequencies
- **Export Activity**: Report generation patterns

### Health Monitoring

```bash
# Check application health
curl http://localhost/health

# Detailed health check
curl http://localhost/api/health/detailed

# System metrics
curl http://localhost/api/health/metrics
```

## 🔒 Security

### Security Features

- **Authentication**: JWT with refresh tokens
- **Authorization**: RBAC with granular permissions
- **Data Protection**: Row-level security, field-level encryption
- **Network Security**: TLS 1.3, security headers
- **Input Validation**: SQL injection prevention, XSS protection
- **Audit Logging**: Complete activity tracking
- **Rate Limiting**: API abuse prevention

### Security Best Practices

1. **Regular Updates**: Keep dependencies updated
2. **Strong Passwords**: Enforce password policies
3. **SSL/TLS**: Use valid certificates in production
4. **Database Security**: Use connection pooling, prepared statements
5. **Network Isolation**: Use firewalls, VPNs for production
6. **Backup Encryption**: Encrypt database backups
7. **Regular Audits**: Review audit logs regularly

### Compliance

- **GDPR**: Data privacy and user rights
- **SOC 2**: Security and availability controls
- **HIPAA**: Healthcare data protection (with additional configuration)
- **SOX**: Financial reporting controls

## 🧪 Testing

### Running Tests

```bash
# Backend tests
cd api-services
npm test
npm run test:coverage

# Frontend tests
cd web-application
npm test
npm run test:coverage

# End-to-end tests
npm run test:e2e
```

### Test Coverage

- **Unit Tests**: Individual functions and components
- **Integration Tests**: API endpoints and database operations
- **End-to-End Tests**: Complete user workflows
- **Performance Tests**: Load testing and stress testing
- **Security Tests**: Vulnerability scanning and penetration testing

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Guidelines

1. **Fork the repository** and create a feature branch
2. **Write tests** for new functionality
3. **Follow coding standards** (ESLint, Prettier)
4. **Update documentation** as needed
5. **Submit pull request** with clear description

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Automatic code formatting
- **Conventional Commits**: Standardized commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Full documentation](docs/)
- **API Reference**: [API docs](docs/api/)
- **Issue Tracker**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)
- **Email Support**: support@bi-platform.com

## 🗺️ Roadmap

### Version 1.1 (Q2 2024)
- [ ] Advanced SQL editor with autocomplete
- [ ] Real-time dashboard collaboration
- [ ] Enhanced mobile support
- [ ] Additional chart types (Sankey, Treemap)

### Version 1.2 (Q3 2024)
- [ ] AI-powered insights and recommendations
- [ ] Advanced data transformations (Python/R integration)
- [ ] White-label solutions
- [ ] Advanced export scheduling

### Version 2.0 (Q4 2024)
- [ ] Multi-cloud deployment support
- [ ] Advanced analytics and ML integration
- [ ] Enterprise SSO integration
- [ ] Advanced governance features

## 🙏 Acknowledgments

- **ECharts** - Powerful charting library
- **Material-UI** - Excellent React components
- **PostgreSQL** - Reliable database system
- **Redis** - High-performance caching
- **Next.js** - Outstanding React framework
- **Express.js** - Minimal Node.js framework

---

**Built with ❤️ by the BI Platform Team**