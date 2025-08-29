# BI Platform

## Starting the Applications

### Prerequisites Installation

```bash
# Node.js 20+ and npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Docker and Docker Compose
sudo apt-get update
sudo apt-get install docker.io docker-compose

# PostgreSQL client (optional, for direct DB access)
sudo apt-get install postgresql-client
```

### Quick Start Commands

```bash
# Clone or create the project structure
mkdir bi-platform && cd bi-platform

# Make scripts executable
chmod +x scripts/*.sh

# Run setup (installs dependencies, starts services, runs migrations)
./scripts/setup.sh

# Start development environment
./scripts/start-dev.sh
```

### Manual Start (Alternative)

```bash
# Start infrastructure
docker-compose up -d postgres redis

# Start backend
cd api-services
npm install
npm run dev

# In a new terminal, start frontend
cd web-application
npm install
npm run dev
```

### Access Points

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:3001](http://localhost:3001)
- **API Documentation**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs) (if Swagger is implemented)
- **Database**: `postgresql://postgres:password@localhost:5432/bi_platform`
- **Redis**: `redis://localhost:6379`

### Default Login Credentials

- **Username**: `admin`  
- **Password**: `password`  
- **Workspace**: `default`