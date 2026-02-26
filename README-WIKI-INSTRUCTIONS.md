# GitHub Wiki Setup Instructions

Follow these steps to add documentation to your GitHub repository's wiki.

## Accessing the Wiki

1. Go to your GitHub repository: https://github.com/automatq/cmms
2. Click on the "Wiki" tab near the top of the page (between "Code" and "Issues")
3. Click "Create the first page" if the wiki is empty

## Adding Documentation Pages

### Method 1: Direct Web Interface
1. On the wiki page, click "New Page"
2. Enter a title for your page (this becomes the filename)
3. Add your content using Markdown syntax
4. Click "Save Page"

### Method 2: Git Repository (Advanced)
GitHub wikis are stored in a separate git repository:
1. Clone the wiki repository: `git clone https://github.com/automatq/cmms.wiki.git`
2. Create or edit `.md` files in the cloned directory
3. Add, commit, and push changes: 
   ```
   git add .
   git commit -m "Add new documentation"
   git push origin main
   ```

## Wiki Structure Suggestion

Based on the documentation files created in this project, here are suggested wiki pages:

1. **Home** (`_Sidebar.md` and `Home.md`) - Main entry point with navigation
2. **File Upload Functionality** - Details about file attachments and uploads
3. **Calendar Status Color Coding** - Information about calendar visualization
4. **Edit Asset Functionality** - Guide to asset editing features
5. **API Documentation** - Technical API information
6. **Getting Started** - Installation and setup guide
7. **Troubleshooting** - Common issues and solutions

## Markdown Guidelines

- Use standard Markdown syntax
- Create a table of contents for longer pages
- Use proper heading hierarchy (H1, H2, H3)
- Link between wiki pages using relative links
- Include code blocks with proper language specification
- Add images by uploading them to the wiki repository

## Best Practices

- Keep pages focused and well-organized
- Use descriptive titles
- Update documentation when features change
- Include examples and use cases
- Maintain a consistent style across pages
- Review content for accuracy regularly

## Converting to PDF

To convert wiki pages to PDF:
1. View the page in GitHub wiki
2. Use your browser's print function (Ctrl+P or Cmd+P)
3. Select "Save as PDF" as the destination
4. Adjust formatting options as needed