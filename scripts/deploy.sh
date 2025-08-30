#!/bin/bash

# deploy.sh - Complete BI Platform Deployment Script
# This script automates the deployment of the Business Intelligence Platform

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="bi-platform"
DOCKER_COMPOSE_FILE="docker-compose.yml"
PROD_COMPOSE_FILE="docker-compose.prod.yml"

# Default values
ENVIRONMENT="development"
SKIP_TESTS=false
REBUILD=false
BACKUP_DB=false
SSL_SETUP=false
DOMAIN=""
EMAIL=""

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
BI Platform Deployment Script

Usage: $0 [OPTIONS]

Options:
    -e, --environment ENV    Set environment (development|staging|production) [default: development]
    -d, --domain DOMAIN     Set domain name for SSL setup (production only)
    --email EMAIL           Email for Let's Encrypt SSL certificates
    -r, --rebuild           Force rebuild of Docker images
    -t, --skip-tests        Skip running tests before deployment
    -b, --backup            Backup database before deployment
    --ssl                   Set up SSL certificates (production only)
    -h, --help              Show this help message

Examples:
    $0                                          # Deploy in development mode
    $0 -e production -d example.com --ssl       # Deploy in production with SSL
    $0 -r -b                                   # Rebuild images and backup database
    $0 --skip-tests -e staging                 # Deploy to staging without tests

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -d|--domain)
                DOMAIN="$2"
                shift 2
                ;;
            --email)
                EMAIL="$2"
                shift 2
                ;;
            -r|--rebuild)
                REBUILD=true
                shift
                ;;
            -t|--skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            -b|--backup)
                BACKUP_DB=true
                shift
                ;;
            --ssl)
                SSL_SETUP=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Validate environment
validate_environment() {
    case $ENVIRONMENT in
        development|staging|production)
            print_status "Environment set to: $ENVIRONMENT"
            ;;
        *)
            print_error "Invalid environment: $ENVIRONMENT"
            print_error "Valid environments: development, staging, production"
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Check Node.js (for development)
    if [[ "$ENVIRONMENT" == "development" ]]; then
        if ! command -v node &> /dev/null; then
            print_warning "Node.js is not installed. Required for development environment."
        else
            NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
            if [[ $NODE_VERSION -lt 20 ]]; then
                print_warning "Node.js version 20+ recommended. Current version: $(node --version)"
            fi
        fi
    fi

    print_success "Prerequisites check completed"
}

# Setup environment file
setup_environment() {
    print_status "Setting up environment configuration..."

    if [[ ! -f ".env" ]]; then
        if [[ -f ".env.example" ]]; then
            cp .env.example .env
            print_status "Created .env file from .env.example"
        else
            print_error ".env.example file not found"
            exit 1
        fi
    fi

    # Generate secure secrets if not set
    if ! grep -q "JWT_SECRET=" .env || grep -q "your_super_secret_jwt_key" .env; then
        JWT_SECRET=$(openssl rand -base64 32)
        sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" .env
        print_status "Generated new JWT_SECRET"
    fi

    if ! grep -q "NEXTAUTH_SECRET=" .env || grep -q "your_nextauth_secret" .env; then
        NEXTAUTH_SECRET=$(openssl rand -base64 32)
        sed -i.bak "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=${NEXTAUTH_SECRET}/" .env
        print_status "Generated new NEXTAUTH_SECRET"
    fi

    # Set environment-specific configurations
    case $ENVIRONMENT in
        production)
            sed -i.bak "s/NODE_ENV=.*/NODE_ENV=production/" .env
            sed -i.bak "s/LOG_LEVEL=.*/LOG_LEVEL=warn/" .env
            if [[ -n "$DOMAIN" ]]; then
                sed -i.bak "s|FRONTEND_URL=.*|FRONTEND_URL=https://${DOMAIN}|" .env
                sed -i.bak "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://${DOMAIN}/api|" .env
            fi
            ;;
        staging)
            sed -i.bak "s/NODE_ENV=.*/NODE_ENV=staging/" .env
            sed -i.bak "s/LOG_LEVEL=.*/LOG_LEVEL=info/" .env
            ;;
        development)
            sed -i.bak "s/NODE_ENV=.*/NODE_ENV=development/" .env
            sed -i.bak "s/LOG_LEVEL=.*/LOG_LEVEL=debug/" .env
            ;;
    esac

    print_success "Environment configuration completed"
}

# Setup SSL certificates
setup_ssl() {
    if [[ "$SSL_SETUP" == true && "$ENVIRONMENT" == "production" ]]; then
        print_status "Setting up SSL certificates..."

        if [[ -z "$DOMAIN" ]]; then
            print_error "Domain is required for SSL setup"
            exit 1
        fi

        if [[ -z "$EMAIL" ]]; then
            print_error "Email is required for Let's Encrypt SSL setup"
            exit 1
        fi

        # Create SSL directory
        mkdir -p ssl

        # Check if certificates already exist
        if [[ -f "ssl/cert.pem" && -f "ssl/key.pem" ]]; then
            print_status "SSL certificates already exist"
            return
        fi

        # Generate self-signed certificates for testing
        print_status "Generating self-signed SSL certificates..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/key.pem \
            -out ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=${DOMAIN}"

        print_success "SSL certificates generated"
        print_warning "Self-signed certificates generated. For production, replace with valid certificates."
    fi
}

# Backup database
backup_database() {
    if [[ "$BACKUP_DB" == true ]]; then
        print_status "Creating database backup..."

        # Create backup directory
        mkdir -p backups

        # Generate backup filename with timestamp
        BACKUP_FILE="backups/bi_platform_$(date +%Y%m%d_%H%M%S).sql"

        # Check if database is running
        if docker-compose ps postgres | grep -q "Up"; then
            docker-compose exec -T postgres pg_dump -U postgres bi_platform > "$BACKUP_FILE"
            print_success "Database backup created: $BACKUP_FILE"
        else
            print_warning "Database is not running, skipping backup"
        fi
    fi
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == false ]]; then
        print_status "Running tests..."

        # Backend tests
        if [[ -d "api-services" ]]; then
            print_status "Running backend tests..."
            cd api-services
            if [[ -f "package.json" ]]; then
                npm ci --silent
                npm run test --silent
                print_success "Backend tests passed"
            fi
            cd ..
        fi

        # Frontend tests
        if [[ -d "web-application" ]]; then
            print_status "Running frontend tests..."
            cd web-application
            if [[ -f "package.json" ]]; then
                npm ci --silent
                npm run test --silent --watchAll=false
                print_success "Frontend tests passed"
            fi
            cd ..
        fi

        print_success "All tests passed"
    else
        print_warning "Skipping tests"
    fi
}

# Build and deploy
deploy() {
    print_status "Starting deployment..."

    # Set compose file based on environment
    if [[ "$ENVIRONMENT" == "production" ]]; then
        COMPOSE_FILE="$PROD_COMPOSE_FILE"
    else
        COMPOSE_FILE="$DOCKER_COMPOSE_FILE"
    fi

    # Stop existing containers
    print_status "Stopping existing containers..."
    docker-compose -f "$COMPOSE_FILE" down

    # Build images
    if [[ "$REBUILD" == true ]]; then
        print_status "Rebuilding Docker images..."
        docker-compose -f "$COMPOSE_FILE" build --no-cache
    else
        print_status "Building Docker images..."
        docker-compose -f "$COMPOSE_FILE" build
    fi

    # Start services
    print_status "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d

    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30

    # Health check
    print_status "Performing health checks..."
    local retries=0
    local max_retries=12

    while [[ $retries -lt $max_retries ]]; do
        if curl -f http://localhost/health > /dev/null 2>&1; then
            break
        fi
        
        print_status "Waiting for application to be ready... ($((retries + 1))/$max_retries)"
        sleep 10
        ((retries++))
    done

    if [[ $retries -eq $max_retries ]]; then
        print_error "Health check failed. Application may not be ready."
        docker-compose -f "$COMPOSE_FILE" logs --tail=50
        exit 1
    fi

    print_success "Deployment completed successfully!"
}

# Show deployment information
show_deployment_info() {
    print_success "=== Deployment Information ==="
    echo ""
    
    case $ENVIRONMENT in
        production)
            if [[ -n "$DOMAIN" ]]; then
                echo "🌐 Web Application: https://$DOMAIN"
                echo "🔌 API Endpoint: https://$DOMAIN/api"
            else
                echo "🌐 Web Application: https://localhost"
                echo "🔌 API Endpoint: https://localhost/api"
            fi
            ;;
        *)
            echo "🌐 Web Application: http://localhost:3000"
            echo "🔌 API Endpoint: http://localhost:3001/api"
            ;;
    esac
    
    echo "📊 Health Check: http://localhost/health"
    echo "📚 API Documentation: http://localhost:3001/api-docs"
    echo ""
    
    echo "🔐 Default Login Credentials:"
    echo "   Email: admin@system.local"
    echo "   Password: admin123"
    echo ""
    
    if [[ "$ENVIRONMENT" == "development" ]]; then
        echo "🛠️  Development Tools:"
        echo "   pgAdmin: http://localhost:5050"
        echo "   Redis Insight: http://localhost:8001"
        echo ""
    fi
    
    echo "📁 Important Files:"
    echo "   Environment: .env"
    echo "   Logs: docker-compose logs -f"
    echo "   Backup: backups/ directory"
    echo ""
    
    echo "🚀 Next Steps:"
    echo "1. Access the web application and login"
    echo "2. Create your first workspace"
    echo "3. Configure data sources"
    echo "4. Build your first dashboard"
    echo ""
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        print_warning "Production Reminders:"
        echo "- Change default admin password"
        echo "- Configure proper SSL certificates"
        echo "- Set up monitoring and backups"
        echo "- Review security settings"
    fi
}

# Cleanup function
cleanup() {
    print_status "Cleaning up temporary files..."
    rm -f .env.bak
}

# Main deployment function
main() {
    print_status "Starting BI Platform deployment script..."
    print_status "Timestamp: $(date)"
    echo ""

    # Parse arguments
    parse_args "$@"

    # Validate environment
    validate_environment

    # Check prerequisites
    check_prerequisites

    # Setup environment
    setup_environment

    # Setup SSL if requested
    setup_ssl

    # Backup database if requested
    backup_database

    # Run tests unless skipped
    run_tests

    # Deploy the application
    deploy

    # Show deployment information
    show_deployment_info

    # Cleanup
    cleanup

    print_success "🎉 BI Platform deployment completed successfully!"
    print_status "Happy analyzing! 📊"
}

# Trap to cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"