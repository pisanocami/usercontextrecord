export interface UserContextRecord {
  id: string; // UUID
  brandId: string;
  version: number;
  hash: string;
  status: 'DRAFT_AI' | 'AI_READY' | 'HUMAN_CONFIRMED' | 'LOCKED' | 'EXPIRED';
  confidence: 'low' | 'medium' | 'high';
  cmoSafe: boolean;
  validUntil: Date;
  data: any; // Full UCR schema
  createdAt: Date;
  updatedAt: Date;
}

export interface UCREditRequest {
  categoryFence?: string[];
  competitors?: string[];
  exclusions?: string[];
  // Add other editable fields as needed
}

export interface UCRValidationResult {
  isValid: boolean;
  status: 'DRAFT_AI' | 'AI_READY' | 'HUMAN_CONFIRMED' | 'LOCKED' | 'EXPIRED';
  violations: string[];
  warnings: string[];
}
