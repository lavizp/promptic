import type { EnvStore } from "../config/envConfig/envStore.ts";

type AIProvider = 'open_ai' | 'anthropic' | 'gemini' | 'groq';

type Answers = {
  ai_provider?: AIProvider;
} & Partial<Record<`${AIProvider}_api_key`, string>>;

type Context = {
  answers: Answers;
  env: EnvStore
};

export type Choice = {
  name: string;
  value: string;
  description?: string;
  disabled?: boolean | string
};
export type QuestionCallback = {
  value: string
}
export type Question =
  | {
    key: keyof Answers | string;
    type: 'input';
    question: string;
    when?: (ctx: Context) => boolean;
    then?: ({ value }: QuestionCallback) => void
  }
  | {
    key: keyof Answers | string;
    type: 'select';
    question: string;
    choices: Choice[];
    when?: (ctx: Context) => boolean;
    then?: ({ value }: QuestionCallback) => void
  };
