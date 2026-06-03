export interface GenerateInput {
  prompt: string;
}

export interface GenerateResult {
  content: string;
  model: string;
  provider: string;
}
