import 'dotenv/config';
import { questions } from '../utils/question.ts';
import { askQuestions } from '../core/questionBuilder.ts';
import { TavilyService } from '../integrations/tavily.tsx';
import type { IWebSearchResponse } from '../core/types/webSearch.types.ts';
import { PromptUtils } from '../core/promptBuilder.ts';
export const runAction = async (type: 'normal' | 'web') => {
  const answers = await askQuestions(questions)
  if (!answers['prompt']) {
    throw new Error('Prompt is required')
  }
  let finalPrompt = answers['prompt']
  if (type == 'web') {
    const tavilyService = new TavilyService()
    const webSearchResponse: IWebSearchResponse[] = (
      await tavilyService.search(answers['prompt'])
    ).results
    finalPrompt = PromptUtils.generatePromptForWebSearch({
      userQuery: answers['prompt'],
      sources: webSearchResponse,
    })
  }
  console.log(finalPrompt)
}
