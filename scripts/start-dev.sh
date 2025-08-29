#!/bin/bash

echo "Starting BI Platform development environment..."

# Start infrastructure
docker-compose up -d postgres redis

# Wait for services
sleep 5

# Start backend in background
cd api-services
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
cd web-application
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✓ Development environment started!"
echo ""
echo "Services:"
echo "  Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo "  Backend: http://localhost:3001 (PID: $BACKEND_PID)"
echo ""
echo "To stop services:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "  docker-compose down"

# Wait for any process to exit
wait