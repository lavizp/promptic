import type { Question } from "../core/types.js";

export const questions: Question[] = [
  {
    key: 'ai_provider',
    question: 'Choose Your API Provider',
    type: 'select',
    choices: [
      {
        name: 'Open AI',
        value: 'open_ai',
        description: 'Open AI',
      },
      {
        name: 'Anthropic',
        value: 'anthropic',
        description: 'Anthropic',
      },
      {
        name: 'Gemini',
        value: 'gemini',
        description: 'Gemini',
      },
      {
        name: 'Groq',
        value: 'groq',
        description: 'Groq',
      },
    ]
  },
  {
    key: 'open_ai_api_key',
    type: 'input',
    question: 'Please Enter Your Open AI API Key',
    when: ({ answers, env }) => answers.ai_provider === 'open_ai' && !env.has('OPENAI_API_KEY')
  },
  {
    key: 'anthropic_api_key',
    type: 'input',
    question: 'Please Enter Your Anthropic API Key',
    when: ({ answers, env }) => answers.ai_provider === 'anthropic' && !env.has('ANTHROPIC_API_KEY')
  },
  {
    key: 'gemini_api_key',
    type: 'input',
    question: 'Please Enter Your Gemini API Key',
    when: ({ answers, env }) => answers.ai_provider === 'gemini' && !env.has('GEMINI_API_KEY')
  },
  {
    key: 'groq_api_key',
    type: 'input',
    question: 'Please Enter Your Groq API Key',
    when: ({ answers, env }) => answers.ai_provider === 'groq' && !env.has('GROQ_API_KEY')
  },
  {
    key: 'prompt',
    type: 'input',
    question: 'Please Enter Your Prompt',
  }
];
