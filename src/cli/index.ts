import 'dotenv/config';
import { questions } from '../utils/question.ts';
import { askQuestions } from '../core/questionBuilder.ts';
import { TavilyService } from '../integrations/tavily.ts';
import type { IWebSearchResponse } from '../core/types/webSearch.types.ts';
import { PromptUtils } from '../core/promptBuilder.ts';
import { getAIProvider } from '../ai/index.ts';
import type { AIProviderEnums } from '../ai/types.ts';
import { normalPrompt, webSearchPrompt } from '../ai/prompts/system.ts';
import { renderMarkdownOutput } from '../output/markdown.ts';
export const runAction = async (type: 'normal' | 'web') => {
  console.log(type)
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
  const ai = answers['ai_provider']
  if (!ai) {
    throw new Error("AI Provider not provided")
  }
  const apiProvider = getAIProvider(ai as AIProviderEnums)
  const response = await apiProvider({ prompt: answers['prompt'], systemPrompt: type === 'web' ? webSearchPrompt : normalPrompt })
  console.log(response.content)
  console.log('-----------------------------------------')
  renderMarkdownOutput(response.content)
}
