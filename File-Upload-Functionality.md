# File Upload Functionality

This document describes the file upload functionality implemented in the CMMS system.

## Overview
The CMMS system supports various types of file uploads across different modules:
- Work order attachments and checklist photos
- Asset images and documents
- General file attachments

## Technical Implementation

### Backend (NestJS API)
- File uploads are handled using Multer for multipart form data processing
- Files are stored in MinIO object storage
- File metadata is stored in the PostgreSQL database
- All file operations are secured with authentication and authorization

### Frontend (Next.js Web App)
- File uploads use the native HTML file input with drag-and-drop capability
- Progress indicators show upload status
- File previews are available for images
- Integration with the API through the centralized API client

### Mobile App (React Native)
- File upload functionality is available through the mobile API client
- Supports document and image uploads
- Optimized for mobile network conditions

## Specific Upload Capabilities

### Work Order Attachments
- Upload supporting documents to work orders
- Upload photos of equipment conditions
- Upload repair manuals or schematics
- Files are accessible from the work order detail page

### Checklist Photos
- Upload photos during checklist completion
- Photos are linked to specific checklist items
- Visual verification of completed tasks
- Stored with work order context

### Asset Images
- Upload primary images for assets
- Upload supporting documentation
- Images displayed on asset detail pages
- Edit functionality to update asset images

## Security
- All file uploads require authentication
- File types are validated to prevent malicious uploads
- Files are stored separately from the application code
- Access controls ensure users can only access authorized files

## Supported File Types
- Images: JPG, PNG, GIF, WEBP
- Documents: PDF, DOC, DOCX, XLS, XLSX
- Other: TXT, CSV

## File Size Limits
- Individual files: Up to 10MB
- Total attachment size per record: Up to 50MB

## Best Practices
- Name files descriptively for easy identification
- Organize attachments by relevance to the parent record
- Use checklist photos to document work completion
- Regularly review and clean up old attachments to manage storage