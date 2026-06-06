import type { IWebSearchResponse } from "./types/webSearch.types.ts";

interface IFinalPromptInput {
  userQuery: string,
  sources: IWebSearchResponse[]
}
export class PromptUtils {
  public static generatePromptForWebSearch({ userQuery, sources }: IFinalPromptInput): string {
    const finalUserContent = `
      User Question: ${userQuery}

      <search_results>
      ${JSON.stringify(sources, null, 2)}
      </search_results>
      `.trim();
    return finalUserContent
  }

}

