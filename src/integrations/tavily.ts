
import type { TavilyClient } from "@tavily/core"
import { tavily } from "@tavily/core"
import { envStore } from "../config/envConfig/envConfig.ts"
export class TavilyService {
  private client: TavilyClient

  constructor() {
    const apiKey = envStore.get("TAVILY_API_KEY")
    if (!apiKey) throw new Error("TAVILY_API_KEY not found in env store")
    this.client = tavily({ apiKey })
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
