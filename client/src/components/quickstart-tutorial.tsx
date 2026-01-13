import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Building2,
  Search,
  TrendingUp,
  FileText,
  Download,
  X,
  Rocket,
  BrainCircuit,
} from "lucide-react";

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: typeof Sparkles;
  content: React.ReactNode;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: "Welcome to Brand Intelligence",
    description: "Your AI-powered brand context operating system",
    icon: Rocket,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Brand Intelligence helps you create AI-generated brand contexts and run powerful market analysis reports.
        </p>
        <div className="grid gap-3 mt-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <BrainCircuit className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">AI-Powered Context Creation</p>
              <p className="text-xs text-muted-foreground">Generate comprehensive brand contexts with AI assistance</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Search className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Keyword Gap Analysis</p>
              <p className="text-xs text-muted-foreground">Discover SEO opportunities your competitors are missing</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <TrendingUp className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Market Demand Analysis</p>
              <p className="text-xs text-muted-foreground">Understand market trends and demand signals</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: "Step 1: Create a Brand Context",
    description: "Set up your brand with AI assistance",
    icon: Building2,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Start by creating a brand context. This is the foundation for all your analysis.
        </p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0">1</div>
            <div>
              <p className="font-medium text-sm">Go to "New Context" in the sidebar</p>
              <p className="text-xs text-muted-foreground">Click the "New Context" menu item to start</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0">2</div>
            <div>
              <p className="font-medium text-sm">Enter your brand's domain</p>
              <p className="text-xs text-muted-foreground">Provide the website URL (e.g., nike.com)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0">3</div>
            <div>
              <p className="font-medium text-sm">Let AI generate your context</p>
              <p className="text-xs text-muted-foreground">The AI will analyze the brand and suggest categories, competitors, and more</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0">4</div>
            <div>
              <p className="font-medium text-sm">Review and save</p>
              <p className="text-xs text-muted-foreground">Review the AI-generated content and save your context</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: "Step 2: Run an Analysis Report",
    description: "Execute Keyword Gap or Market Demand analysis",
    icon: Search,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Once your context is ready, you can run analysis reports.
        </p>
        <div className="grid gap-4">
          <div className="p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">Keyword Gap Analysis</span>
              <Badge variant="secondary" className="text-xs">Functional</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Compares your brand against competitors to find keyword opportunities you're missing. Uses SEO data to identify gaps in your content strategy.
            </p>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="font-medium text-sm">Market Demand Analysis</span>
              <Badge variant="secondary" className="text-xs">Functional</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Analyzes market demand signals and trends to help you understand consumer interest in your category.
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Navigate to either module from the "Analysis" section in the sidebar and select your context to run a report.
        </p>
      </div>
    ),
  },
  {
    id: 4,
    title: "Step 3: View Existing Reports",
    description: "Access and review your saved analyses",
    icon: FileText,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          All your analysis reports are saved and can be accessed anytime.
        </p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">My Contexts</p>
              <p className="text-xs text-muted-foreground">View all your brand contexts from the "My Contexts" page</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Keyword Gap History</p>
              <p className="text-xs text-muted-foreground">Access previous Keyword Gap analyses from the Keyword Gap module</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Version History</p>
              <p className="text-xs text-muted-foreground">Track changes to your contexts over time</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 5,
    title: "Step 4: Download & Analyze Results",
    description: "Export your data for further analysis",
    icon: Download,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Export your analysis results for presentations, reporting, or further analysis.
        </p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30 shrink-0">
              <Download className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Excel/CSV Export</p>
              <p className="text-xs text-muted-foreground">Download Keyword Gap results as XLSX or CSV files for spreadsheet analysis</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 shrink-0">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-sm">One-Pager View</p>
              <p className="text-xs text-muted-foreground">Generate a summary view of your context for quick reference</p>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm font-medium text-primary">You're all set!</p>
          <p className="text-xs text-muted-foreground mt-1">
            Start by creating your first brand context, then run an analysis to discover insights.
          </p>
        </div>
      </div>
    ),
  },
];

const LOCALSTORAGE_KEY = "brand-intelligence-tutorial-completed";

interface QuickstartTutorialProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function QuickstartTutorial({ forceOpen, onClose }: QuickstartTutorialProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (forceOpen !== undefined) {
      setOpen(forceOpen);
      return;
    }
    
    const hasCompleted = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!hasCompleted) {
      setOpen(true);
    }
  }, [forceOpen]);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const handleSkip = () => {
    localStorage.setItem(LOCALSTORAGE_KEY, "true");
    handleClose();
  };

  const handleComplete = () => {
    localStorage.setItem(LOCALSTORAGE_KEY, "true");
    handleClose();
  };

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = TUTORIAL_STEPS[currentStep];
  const StepIcon = step.icon;
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg" data-testid="dialog-quickstart-tutorial">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <StepIcon className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-lg">{step.title}</DialogTitle>
                <DialogDescription className="text-sm">
                  {step.description}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="shrink-0"
              data-testid="button-close-tutorial"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="my-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Step {currentStep + 1} of {TUTORIAL_STEPS.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        <div className="min-h-[280px]">
          {step.content}
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                data-testid="button-previous-step"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isLastStep && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                data-testid="button-skip-tutorial"
              >
                Skip tutorial
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
              data-testid="button-next-step"
            >
              {isLastStep ? (
                <>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useResetTutorial() {
  return () => {
    localStorage.removeItem(LOCALSTORAGE_KEY);
    window.location.reload();
  };
}
