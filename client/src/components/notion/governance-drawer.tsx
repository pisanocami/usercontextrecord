import { useState } from "react";
import { Shield, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { GovernanceRail } from "./governance-rail";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SectionApprovals, Governance } from "@shared/schema";

interface GovernanceDrawerProps {
  governance: Governance;
  sectionApprovals?: SectionApprovals;
  configurationId?: number;
  onLockContext?: () => void;
  isLocking?: boolean;
  canLock?: boolean;
}

export function GovernanceDrawer({
  governance,
  sectionApprovals,
  configurationId,
  onLockContext,
  isLocking,
  canLock,
}: GovernanceDrawerProps) {
  const [open, setOpen] = useState(false);
  
  const approvals = sectionApprovals || governance.section_approvals;
  const approvedCount = approvals
    ? Object.values(approvals).filter((a) => a?.status === "approved").length
    : 0;
  const totalSections = 7;
  const qualityScore = governance.quality_score?.overall ?? 0;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          className="fixed bottom-20 right-4 z-40 gap-2 rounded-full shadow-lg mobile-only"
          data-testid="button-open-governance"
        >
          <Shield className="h-4 w-4" />
          <span className="text-sm font-medium">{approvedCount}/{totalSections}</span>
          <Badge
            variant="secondary"
            className={cn(
              "text-xs",
              qualityScore >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
              qualityScore >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" :
              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            )}
          >
            {qualityScore}%
          </Badge>
          <ChevronUp className="h-4 w-4" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Governance Status
          </DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-8">
          <GovernanceRail
            governance={governance}
            sectionApprovals={sectionApprovals}
            configurationId={configurationId}
            onLockContext={onLockContext}
            isLocking={isLocking}
            canLock={canLock}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
