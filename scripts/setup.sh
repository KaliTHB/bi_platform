#!/bin/bash

echo "Setting up BI Platform development environment..."

# Copy environment files
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created .env file"
fi

if [ ! -f web-application/.env.local ]; then
    cp web-application/.env.example web-application/.env.local
    echo "✓ Created frontend .env.local file"
fi

# Install backend dependencies
echo "Installing backend dependencies..."
cd api-services
npm install
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd web-application
npm install
cd ..

# Start Docker services
echo "Starting database services..."
docker-compose up -d postgres redis

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Run database migrations
echo "Running database migrations..."
cd api-services
npm run db:migrate
npm run db:seed
cd ..

echo "✓ Setup complete!"
echo ""
echo "To start the development environment:"
echo "  ./scripts/start-dev.sh"
echo ""
echo "URLs:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:3001"
echo "  Database: localhost:5432"
echo "  Redis: localhost:6379"