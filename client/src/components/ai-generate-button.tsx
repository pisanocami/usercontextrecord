import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface AIGenerateButtonProps {
  onClick: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export function AIGenerateButton({ onClick, isGenerating, disabled }: AIGenerateButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled || isGenerating}
      className="gap-2"
      data-testid="button-ai-generate"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Generate with AI
        </>
      )}
    </Button>
  );
}
