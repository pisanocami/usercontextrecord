import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface GenerateParams {
  section: string;
  context?: Record<string, unknown>;
  currentData?: Record<string, unknown>;
}

interface GenerateResponse {
  suggestions: Record<string, unknown>;
  model_suggested: boolean;
}

export function useAIGenerate() {
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (params: GenerateParams): Promise<GenerateResponse> => {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `API error: ${res.status}`);
      }
      
      return res.json();
    },
    onError: (error: Error) => {
      toast({
        title: "AI Generation failed",
        description: error?.message || "Could not generate suggestions",
        variant: "destructive",
      });
    },
  });

  return {
    generate: mutation.mutate,
    generateAsync: mutation.mutateAsync,
    isGenerating: mutation.isPending,
    suggestions: mutation.data?.suggestions,
    error: mutation.error,
    reset: mutation.reset,
  };
}
