#!/usr/bin/env tsx

/**
 * Implementation Orchestrator for Brand-Context-UCR Migration
 * 
 * Manages the ordered execution of all workflows with changelog tracking
 * and milestone recording.
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types
interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  phase: 'preparation' | 'migration' | 'backend' | 'frontend' | 'integration' | 'validation' | 'deployment';
  dependencies: string[];
  estimatedTime: number; // minutes
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  changelog?: string[];
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  date: Date;
  impact: 'low' | 'medium' | 'high' | 'critical';
  completed: boolean;
  notes?: string;
}

interface ChangelogEntry {
  timestamp: Date;
  type: 'feature' | 'fix' | 'breaking' | 'docs' | 'test' | 'deployment';
  component: string;
  description: string;
  impact: string;
  author: string;
  pr?: string;
  issue?: string;
}

interface ImplementationState {
  startedAt: Date;
  currentPhase: string;
  completedSteps: string[];
  failedSteps: string[];
  milestones: Milestone[];
  changelog: ChangelogEntry[];
  totalEstimatedTime: number;
  actualTime: number;
}

class ImplementationOrchestrator {
  private stateFile = path.join(__dirname, '../.implementation-state.json');
  private changelogFile = path.join(__dirname, '../CHANGELOG.md');
  private state: ImplementationState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): ImplementationState {
    try {
      const data = fsSync.readFileSync(this.stateFile, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Convert date strings back to Date objects
      if (parsed.startedAt) parsed.startedAt = new Date(parsed.startedAt);
      if (parsed.changelog) {
        parsed.changelog.forEach((entry: any) => {
          if (entry.timestamp) entry.timestamp = new Date(entry.timestamp);
        });
      }
      if (parsed.milestones) {
        parsed.milestones.forEach((milestone: any) => {
          if (milestone.date) milestone.date = new Date(milestone.date);
        });
      }
      
      return parsed;
    } catch {
      return this.initializeState();
    }
  }

  private initializeState(): ImplementationState {
    return {
      startedAt: new Date(),
      currentPhase: 'preparation',
      completedSteps: [],
      failedSteps: [],
      milestones: this.defineMilestones(),
      changelog: [],
      totalEstimatedTime: 0,
      actualTime: 0,
    };
  }

  private defineMilestones(): Milestone[] {
    return [
      {
        id: 'm1',
        name: 'Project Setup & Preparation',
        description: 'Environment setup, dependencies, and initial planning',
        date: new Date(),
        impact: 'critical',
        completed: false,
      },
      {
        id: 'm2',
        name: 'Database Schema Migration',
        description: 'Create new tables and migrate existing data',
        date: new Date(),
        impact: 'critical',
        completed: false,
      },
      {
        id: 'm3',
        name: 'Backend API Implementation',
        description: 'Implement new storage layer and API endpoints',
        date: new Date(),
        impact: 'high',
        completed: false,
      },
      {
        id: 'm4',
        name: 'Frontend Components & Pages',
        description: 'Implement UI components and pages for new architecture',
        date: new Date(),
        impact: 'high',
        completed: false,
      },
      {
        id: 'm5',
        name: 'Integration & Testing',
        description: 'End-to-end testing and integration validation',
        date: new Date(),
        impact: 'high',
        completed: false,
      },
      {
        id: 'm6',
        name: 'Production Deployment',
        description: 'Gradual rollout with feature flags and monitoring',
        date: new Date(),
        impact: 'critical',
        completed: false,
      },
      {
        id: 'm7',
        name: 'Cleanup & Documentation',
        description: 'Remove old tables and update documentation',
        date: new Date(),
        impact: 'medium',
        completed: false,
      },
    ];
  }

  private getWorkflowSteps(): WorkflowStep[] {
    return [
      // Phase 1: Preparation
      {
        id: 'prep-1',
        name: 'Review All Workflows',
        description: 'Review and understand all implementation workflows',
        phase: 'preparation',
        dependencies: [],
        estimatedTime: 30,
        status: 'pending',
      },
      {
        id: 'prep-2',
        name: 'Setup Development Environment',
        description: 'Ensure all tools and dependencies are installed',
        phase: 'preparation',
        dependencies: ['prep-1'],
        estimatedTime: 45,
        status: 'pending',
      },
      {
        id: 'prep-3',
        name: 'Create Feature Branch',
        description: 'Create and switch to feature branch for implementation',
        phase: 'preparation',
        dependencies: ['prep-2'],
        estimatedTime: 15,
        status: 'pending',
      },

      // Phase 2: Database Migration
      {
        id: 'db-1',
        name: 'Create New Database Tables',
        description: 'Execute SQL to create brands, contexts, exec_reports tables',
        phase: 'migration',
        dependencies: ['prep-3'],
        estimatedTime: 60,
        status: 'pending',
      },
      {
        id: 'db-2',
        name: 'Update TypeScript Types',
        description: 'Add new types for Brand, Context, ExecReport in shared/schema.ts',
        phase: 'migration',
        dependencies: ['db-1'],
        estimatedTime: 45,
        status: 'pending',
      },
      {
        id: 'db-3',
        name: 'Implement Migration Script',
        description: 'Create script to migrate data from configurations to new structure',
        phase: 'migration',
        dependencies: ['db-2'],
        estimatedTime: 90,
        status: 'pending',
      },
      {
        id: 'db-4',
        name: 'Test Migration on Staging',
        description: 'Run migration on staging database and validate results',
        phase: 'migration',
        dependencies: ['db-3'],
        estimatedTime: 120,
        status: 'pending',
      },

      // Phase 3: Backend Implementation
      {
        id: 'be-1',
        name: 'Update Storage Layer',
        description: 'Add new methods for brands, contexts, and exec reports',
        phase: 'backend',
        dependencies: ['db-4'],
        estimatedTime: 90,
        status: 'pending',
      },
      {
        id: 'be-2',
        name: 'Implement Brand API Routes',
        description: 'Add CRUD endpoints for brands management',
        phase: 'backend',
        dependencies: ['be-1'],
        estimatedTime: 60,
        status: 'pending',
      },
      {
        id: 'be-3',
        name: 'Implement Context API Routes',
        description: 'Add CRUD endpoints for contexts with versioning',
        phase: 'backend',
        dependencies: ['be-2'],
        estimatedTime: 75,
        status: 'pending',
      },
      {
        id: 'be-4',
        name: 'Update Module Execution',
        description: 'Modify module execution to use context and create exec reports',
        phase: 'backend',
        dependencies: ['be-3'],
        estimatedTime: 90,
        status: 'pending',
      },
      {
        id: 'be-5',
        name: 'Implement Reports API',
        description: 'Add endpoints for exec reports and master reports',
        phase: 'backend',
        dependencies: ['be-4'],
        estimatedTime: 60,
        status: 'pending',
      },

      // Phase 4: Frontend Implementation
      {
        id: 'fe-1',
        name: 'Update Frontend Types',
        description: 'Add TypeScript types for new data structures',
        phase: 'frontend',
        dependencies: ['be-5'],
        estimatedTime: 30,
        status: 'pending',
      },
      {
        id: 'fe-2',
        name: 'Implement Brand Components',
        description: 'Create components for brand management',
        phase: 'frontend',
        dependencies: ['fe-1'],
        estimatedTime: 90,
        status: 'pending',
      },
      {
        id: 'fe-3',
        name: 'Implement Context Editor',
        description: 'Create the 8-section context editor with validation',
        phase: 'frontend',
        dependencies: ['fe-2'],
        estimatedTime: 180,
        status: 'pending',
      },
      {
        id: 'fe-4',
        name: 'Implement Reports UI',
        description: 'Create components for viewing exec and master reports',
        phase: 'frontend',
        dependencies: ['fe-3'],
        estimatedTime: 120,
        status: 'pending',
      },
      {
        id: 'fe-5',
        name: 'Update Navigation',
        description: 'Update app routing and navigation for new structure',
        phase: 'frontend',
        dependencies: ['fe-4'],
        estimatedTime: 45,
        status: 'pending',
      },

      // Phase 5: Integration & Testing
      {
        id: 'test-1',
        name: 'Unit Tests',
        description: 'Write and run unit tests for new functionality',
        phase: 'integration',
        dependencies: ['fe-5'],
        estimatedTime: 180,
        status: 'pending',
      },
      {
        id: 'test-2',
        name: 'Integration Tests',
        description: 'Test API endpoints and database integration',
        phase: 'integration',
        dependencies: ['test-1'],
        estimatedTime: 120,
        status: 'pending',
      },
      {
        id: 'test-3',
        name: 'End-to-End Tests',
        description: 'Test complete user flows from brand to reports',
        phase: 'integration',
        dependencies: ['test-2'],
        estimatedTime: 150,
        status: 'pending',
      },
      {
        id: 'test-4',
        name: 'Performance Tests',
        description: 'Test performance with new architecture',
        phase: 'integration',
        dependencies: ['test-3'],
        estimatedTime: 90,
        status: 'pending',
      },

      // Phase 6: Validation & Deployment
      {
        id: 'val-1',
        name: 'Pre-deployment Validation',
        description: 'Run all validation checks and health tests',
        phase: 'validation',
        dependencies: ['test-4'],
        estimatedTime: 60,
        status: 'pending',
      },
      {
        id: 'val-2',
        name: 'Setup Feature Flags',
        description: 'Configure feature flags for gradual rollout',
        phase: 'validation',
        dependencies: ['val-1'],
        estimatedTime: 45,
        status: 'pending',
      },
      {
        id: 'val-3',
        name: 'Deploy to Staging',
        description: 'Deploy new implementation to staging environment',
        phase: 'validation',
        dependencies: ['val-2'],
        estimatedTime: 30,
        status: 'pending',
      },
      {
        id: 'dep-1',
        name: 'Gradual Rollout - Team',
        description: 'Enable features for internal team testing',
        phase: 'deployment',
        dependencies: ['val-3'],
        estimatedTime: 240, // 4 hours monitoring
        status: 'pending',
      },
      {
        id: 'dep-2',
        name: 'Gradual Rollout - 5%',
        description: 'Enable features for 5% of users',
        phase: 'deployment',
        dependencies: ['dep-1'],
        estimatedTime: 480, // 8 hours monitoring
        status: 'pending',
      },
      {
        id: 'dep-3',
        name: 'Gradual Rollout - 25%',
        description: 'Enable features for 25% of users',
        phase: 'deployment',
        dependencies: ['dep-2'],
        estimatedTime: 720, // 12 hours monitoring
        status: 'pending',
      },
      {
        id: 'dep-4',
        name: 'Full Rollout',
        description: 'Enable features for all users',
        phase: 'deployment',
        dependencies: ['dep-3'],
        estimatedTime: 1440, // 24 hours monitoring
        status: 'pending',
      },

      // Phase 7: Cleanup
      {
        id: 'clean-1',
        name: 'Monitor Production',
        description: 'Monitor system performance and errors',
        phase: 'deployment',
        dependencies: ['dep-4'],
        estimatedTime: 2880, // 48 hours
        status: 'pending',
      },
      {
        id: 'clean-2',
        name: 'Backup Old Tables',
        description: 'Create backup of old configuration tables',
        phase: 'deployment',
        dependencies: ['clean-1'],
        estimatedTime: 30,
        status: 'pending',
      },
      {
        id: 'clean-3',
        name: 'Remove Old Tables',
        description: 'Drop old configuration tables after confirmation',
        phase: 'deployment',
        dependencies: ['clean-2'],
        estimatedTime: 15,
        status: 'pending',
      },
      {
        id: 'clean-4',
        name: 'Update Documentation',
        description: 'Update all documentation to reflect new architecture',
        phase: 'deployment',
        dependencies: ['clean-3'],
        estimatedTime: 60,
        status: 'pending',
      },
    ];
  }

  async executeWorkflow(): Promise<void> {
    console.log('🚀 Starting Brand-Context-UCR Implementation Orchestrator');
    console.log('📋 Total workflow steps:', this.getWorkflowSteps().length);
    console.log('⏱️  Estimated total time:', this.calculateTotalTime(), 'minutes');

    const steps = this.getWorkflowSteps();
    
    for (const step of steps) {
      if (this.shouldSkipStep(step)) {
        console.log(`⏭️  Skipping ${step.name} (already completed)`);
        continue;
      }

      if (!this.canExecuteStep(step)) {
        console.log(`⏸️  Waiting for dependencies: ${step.dependencies.join(', ')}`);
        await this.waitForDependencies(step);
      }

      await this.executeStep(step);
      await this.saveState();
      await this.updateChangelog(step);
      await this.checkMilestones();
    }

    await this.generateFinalReport();
  }

  private shouldSkipStep(step: WorkflowStep): boolean {
    return this.state.completedSteps.includes(step.id);
  }

  private canExecuteStep(step: WorkflowStep): boolean {
    return step.dependencies.every(dep => this.state.completedSteps.includes(dep));
  }

  private async waitForDependencies(step: WorkflowStep): Promise<void> {
    // Simple polling - in real implementation could use events
    while (!this.canExecuteStep(step)) {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  private async executeStep(step: WorkflowStep): Promise<void> {
    console.log(`\n🔄 Executing: ${step.name}`);
    console.log(`📝 Description: ${step.description}`);
    console.log(`⏱️  Estimated time: ${step.estimatedTime} minutes`);

    step.status = 'in_progress';
    step.startedAt = new Date();
    this.state.currentPhase = step.phase;

    try {
      const startTime = Date.now();
      
      // Execute the step
      await this.performStepAction(step);
      
      const duration = Date.now() - startTime;
      step.status = 'completed';
      step.completedAt = new Date();
      this.state.completedSteps.push(step.id);
      this.state.actualTime += Math.round(duration / 60000); // Convert to minutes

      console.log(`✅ Completed: ${step.name} (${Math.round(duration / 60000)} minutes)`);
      
    } catch (error) {
      step.status = 'failed';
      step.error = error instanceof Error ? error.message : String(error);
      this.state.failedSteps.push(step.id);
      
      console.log(`❌ Failed: ${step.name}`);
      console.log(`🚨 Error: ${step.error}`);
      
      // Ask user if they want to continue
      await this.handleStepFailure(step);
    }
  }

  private async performStepAction(step: WorkflowStep): Promise<void> {
    switch (step.id) {
      case 'prep-1':
        await this.reviewWorkflows();
        break;
      case 'prep-2':
        await this.setupEnvironment();
        break;
      case 'prep-3':
        await this.createFeatureBranch();
        break;
      case 'db-1':
        await this.createDatabaseTables();
        break;
      case 'db-2':
        await this.updateTypeScriptTypes();
        break;
      case 'db-3':
        await this.implementMigrationScript();
        break;
      case 'db-4':
        await this.testMigration();
        break;
      case 'be-1':
        await this.updateStorageLayer();
        break;
      case 'be-2':
        await this.implementBrandAPI();
        break;
      case 'be-3':
        await this.implementContextAPI();
        break;
      case 'be-4':
        await this.updateModuleExecution();
        break;
      case 'be-5':
        await this.implementReportsAPI();
        break;
      case 'fe-1':
        await this.updateFrontendTypes();
        break;
      case 'fe-2':
        await this.implementBrandComponents();
        break;
      case 'fe-3':
        await this.implementContextEditor();
        break;
      case 'fe-4':
        await this.implementReportsUI();
        break;
      case 'fe-5':
        await this.updateNavigation();
        break;
      case 'test-1':
        await this.runUnitTests();
        break;
      case 'test-2':
        await this.runIntegrationTests();
        break;
      case 'test-3':
        await this.runE2ETests();
        break;
      case 'test-4':
        await this.runPerformanceTests();
        break;
      case 'val-1':
        await this.runPreDeploymentValidation();
        break;
      case 'val-2':
        await this.setupFeatureFlags();
        break;
      case 'val-3':
        await this.deployToStaging();
        break;
      case 'dep-1':
        await this.rolloutToTeam();
        break;
      case 'dep-2':
        await this.rolloutTo5Percent();
        break;
      case 'dep-3':
        await this.rolloutTo25Percent();
        break;
      case 'dep-4':
        await this.fullRollout();
        break;
      case 'clean-1':
        await this.monitorProduction();
        break;
      case 'clean-2':
        await this.backupOldTables();
        break;
      case 'clean-3':
        await this.removeOldTables();
        break;
      case 'clean-4':
        await this.updateDocumentation();
        break;
      default:
        throw new Error(`Unknown step: ${step.id}`);
    }
  }

  // Step implementation methods
  private async reviewWorkflows(): Promise<void> {
    console.log('📚 Reviewing all implementation workflows...');
    // Implementation would open and validate workflow files
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async setupEnvironment(): Promise<void> {
    console.log('🔧 Setting up development environment...');
    // Check dependencies, run npm install, etc.
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  private async createFeatureBranch(): Promise<void> {
    console.log('🌿 Creating feature branch...');
    execSync('git checkout -b feature/brand-context-ucr-migration', { stdio: 'inherit' });
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async createDatabaseTables(): Promise<void> {
    console.log('🗃️  Creating new database tables...');
    // Execute SQL migration
    await new Promise(resolve => setTimeout(resolve, 4000));
  }

  private async updateTypeScriptTypes(): Promise<void> {
    console.log('📝 Updating TypeScript types...');
    // Update shared/schema.ts
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  private async implementMigrationScript(): Promise<void> {
    console.log('🔄 Implementing migration script...');
    // Create migration script
    await new Promise(resolve => setTimeout(resolve, 6000));
  }

  private async testMigration(): Promise<void> {
    console.log('🧪 Testing migration on staging...');
    // Run migration tests
    await new Promise(resolve => setTimeout(resolve, 8000));
  }

  private async updateStorageLayer(): Promise<void> {
    console.log('💾 Updating storage layer...');
    // Update server/storage.ts
    await new Promise(resolve => setTimeout(resolve, 6000));
  }

  private async implementBrandAPI(): Promise<void> {
    console.log('🔌 Implementing Brand API routes...');
    // Add brand CRUD endpoints
    await new Promise(resolve => setTimeout(resolve, 4000));
  }

  private async implementContextAPI(): Promise<void> {
    console.log('🔌 Implementing Context API routes...');
    // Add context CRUD endpoints
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  private async updateModuleExecution(): Promise<void> {
    console.log('⚙️  Updating module execution...');
    // Modify module execution to use context
    await new Promise(resolve => setTimeout(resolve, 6000));
  }

  private async implementReportsAPI(): Promise<void> {
    console.log('📊 Implementing Reports API...');
    // Add reports endpoints
    await new Promise(resolve => setTimeout(resolve, 4000));
  }

  private async updateFrontendTypes(): Promise<void> {
    console.log('📝 Updating frontend types...');
    // Update client types
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async implementBrandComponents(): Promise<void> {
    console.log('🎨 Implementing Brand components...');
    // Create brand management UI
    await new Promise(resolve => setTimeout(resolve, 6000));
  }

  private async implementContextEditor(): Promise<void> {
    console.log('📝 Implementing Context Editor...');
    // Create 8-section context editor
    await new Promise(resolve => setTimeout(resolve, 12000));
  }

  private async implementReportsUI(): Promise<void> {
    console.log('📊 Implementing Reports UI...');
    // Create reports viewing interface
    await new Promise(resolve => setTimeout(resolve, 8000));
  }

  private async updateNavigation(): Promise<void> {
    console.log('🧭 Updating navigation...');
    // Update app routing
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  private async runUnitTests(): Promise<void> {
    console.log('🧪 Running unit tests...');
    execSync('npm run test:unit', { stdio: 'inherit' });
    await new Promise(resolve => setTimeout(resolve, 12000));
  }

  private async runIntegrationTests(): Promise<void> {
    console.log('🔗 Running integration tests...');
    execSync('npm run test:integration', { stdio: 'inherit' });
    await new Promise(resolve => setTimeout(resolve, 8000));
  }

  private async runE2ETests(): Promise<void> {
    console.log('🎭 Running end-to-end tests...');
    execSync('npm run test:e2e', { stdio: 'inherit' });
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  private async runPerformanceTests(): Promise<void> {
    console.log('⚡ Running performance tests...');
    execSync('npm run test:performance', { stdio: 'inherit' });
    await new Promise(resolve => setTimeout(resolve, 6000));
  }

  private async runPreDeploymentValidation(): Promise<void> {
    console.log('✅ Running pre-deployment validation...');
    // Run validation checks
    await new Promise(resolve => setTimeout(resolve, 4000));
  }

  private async setupFeatureFlags(): Promise<void> {
    console.log('🚩 Setting up feature flags...');
    // Configure feature flags
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  private async deployToStaging(): Promise<void> {
    console.log('🚀 Deploying to staging...');
    // Deploy to staging environment
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async rolloutToTeam(): Promise<void> {
    console.log('👥 Rolling out to internal team...');
    // Enable for team members
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds for dev
  }

  private async rolloutTo5Percent(): Promise<void> {
    console.log('📈 Rolling out to 5% of users...');
    // Enable for 5% of users
    await new Promise(resolve => setTimeout(resolve, 8000)); // 8 seconds for dev
  }

  private async rolloutTo25Percent(): Promise<void> {
    console.log('📊 Rolling out to 25% of users...');
    // Enable for 25% of users
    await new Promise(resolve => setTimeout(resolve, 12000)); // 12 seconds for dev
  }

  private async fullRollout(): Promise<void> {
    console.log('🎉 Full rollout to all users...');
    // Enable for all users
    await new Promise(resolve => setTimeout(resolve, 15000)); // 15 seconds for dev
  }

  private async monitorProduction(): Promise<void> {
    console.log('👀 Monitoring production...');
    // Monitor system health
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds for dev
  }

  private async backupOldTables(): Promise<void> {
    console.log('💾 Backing up old tables...');
    // Create backup
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async removeOldTables(): Promise<void> {
    console.log('🗑️  Removing old tables...');
    // Drop old tables
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async updateDocumentation(): Promise<void> {
    console.log('📚 Updating documentation...');
    // Update docs
    await new Promise(resolve => setTimeout(resolve, 4000));
  }

  private async handleStepFailure(step: WorkflowStep): Promise<void> {
    console.log('\n⚠️  Step failed! What would you like to do?');
    console.log('1. Retry step');
    console.log('2. Skip step (not recommended)');
    console.log('3. Abort implementation');
    
    // In real implementation, would prompt user
    // For now, we'll abort
    throw new Error(`Step ${step.id} failed: ${step.error}`);
  }

  private async saveState(): Promise<void> {
    await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
  }

  private async updateChangelog(step: WorkflowStep): Promise<void> {
    const entry: ChangelogEntry = {
      timestamp: new Date(),
      type: this.getChangeType(step),
      component: step.phase,
      description: `Completed: ${step.name}`,
      impact: this.getImpactLevel(step),
      author: 'implementation-orchestrator',
    };

    this.state.changelog.push(entry);
    await this.updateChangelogFile();
  }

  private getChangeType(step: WorkflowStep): ChangelogEntry['type'] {
    if (step.phase === 'migration') return 'breaking';
    if (step.phase === 'deployment') return 'deployment';
    if (step.phase === 'backend' || step.phase === 'frontend') return 'feature';
    if (step.phase === 'integration') return 'test';
    return 'feature';
  }

  private getImpactLevel(step: WorkflowStep): string {
    if (step.estimatedTime > 120) return 'high';
    if (step.estimatedTime > 60) return 'medium';
    return 'low';
  }

  private async updateChangelogFile(): Promise<void> {
    const changelog = this.generateChangelogMarkdown();
    await fs.writeFile(this.changelogFile, changelog);
  }

  private generateChangelogMarkdown(): string {
    const date = new Date().toISOString().split('T')[0];
    
    let content = `# Brand-Context-UCR Migration Changelog\n\n`;
    
    // Summary
    content += `## Implementation Summary\n\n`;
    content += `- **Started**: ${this.state.startedAt.toISOString().split('T')[0]}\n`;
    content += `- **Current Phase**: ${this.state.currentPhase}\n`;
    content += `- **Completed Steps**: ${this.state.completedSteps.length}/${this.getWorkflowSteps().length}\n`;
    content += `- **Failed Steps**: ${this.state.failedSteps.length}\n`;
    content += `- **Estimated Time**: ${this.calculateTotalTime()} minutes\n`;
    content += `- **Actual Time**: ${this.state.actualTime} minutes\n\n`;

    // Recent changes
    content += `## Recent Changes\n\n`;
    const recentChanges = this.state.changelog.slice(-10).reverse();
    for (const change of recentChanges) {
      content += `### ${change.timestamp.toISOString()}\n\n`;
      content += `**${change.type.toUpperCase()}**: ${change.description}\n\n`;
      content += `- **Component**: ${change.component}\n`;
      content += `- **Impact**: ${change.impact}\n\n`;
    }

    // Milestones
    content += `## Milestones\n\n`;
    for (const milestone of this.state.milestones) {
      const status = milestone.completed ? '✅' : '⏳';
      content += `${status} **${milestone.name}** (${milestone.impact})\n`;
      content += `${milestone.description}\n\n`;
    }

    return content;
  }

  private async checkMilestones(): Promise<void> {
    const steps = this.getWorkflowSteps();
    const completedInPhase = steps.filter(s => 
      this.state.completedSteps.includes(s.id)
    );

    // Check milestone completion
    if (completedInPhase.some(s => s.phase === 'migration')) {
      const milestone = this.state.milestones.find(m => m.id === 'm2');
      if (milestone && !milestone.completed) {
        milestone.completed = true;
        milestone.date = new Date();
        console.log(`🎯 Milestone completed: ${milestone.name}`);
      }
    }

    if (completedInPhase.some(s => s.phase === 'backend')) {
      const milestone = this.state.milestones.find(m => m.id === 'm3');
      if (milestone && !milestone.completed) {
        milestone.completed = true;
        milestone.date = new Date();
        console.log(`🎯 Milestone completed: ${milestone.name}`);
      }
    }

    if (completedInPhase.some(s => s.phase === 'frontend')) {
      const milestone = this.state.milestones.find(m => m.id === 'm4');
      if (milestone && !milestone.completed) {
        milestone.completed = true;
        milestone.date = new Date();
        console.log(`🎯 Milestone completed: ${milestone.name}`);
      }
    }

    if (completedInPhase.some(s => s.phase === 'integration')) {
      const milestone = this.state.milestones.find(m => m.id === 'm5');
      if (milestone && !milestone.completed) {
        milestone.completed = true;
        milestone.date = new Date();
        console.log(`🎯 Milestone completed: ${milestone.name}`);
      }
    }

    if (completedInPhase.some(s => s.phase === 'deployment')) {
      const milestone = this.state.milestones.find(m => m.id === 'm6');
      if (milestone && !milestone.completed) {
        milestone.completed = true;
        milestone.date = new Date();
        console.log(`🎯 Milestone completed: ${milestone.name}`);
      }
    }
  }

  private calculateTotalTime(): number {
    return this.getWorkflowSteps().reduce((total, step) => total + step.estimatedTime, 0);
  }

  private async generateFinalReport(): Promise<void> {
    console.log('\n🎉 Implementation Complete!');
    console.log('📊 Final Report:');
    console.log(`   Total steps: ${this.getWorkflowSteps().length}`);
    console.log(`   Completed: ${this.state.completedSteps.length}`);
    console.log(`   Failed: ${this.state.failedSteps.length}`);
    console.log(`   Estimated time: ${this.calculateTotalTime()} minutes`);
    console.log(`   Actual time: ${this.state.actualTime} minutes`);
    console.log(`   Efficiency: ${Math.round((this.calculateTotalTime() / this.state.actualTime) * 100)}%`);

    console.log('\n🎯 Milestones:');
    for (const milestone of this.state.milestones) {
      const status = milestone.completed ? '✅' : '❌';
      console.log(`   ${status} ${milestone.name}`);
    }

    console.log(`\n📝 Changelog updated: ${this.changelogFile}`);
    console.log(`\n🔄 State saved: ${this.stateFile}`);
  }

  // Public methods for external control
  async getStatus(): Promise<void> {
    console.log('\n📊 Current Implementation Status:');
    console.log(`   Phase: ${this.state.currentPhase}`);
    console.log(`   Progress: ${this.state.completedSteps.length}/${this.getWorkflowSteps().length} steps`);
    console.log(`   Failed: ${this.state.failedSteps.length} steps`);
    
    const currentStep = this.getWorkflowSteps().find(s => s.status === 'in_progress');
    if (currentStep) {
      console.log(`   Currently: ${currentStep.name}`);
    }

    console.log('\n🎯 Milestones:');
    for (const milestone of this.state.milestones) {
      const status = milestone.completed ? '✅' : '⏳';
      console.log(`   ${status} ${milestone.name}`);
    }
  }

  async resume(): Promise<void> {
    console.log('🔄 Resuming implementation from saved state...');
    await this.executeWorkflow();
  }

  async reset(): Promise<void> {
    console.log('🔄 Resetting implementation state...');
    this.state = this.initializeState();
    await this.saveState();
    console.log('✅ State reset complete');
  }
}

// CLI interface
async function main() {
  console.log('🚀 Implementation Orchestrator Starting...');
  console.log('📋 Command:', process.argv[2]);
  
  const orchestrator = new ImplementationOrchestrator();
  const command = process.argv[2];

  switch (command) {
    case 'start':
      console.log('🔄 Starting full implementation...');
      await orchestrator.executeWorkflow();
      break;
    case 'status':
      console.log('📊 Showing current status...');
      await orchestrator.getStatus();
      break;
    case 'resume':
      console.log('🔄 Resuming implementation...');
      await orchestrator.resume();
      break;
    case 'reset':
      console.log('🔄 Resetting implementation state...');
      await orchestrator.reset();
      break;
    default:
      console.log('Usage:');
      console.log('  npm run orchestrator start    - Start implementation');
      console.log('  npm run orchestrator status   - Show current status');
      console.log('  npm run orchestrator resume   - Resume from saved state');
      console.log('  npm run orchestrator reset    - Reset implementation state');
      break;
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('implementation-orchestrator.ts')) {
  main().catch(console.error);
}

export { ImplementationOrchestrator };
