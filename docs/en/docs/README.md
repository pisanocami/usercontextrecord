# FON Platform Documentation

This directory contains the technical documentation for the Brand Intelligence Configuration Platform (FON).

---

## Documentation Index

### Main Documentation

| Document | Description |
|----------|-------------|
| [SYSTEM_DOCUMENTATION.md](../SYSTEM_DOCUMENTATION.md) | General system documentation |
| [CONTEXT_MODULE_ARCHITECTURE.md](../CONTEXT_MODULE_ARCHITECTURE.md) | Context-First Architecture |
| [KEYWORD_GAP_ANALYSIS.md](../KEYWORD_GAP_ANALYSIS.md) | Keyword Gap Documentation |
| [OOFOS_CASE_STUDY.md](../OOFOS_CASE_STUDY.md) | DTC footwear case study |

### Technical Documentation

| Document | Description |
|----------|-------------|
| [MODULE_CONTRACTS.md](./MODULE_CONTRACTS.md) | Module contracts system |
| [UCR_SPECIFICATION.md](./UCR_SPECIFICATION.md) | User Context Record specification |

### Configuration

| Document | Description |
|----------|-------------|
| [replit.md](../replit.md) | Replit project configuration |
| [design_guidelines.md](../design_guidelines.md) | UI/UX design guidelines |

---

## Directory Structure

```
docs/
├── README.md                    # This file (index)
├── MODULE_CONTRACTS.md          # Module contracts system
├── UCR_SPECIFICATION.md         # UCR specification
├── screens-manifest.json        # Screens registry and metadata
├── capture-screenshots.ts       # Screenshot capture script
├── generate-documentation.ts    # Markdown documentation generator
└── screenshots/                 # Screenshots
    ├── 01-landing.png
    ├── 02-configurations-list.png
    └── ...
```

## Usage

### 1. Generate Documentation (without screenshots)

```bash
npx tsx docs/generate-documentation.ts
```

This generates `SYSTEM_DOCUMENTATION.md` in the project root.

### 2. Capture Public Screenshots

First, install Playwright browsers (only first time):

```bash
npx playwright install chromium
```

Then run the capture script:

```bash
npx tsx docs/capture-screenshots.ts
```

This automatically captures public screens (landing page).

### 3. Authenticated Screen Screenshots

For screens that require authentication, follow these steps:

1. Log in to the application
2. Navigate to each screen
3. Use browser developer tools (F12 > Device toolbar)
4. Configure viewport to 1440x900
5. Take screenshot
6. Save in `docs/screenshots/` with the corresponding name

#### Required Screenshots List

| File | Screen |
|------|--------|
| 01-landing.png | Landing Page |
| 02-configurations-list.png | Configurations List |
| 03-config-brand.png | Configuration - Brand Context |
| 04-config-category.png | Configuration - Category Definition |
| 05-config-competitors.png | Configuration - Competitive Set |
| 06-config-demand.png | Configuration - Demand Definition |
| 07-config-intent.png | Configuration - Strategic Intent |
| 08-config-channels.png | Configuration - Channel Context |
| 09-config-negative.png | Configuration - Negative Scope |
| 10-config-governance.png | Configuration - Governance |
| 11-one-pager.png | One Pager - Executive View |
| 12-keyword-gap.png | Keyword Gap Analysis |
| 13-version-history.png | Version History |

### 4. Generate Documentation with PDF

The script now automatically generates a PDF if screenshots are available:

```bash
npx tsx docs/generate-documentation.ts
```

This will generate:
- `SYSTEM_DOCUMENTATION.md` - Documentation in Markdown format
- `SYSTEM_DOCUMENTATION.pdf` - Documentation in PDF format (if screenshots available)

#### PDF Requirements

To generate PDF you need **pandoc** installed:

**macOS:**
```bash
brew install pandoc
```

**Ubuntu/Debian:**
```bash
sudo apt-get install pandoc
```

**Windows:**
```bash
choco install pandoc
```

Or download from: https://pandoc.org/installing.html

If pandoc is not available, the script will generate only the Markdown file and show pandoc installation instructions.

### 5. Complete Documentation Flow

To generate complete documentation with screenshots and PDF:

```bash
# 1. Configure environment variables (only first time)
cp .env.example .env
# Edit .env with your DATABASE_URL and other variables

# 2. Install browsers (only first time)
npx playwright install chromium

# 3. Start server manually
npm run dev

# 4. Capture public screenshots (in another terminal)
npx tsx docs/capture-screenshots.ts

# 5. Capture authenticated screenshots (manual)
# - Log in to the app
# - Navigate to each screen
# - Take screenshots in 1440x900
# - Save in docs/screenshots/

# 6. Generate complete documentation
npx tsx docs/generate-documentation.ts
```

### 6. Troubleshooting

**Error: DATABASE_URL must be set**
- Copy `.env.example` to `.env`
- Configure your `DATABASE_URL` with your PostgreSQL connection

**Error: Server not running**
- Make sure the server is running on `http://localhost:5000`
- Run `npm run dev` in a terminal

**Error: pandoc not found**
- Install pandoc to generate PDFs
- If you don't have pandoc, the script will generate only Markdown

**Error: NODE_ENV is not recognized as a command**
- This is a Windows environment variable issue
- We now use `cross-env` to solve it
- Run: `npm run dev` (should work now)

**Error: Access denied when installing pandoc**
- Run the installation script without admin:
  ```bash
  powershell -ExecutionPolicy Bypass -File docs/install-pandoc.ps1
  ```
- Or download pandoc manually from https://pandoc.org/installing.html

## Screen Manifest

The `screens-manifest.json` file contains:

- **metadata**: Project information and version
- **screens**: List of screens with:
  - `id`: Unique identifier
  - `name`: Display name
  - `route`: Application route
  - `requiresAuth`: Whether it requires authentication
  - `description`: Functional description
  - `technicalNotes`: Implementation technical notes
  - `flow`: User flow it belongs to
  - `screenshotFile`: Screenshot file name
- **flows**: User flow definitions
- **technicalArchitecture**: Technology stack

## Customization

To add new screens:

1. Edit `screens-manifest.json`
2. Add entry to the `screens` array
3. Run the documentation generator
4. Capture the corresponding screenshot
