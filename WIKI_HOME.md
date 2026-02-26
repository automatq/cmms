# CMMS Wiki

Welcome to the CMMS (Computerized Maintenance Management System) documentation. This wiki provides comprehensive information about the system's features, architecture, and usage.

## Table of Contents
- [About CMMS](#about-cmms)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Modules](#modules)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)

## About CMMS
The CMMS is an AI-augmented maintenance management system designed to streamline maintenance operations, track work orders, manage assets, and optimize preventive maintenance schedules.

## Features
- **Asset Management**: Track and manage all your equipment, machinery, and facilities
- **Work Order Management**: Create, assign, and track maintenance work orders
- **Preventive Maintenance**: Schedule and manage recurring maintenance tasks
- **Inventory Management**: Track parts, materials, and supplies
- **Reporting**: Comprehensive analytics and reporting capabilities
- **File Attachments**: Upload documents, images, and files to assets and work orders
- **Calendar View**: Visualize maintenance schedules with color-coded statuses
- **Mobile Support**: Access the system from mobile devices

## Architecture
The CMMS is built as a modern full-stack application with the following components:

- **Frontend**: Next.js 14 with React, Shadcn UI components
- **Backend**: NestJS API with TypeScript
- **Database**: PostgreSQL with TimescaleDB extension
- **Authentication**: Keycloak for SSO and user management
- **File Storage**: MinIO for object storage
- **Caching**: Redis
- **Containerization**: Docker and Docker Compose
- **Reverse Proxy**: Caddy

## Getting Started
### Prerequisites
- Docker and Docker Compose
- Node.js (for local development)

### Installation
1. Clone the repository
2. Set up environment variables in `.env` files
3. Run `docker-compose up -d` to start all services
4. Access the application at `http://localhost`

### Initial Setup
1. Access Keycloak admin console to manage users
2. Configure your organization settings
3. Add your first asset
4. Create maintenance categories and locations

## Modules

### Assets Module
Manage all physical assets including equipment, machinery, and facilities.

#### Features:
- Asset creation and categorization
- Asset images and documentation
- Asset lifecycle tracking
- Critical asset marking
- Location assignment

### Work Orders Module
Create and manage maintenance work orders.

#### Features:
- Work order creation with detailed specifications
- Priority and status tracking
- Assignment to technicians
- File attachments and photos
- Checklist functionality

### Preventive Maintenance Module
Schedule and manage recurring maintenance tasks.

#### Features:
- Recurring maintenance schedules
- Automatic work order generation
- Compliance tracking
- Performance metrics

### Inventory Module
Track parts, materials, and supplies.

#### Features:
- Part catalog management
- Stock level tracking
- Low stock alerts
- Supplier management
- Purchase order creation

## API Documentation
The CMMS provides a comprehensive REST API accessible at `/api/v1`. Detailed documentation is available via Swagger at `/api/docs` when the API is running.

### Authentication
All API endpoints require authentication via JWT tokens obtained through the Keycloak integration.

## Troubleshooting
### Common Issues
- **API not responding**: Check that the API container is running and that Keycloak is healthy
- **Files not uploading**: Verify MinIO is running and properly configured
- **Authentication issues**: Ensure Keycloak is properly configured and reachable

### Logs
Check container logs using `docker logs <container_name>` for troubleshooting.