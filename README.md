# Promptic

A multi-provider AI prompt CLI with optional web search augmentation.

## Features

- **Multiple AI Providers** — OpenAI, Anthropic, Gemini, and Groq
- **Web Search Mode** — Augments prompts with live web results via [Tavily](https://tavily.com)
- **Interactive Setup** — Guided CLI configuration for API keys and provider selection
- **Persistent Config** — API keys stored securely using `conf` (per-project local store)
- **Modular Architecture** — Clean separation between providers, prompts, and integrations

## Install

```bash
npm install -g promptic-cli
```

Or clone and build locally:

```bash
git clone https://github.com/lavizp/promptic.git
cd promptic
npm install
npm run build
```

## Usage

```bash
# Run in normal mode
promptic-cli run

# Run with web search augmentation
promptic-cli run --web

# Configure API provider and keys
promptic-cli config
```

The CLI will walk you through selecting an AI provider and entering your API key. Keys are saved persistently so you only need to do this once.

## Providers

| Provider   | Model                      | Env Key              |
|------------|----------------------------|----------------------|
| OpenAI     | GPT-4o-mini                | `OPENAI_API_KEY`     |
| Anthropic  | Claude 3.5 Haiku           | `ANTHROPIC_API_KEY`  |
| Gemini     | Gemini 2.0 Flash           | `GEMINI_API_KEY`     |
| Groq       | Llama 3.3 70B Versatile    | `GROQ_API_KEY`       |

### Web Mode

When `--web` is passed, Promptic fetches relevant web search results via Tavily before sending your prompt. The AI is then instructed to answer using the retrieved content and cite its sources — producing a structured response with both an answer and a list of source URLs.

## Configuration

API keys are stored in a local persistent store (managed by [`conf`](https://github.com/sindresorhus/conf)). You can reconfigure at any time by running `promptic-cli config`.

## Development

```bash
npm run build      # Compile TypeScript
npm start          # Run with tsx (dev)
npm test           # Run tests
npm run test:watch # Watch mode
```

### Project Structure

```
src/
├── ai/           # Provider implementations (OpenAI, Anthropic, Gemini, Groq)
├── cli/          # CLI flow and orchestration
├── commands/     # Command handlers (config)
├── config/       # EnvStore for persistent API key storage
├── core/         # Question builder, prompt builder, types
├── integrations/ # External service integrations (Tavily)
├── output/       # Output formatters (Markdown)
└── utils/        # Shared utilities (env, questions, logger)
```

## License

[ISC](https://opensource.org/licenses/ISC)
