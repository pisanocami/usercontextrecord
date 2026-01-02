# Design Guidelines: Brand Intelligence Configuration Platform

## Design Approach
**System Selected:** Carbon Design System (IBM) - optimized for enterprise data applications requiring precision, governance, and complex form interactions.

**Rationale:** This is a configuration-heavy B2B SaaS tool for marketing intelligence. Requires clear information hierarchy, robust form patterns, and trustworthy enterprise aesthetic. Carbon excels at data-dense interfaces with strong governance patterns.

## Core Design Elements

### Typography
- **Primary Font:** IBM Plex Sans (via Google Fonts CDN)
- **Headings:** 
  - H1: 2.5rem (40px), Semi-bold, -0.02em tracking
  - H2: 2rem (32px), Semi-bold
  - H3: 1.5rem (24px), Medium
  - H4: 1.25rem (20px), Medium
- **Body:** 1rem (16px), Regular, 1.5 line-height
- **Labels/Meta:** 0.875rem (14px), Medium
- **Code/JSON:** IBM Plex Mono, 0.875rem

### Layout System
**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-6, p-8
- Section margins: mb-8, mb-12, mb-16
- Form field spacing: space-y-6
- Grid gaps: gap-6, gap-8
- Container max-width: max-w-7xl

### Component Library

**Navigation:**
- Left sidebar navigation (w-64, fixed)
- Sections: Brand Context, Competitive Set, Demand Definition, Strategic Intent, Governance
- Active state indicators with subtle left border accent
- Collapsible sub-sections with chevron indicators

**Forms & Inputs:**
- Input groups with clear labels above fields
- Helper text below inputs for guidance
- JSON editors with syntax highlighting (Monaco Editor via CDN)
- Multi-select dropdowns for arrays (e.g., competitors, keywords)
- Radio groups for enums (risk_tolerance, business_model)
- Validation states: error borders, success checkmarks, warning indicators
- Required field asterisks consistently applied

**Data Display:**
- Definition cards with subtle borders for each major section
- Expandable/collapsible sections for complex nested objects
- Tag components for arrays (keywords, competitors)
- Status badges for confidence levels, approval states
- Diff view for human overrides vs model suggestions

**Cards & Containers:**
- Section cards: rounded-lg, border, p-8
- Nested subsection cards: p-6, slightly inset with different background
- Info callouts for "Why this matters" explanations
- Warning/error alerts for enforcement violations

**Buttons & Actions:**
- Primary: Save Configuration, Apply Changes
- Secondary: Review, Suggest Competitors, Validate
- Tertiary: Cancel, Reset, Clear
- Destructive: Remove, Delete Override
- Icon buttons for add/remove in arrays

**Tables:**
- Competitor comparison tables
- Keyword lists with sortable columns
- Audit log for governance tracking
- Sticky headers for long lists

### Images
**No hero image required.** This is an enterprise dashboard application focused on data input and configuration. Instead:
- Iconography for section headers (category, competitors, demand definitions)
- Illustration for empty states ("No competitors defined yet")
- Small diagram explaining semantic fence concept in help tooltips

### Page Structure

**Main Configuration View:**
1. **Top App Bar** (h-16): Logo, configuration name, last saved timestamp, user menu
2. **Left Sidebar** (w-64): Section navigation, save status indicator
3. **Main Content Area** (flex-1): Scrollable configuration forms
4. **Right Panel** (w-80, optional): Context help, validation warnings, model suggestions

**Form Flow:**
- Stepped progression indicator for new configurations
- Persistent save bar when changes detected
- Inline validation with immediate feedback
- Summary review screen before final submission

### Interaction Patterns
- Auto-save drafts every 30 seconds
- Optimistic UI updates with rollback on failure
- Confirmation modals for destructive actions
- Keyboard shortcuts for power users (Cmd+S to save)
- Copy JSON button for each section
- Import/Export entire configuration

### Trust & Governance Visual Language
- Lock icons for enforced exclusions
- Human override badges distinct from model suggestions
- Confidence level indicators with color-coded dots
- Audit trail timestamps prominently displayed
- "CMO Safe" approval checkmark in header when validated

### Responsive Behavior
- Desktop-first (primary use case)
- Tablet: Collapsible sidebar
- Mobile: Stacked sections, simplified JSON view with read-only focus