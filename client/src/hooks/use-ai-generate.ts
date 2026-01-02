import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
      const res = await apiRequest("POST", "/api/ai/generate", params);
      return res.json();
    },
    onError: (error) => {
      toast({
        title: "AI Generation failed",
        description: error.message || "Could not generate suggestions",
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
