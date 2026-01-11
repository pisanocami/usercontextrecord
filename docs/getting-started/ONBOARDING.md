# 👋 **Brand Intelligence Platform - Developer Onboarding Guide**

## Welcome to the Team!

**Congratulations!** You've joined the development team for the **Brand Intelligence Configuration Platform** - a sophisticated AI-powered business intelligence system that helps brands understand their market position and optimize their digital strategy.

This guide will take you from **"What is this project?"** to **"I can confidently contribute to this codebase"** in the shortest time possible.

---

## 📋 **Table of Contents**

1. [Project Overview & Business Context](#-project-overview--business-context)
2. [Architecture Deep Dive](#-architecture-deep-dive)
3. [Getting Started (5 Minutes)](#-getting-started-5-minutes)
4. [Development Environment Setup](#-development-environment-setup)
5. [Understanding the Core Concepts](#-understanding-the-core-concepts)
6. [Daily Development Workflow](#-daily-development-workflow)
7. [Common Development Tasks](#-common-development-tasks)
8. [Troubleshooting Guide](#-troubleshooting-guide)
9. [Best Practices & Conventions](#-best-practices--conventions)
10. [Where to Get Help](#-where-to-get-help)

---

## 🎯 **Project Overview & Business Context**

### **What This Platform Does**

Imagine you're building a **digital strategy command center** for enterprise brands. This platform helps marketing directors and CMOs make data-driven decisions about their brand's position in the digital marketplace.

**Key Business Value:**
- **Market Intelligence**: Understand competitor positioning across 25+ SEO and market signals
- **Strategic Planning**: Configure brand context that AI systems use for content and strategy generation
- **Compliance & Governance**: CMO-safe AI generation with human oversight and audit trails
- **Scalability**: Support unlimited brands with consistent, automated analysis

### **Who Uses This Platform**

**Primary Users:**
- **Marketing Directors** - Configure brand strategy and competitive intelligence
- **CMO Teams** - Govern AI usage and ensure brand safety
- **Content Teams** - Generate AI content with brand context awareness
- **Strategy Consultants** - Access detailed market analysis reports

**Technical Users:**
- **Developers** (that's you!) - Extend platform capabilities
- **Data Scientists** - Build new analysis modules
- **DevOps Engineers** - Deploy and maintain infrastructure

### **Why This Architecture Matters**

This isn't just another web app. This platform solves **real enterprise problems**:

1. **Brand Safety**: Prevents AI from generating content that contradicts brand positioning
2. **Competitive Intelligence**: Automated analysis of competitor SEO and market strategies
3. **Scalability**: One codebase powers unlimited brands and analysis types
4. **Governance**: Complete audit trail of all AI generations and strategic decisions

---

## 🏗️ **Architecture Deep Dive**

### **The Big Picture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Interface│    │  Business Logic │    │   Data Layer    │
│   (React + TS)  │◄──►│   (Node.js)     │◄──►│   (PostgreSQL)  │
│                 │    │                 │    │                 │
│ • Configuration │    │ • 25+ Modules   │    │ • Brand Configs │
│ • Dashboards    │    │ • AI Integration│    │ • Audit Logs    │
│ • Visualizations│    │ • API Routes    │    │ • Analysis Data │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Frontend Architecture (What You'll Work With Most)**

The frontend follows a **component-driven architecture** organized by business domain:

#### **Component Organization Philosophy**

**Why this structure?** Because components are organized by **what they do**, not **where they're used**. This makes the codebase predictable and maintainable.

```
components/
├── ui/           # 🧱 Base components (shadcn/ui)
├── blocks/       # 🔧 Business logic blocks
├── sections/     # 📄 Page sections (UCR forms)
├── notion/       # 🎨 UX enhancement components
├── layouts/      # 📐 Page layouts
├── mobile/       # 📱 Mobile-specific components
└── visualizations/ # 📊 Data visualization
```

**Key Principle:** Each directory has a **single responsibility**. This makes finding and modifying code intuitive.

#### **The Magic of ModuleShell.tsx**

This is the **secret sauce** of the platform. Instead of having 25+ individual page files, we have:

```typescript
// ONE component that renders ANY module dynamically
<Route path="/modules/:moduleId">
  {(params) => (
    <MainLayout activeSection={params.moduleId}>
      <ModuleShell />  {/* Handles all 25+ modules */}
    </MainLayout>
  )}
</Route>
```

**Why this works:**
1. **Scalability**: Add new modules without touching routing
2. **Consistency**: All modules inherit the same UI patterns
3. **Maintainability**: One codebase for all module rendering logic

### **Backend Architecture (Where the Intelligence Lives)**

#### **Module System - The Heart of the Platform**

The platform's intelligence comes from **25+ analysis modules**:

**SEO Signals (5 modules):**
- `priority_scoring` - Content priority analysis
- `category_visibility` - Category dominance measurement
- `link_authority` - Backlink strength analysis
- `os_drop` - Organic search position tracking
- `deprioritization` - Content optimization opportunities

**Market Signals (7 modules):**
- `share_of_voice` - Brand mention analysis
- `branded_demand` - Direct brand search tracking
- `breakout_terms` - Emerging keyword opportunities
- And 4 more market intelligence modules...

#### **How Modules Execute**

```typescript
// Every module follows this contract
interface ModuleContract {
  name: string;
  description: string;
  contextInjection: {
    requiredSections: UCRSectionID[]; // What data it needs
    optionalSections: UCRSectionID[];
  };
  executionGate: { /* Validation rules */ };
  ui: { /* Rendering metadata */ };
}
```

**Execution Flow:**
1. **Validation**: Check if required UCR sections are complete
2. **Dispatch**: Route to specific implementation in `module-runner.ts`
3. **Execution**: Run AI analysis with brand context
4. **Storage**: Persist results with audit trail

### **Data Architecture (The Memory System)**

#### **UCR (User Context Record) - The Foundation**

Every brand configuration creates a **User Context Record** with 8 sections:

- **A. Brand** - Basic brand information
- **B. Category Definition** - Market positioning
- **C. Competitive Set** - Competitor analysis
- **D. Demand Definition** - Target audience
- **E. Strategic Intent** - Business objectives
- **F. Channel Context** - Marketing channel strategy
- **G. Negative Scope** - What to avoid
- **H. Governance** - AI usage policies

**Why this matters:** Every module uses this context to provide **brand-aware** intelligence.

#### **Database Schema**

```sql
-- Key tables you'll interact with
configurations     -- Brand configurations (UCR)
module_runs        -- Analysis execution history
audit_logs         -- Governance tracking
competitor_entries -- Competitive intelligence
exclusions         -- Negative scope rules
```

---

## 🚀 **Getting Started (5 Minutes)**

### **Prerequisites**
- **Node.js 20+** (check with `node --version`)
- **npm or yarn** package manager
- **Git** for version control
- **VS Code** (recommended) with TypeScript extensions

### **Quick Start Commands**

```bash
# 1. Clone the repository
git clone <repository-url>
cd usercontextrecord

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# 4. Start development server
npm run dev

# 5. Open in browser
# http://localhost:5000
```

**That's it!** You're now running the platform locally.

### **What You Should See**

- **Landing Page**: List of brand configurations
- **Navigation**: Sidebar with main sections
- **Configuration Editor**: 8-section form interface
- **Module Center**: Access to 25+ analysis modules

---

## 🛠️ **Development Environment Setup**

### **Essential Tools**

```bash
# Install recommended VS Code extensions
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-json
```

### **Environment Configuration**

**Critical `.env` variables:**

```env
# Database
DATABASE_URL=postgresql://...

# AI Services
OPENAI_API_KEY=sk-...
DATAFORSEO_LOGIN=your-login
DATAFORSEO_PASSWORD=your-password

# External APIs
AHREFS_API_KEY=your-key

# Development
NODE_ENV=development
PORT=5000
```

**Getting API Keys:**
- **OpenAI**: https://platform.openai.com/api-keys
- **DataForSEO**: https://app.dataforseo.com/
- **Ahrefs**: https://ahrefs.com/api

### **Database Setup**

```bash
# Development database (local PostgreSQL)
createdb usercontextrecord_dev

# Run migrations
npm run db:migrate

# Seed with sample data
npm run db:seed
```

---

## 🧠 **Understanding the Core Concepts**

### **1. UCR (User Context Record)**

**Think of this as the "brand's brain"** - a comprehensive profile that tells AI systems everything about the brand.

**Why it matters:**
- **Consistency**: All AI generations use the same brand context
- **Accuracy**: Prevents contradictory content creation
- **Compliance**: CMO-approved boundaries for AI usage

**Real Example:**
```
Brand: "Tesla"
Category: "Electric vehicles, sustainable energy"
Competitors: "Ford, GM, Rivian"
Channel Strategy: "High SEO investment, strong social presence"
```

### **2. Module System**

**Modules are "analysis plugins"** that provide specific intelligence:

**SEO Module Example:**
- **Input**: Brand context + competitor data
- **Process**: AI analysis of search patterns
- **Output**: "Tesla ranks #1 for 'electric cars' but #47 for 'affordable EVs'"

**Why modular:**
- **Independent development**: Teams can build modules separately
- **Consistent execution**: All modules follow same patterns
- **Scalable deployment**: Add new intelligence without touching core code

### **3. Governance & Audit**

**Every decision is tracked** for compliance and improvement:

```typescript
// Every AI generation creates an audit entry
const auditEntry = {
  action: 'ai_content_generation',
  userId: currentUser.id,
  brandId: config.brandId,
  moduleId: 'content_brief',
  timestamp: new Date(),
  approvedByHuman: false, // Requires human review
  metadata: { /* Generation details */ }
}
```

**Business Impact:**
- **CMO Confidence**: Complete visibility into AI usage
- **Compliance**: Audit trail for regulatory requirements
- **Improvement**: Data-driven optimization of AI performance

---

## 🔄 **Daily Development Workflow**

### **Morning Routine (15 minutes)**

```bash
# 1. Pull latest changes
git pull origin main

# 2. Check for new dependencies
npm install

# 3. Run tests to ensure everything works
npm test

# 4. Start development server
npm run dev

# 5. Check for linting errors
npm run lint
```

### **Development Workflow**

#### **Working on a Feature**

```bash
# 1. Create feature branch
git checkout -b feature/new-module

# 2. Make changes following conventions
# (See Best Practices section below)

# 3. Test your changes
npm run test:watch

# 4. Commit with conventional format
git commit -m "feat: add competitor analysis module

- Implements market share calculation
- Adds visualization component
- Updates CONTRACT_REGISTRY"

# 5. Push and create PR
git push origin feature/new-module
```

#### **Code Review Checklist**

- ✅ **TypeScript types** are correct and complete
- ✅ **Component follows** established patterns
- ✅ **Tests pass** and cover new functionality
- ✅ **Documentation updated** if needed
- ✅ **No console.log** statements in production code
- ✅ **Performance** considerations addressed

---

## 🛠️ **Common Development Tasks**

### **Task 1: Add a New UI Component**

**Scenario:** You need to add a new form field component.

**Steps:**
```bash
# 1. Find the right directory
# For base UI components → components/ui/
# For business logic → components/blocks/

# 2. Create the component
touch components/ui/new-field.tsx

# 3. Follow the pattern
export function NewField({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor="field">Field Label</Label>
      <Input
        id="field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
```

**Pro Tips:**
- Use `cn()` utility for conditional classes
- Export types for better IntelliSense
- Follow naming conventions

### **Task 2: Add a New Analysis Module**

**Scenario:** Business wants a new "Social Media Sentiment" module.

**Steps:**
```typescript
// 1. Add to CONTRACT_REGISTRY (shared/module.contract.ts)
"social.sentiment_analysis.v1": {
  name: "Social Media Sentiment",
  description: "Analyze brand sentiment across social platforms",
  contextInjection: {
    requiredSections: ["A", "B"], // Brand + Category
    optionalSections: ["C"] // Competitors
  },
  executionGate: { /* validation rules */ },
  ui: { /* rendering config */ }
}

// 2. Implement in module-runner.ts
case "social.sentiment_analysis.v1":
  resultData = await analyzeSocialSentiment(config, inputs);
  break;

// 3. Create analysis function
async function analyzeSocialSentiment(config: Configuration, inputs: any) {
  // AI analysis logic here
  return {
    sentiment_score: 0.75,
    platforms_analyzed: ["twitter", "facebook", "instagram"],
    key_findings: [...]
  };
}
```

### **Task 3: Fix a TypeScript Error**

**Common Error:** `Property 'X' does not exist on type 'Y'`

**Debug Steps:**
```typescript
// 1. Check the type definition
// Look at shared/schema.ts or component props

// 2. Use TypeScript's error message
// The error tells you exactly what's wrong

// 3. Common fixes:
interface MyComponentProps {
  requiredProp: string;  // Add missing required props
  optionalProp?: number; // Make optional with ?
}

// Or cast types when necessary
const config = data as Configuration;
```

### **Task 4: Add Database Changes**

**Scenario:** New module needs to store results.

**Steps:**
```bash
# 1. Update schema (drizzle.config.ts)
export const moduleResults = table("module_results", {
  id: serial("id").primaryKey(),
  moduleId: varchar("module_id", { length: 100 }).notNull(),
  configId: integer("config_id").references(() => configurations.id),
  results: jsonb("results").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

# 2. Generate migration
npm run db:generate

# 3. Run migration
npm run db:migrate

# 4. Update TypeScript types
npm run db:push
```

---

## 🔧 **Troubleshooting Guide**

### **"Module not found" Error**

**Problem:** `Cannot resolve module 'X'`

**Solutions:**
```bash
# 1. Check if package is installed
npm list | grep package-name

# 2. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 3. Check import path
# Use absolute imports from project root
import { MyComponent } from "@/components/MyComponent";
```

### **Database Connection Issues**

**Problem:** `Can't reach database server`

**Solutions:**
```bash
# 1. Check if PostgreSQL is running
brew services list | grep postgresql

# 2. Verify connection string in .env
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"

# 3. Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### **TypeScript Compilation Errors**

**Problem:** Build fails with TS errors

**Common Fixes:**
```typescript
// 1. Missing type imports
import type { Configuration } from "@shared/schema";

// 2. Incorrect prop types
interface ComponentProps {
  onChange: (value: string) => void; // Not (value: any)
  data?: SomeType; // Optional props
}

// 3. Null/undefined issues
const data = apiResponse?.data ?? defaultValue;
```

### **Module Execution Fails**

**Problem:** Module returns error during execution

**Debug Steps:**
```typescript
// 1. Check UCR completeness
const validation = canModuleExecute(moduleId, availableSections);
console.log("Missing sections:", validation.missingSections);

// 2. Verify CONTRACT_REGISTRY entry
const contract = CONTRACT_REGISTRY[moduleId];
console.log("Contract found:", !!contract);

// 3. Check module implementation
// Look at module-runner.ts case statement
```

---

## 📏 **Best Practices & Conventions**

### **Code Style**

#### **TypeScript Best Practices**

```typescript
// ✅ Good: Explicit types
interface User {
  id: number;
  name: string;
  email: string;
}

function createUser(data: User): Promise<User> {
  // Implementation
}

// ❌ Bad: Implicit any
function createUser(data) { // Error: implicit any
  return fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
```

#### **Component Patterns**

```typescript
// ✅ Good: Controlled components
export function BrandSelector({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select brand" />
      </SelectTrigger>
      <SelectContent>
        {brands.map(brand => (
          <SelectItem key={brand.id} value={brand.id}>
            {brand.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ❌ Bad: Uncontrolled components
export function BrandSelector() {
  const [value, setValue] = useState(""); // No external control
  // Component can't be controlled by parent
}
```

### **File Organization**

#### **Component File Structure**

```typescript
// components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// 1. Types first
export interface ButtonProps extends VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  onClick?: () => void;
}

// 2. Variants configuration
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// 3. Component implementation
export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

### **Git Workflow**

#### **Commit Message Convention**

```bash
# ✅ Good: Descriptive and categorized
feat: add social media sentiment analysis module

- Implements sentiment scoring algorithm
- Adds Twitter, Facebook, Instagram analysis
- Updates CONTRACT_REGISTRY with new module
- Adds visualization component for sentiment trends

fix: resolve TypeScript error in CompetitorSetBlock

- Add missing form prop to CompetitorRow component
- Fix implicit any types in Select onValueChange
- Update component prop interfaces

refactor: simplify module execution logic

- Extract common validation logic to utility function
- Reduce code duplication in module-runner.ts
- Improve error handling consistency
```

#### **Branch Naming**

```bash
# Feature branches
feature/add-sentiment-analysis
feature/improve-ui-performance
feature/add-export-functionality

# Bug fixes
fix/competitor-block-typescript-errors
fix/database-connection-timeout
fix/mobile-navigation-bug

# Refactoring
refactor/simplify-component-props
refactor/extract-common-logic
```

---

## 🆘 **Where to Get Help**

### **Documentation Resources**

1. **This Guide** - Start here for comprehensive overview
2. **SYSTEM_DOCUMENTATION.md** - Technical architecture details
3. **COMPONENT_ARCHITECTURE_DIAGRAM.md** - Visual component relationships
4. **README.md** - Quick setup and basic usage

### **Code Exploration**

**Start with these key files:**
- `client/src/App.tsx` - Main application structure
- `shared/module.contract.ts` - Module definitions
- `server/module-runner.ts` - Module execution logic
- `client/src/pages/module-shell.tsx` - Dynamic module rendering

### **Communication**

**For questions:**
1. **Check existing documentation first** - Most answers are here
2. **Search the codebase** - Use `grep` or VS Code search
3. **Ask in team chat** - For specific implementation questions
4. **Create an issue** - For bugs or feature requests

### **Learning Path**

**Week 1: Getting Comfortable**
- Set up development environment
- Create your first component
- Understand UCR structure
- Run existing modules

**Week 2: Making Changes**
- Fix a small bug
- Add a new UI component
- Modify existing module logic
- Write tests

**Week 3: Building Features**
- Create a new module
- Add database changes
- Implement complex UI flows
- Optimize performance

---

## 🎉 **You're Ready to Contribute!

By now you should have a solid understanding of:

- ✅ **What this platform does** and why it matters
- ✅ **How the architecture works** at a high level
- ✅ **Where to find things** in the codebase
- ✅ **How to make changes** following best practices
- ✅ **How to troubleshoot** common issues

**Remember:** This platform is complex but the architecture is designed to be approachable. Start small, ask questions, and build confidence incrementally.

**Welcome to the team!** Your contributions will help brands make better strategic decisions. 🚀

---

*This guide is living documentation. If you find something unclear or missing, please suggest improvements!*
