# Edit Asset Functionality

This document describes the asset editing feature implemented in the CMMS system.

## Overview
The CMMS system now includes a dedicated asset editing page that allows users to update asset information after creation. This feature enhances the system's usability by enabling users to modify asset details without needing to create new assets.

## Features

### Edit Form Fields
The edit asset form includes all the same fields as the "New Asset" form:

- **Basic Information**:
  - Asset name (required)
  - Description
  - Status (active, inactive, under repair, retired)
  - Critical asset flag

- **Detailed Specifications**:
  - Manufacturer
  - Model
  - Serial number
  - Purchase date
  - Purchase cost
  - Warranty expiry date

- **Classification**:
  - Category assignment
  - Location assignment

- **Media**:
  - Asset image upload/update
  - Image preview functionality

### Key Improvements
- **Pre-populated Form**: All existing asset information is loaded when the edit page opens
- **Non-destructive Editing**: Changes are only saved upon form submission
- **Validation**: Same validation rules as the creation form apply
- **Image Handling**: Ability to update or remove existing asset images

## Navigation
- Access the edit functionality from any asset detail page via the "Edit Asset" button
- The edit form is located at `/dashboard/assets/[id]/edit`
- After saving, users are redirected back to the asset detail page

## Technical Implementation
- Built using the Next.js App Router
- Utilizes React Query for data fetching and mutation
- Leverages the existing API endpoints for asset updates
- Integrates with the centralized API client
- Uses the same UI components as the new asset form for consistency

## Security
- Access to edit functionality requires proper authentication
- Authorization checks ensure users can only edit assets they have permissions for
- All updates are validated on both client and server sides

## Best Practices
- Regularly update asset information to maintain accuracy
- Use descriptive names and detailed descriptions
- Upload clear, representative images for easy identification
- Assign appropriate categories and locations for better organization
- Mark critical assets appropriately to prioritize maintenance

## Troubleshooting
- If the edit form doesn't load, verify that the asset exists and you have permissions
- If updates fail, check that all required fields are filled and values are valid
- If images don't update, verify the file format and size are supported