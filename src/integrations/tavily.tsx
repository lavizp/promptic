
import type { TavilyClient } from "@tavily/core"
import { tavily } from "@tavily/core"
export class TavilyService {
  private client: TavilyClient

  constructor() {
    this.client = tavily({ apiKey: process.env.TAVILY_API_KEY! })
  }
  public async search(
    query: string,
    searchDepth: "basic" | "advanced" = "advanced"
  ) {
    return this.client.search(query, {
      searchDepth
    })
  }
}
