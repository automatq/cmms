# AI Assistant

The assistant answers questions about your maintenance data and gives context-aware help
on asset and work-order pages. It never writes data; it reads what the signed-in user can
read.

## Providers

| Provider | Configure | When to use |
|---|---|---|
| Anthropic (Claude) | `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL` | simplest hosted option; auto-selected when the key is present |
| AWS Bedrock | `AI_PROVIDER=bedrock`, `AWS_REGION` and AWS credentials | keep traffic inside your AWS account |
| Ollama | `AI_PROVIDER=ollama`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | fully self-hosted; `docker compose --profile ai` runs it locally |

`AI_PROVIDER` wins when set. With nothing configured the UI explains the assistant is
off and `GET /api/v1/ai/health` reports it.

## Capabilities

| Endpoint | Used by |
|---|---|
| `POST /ai/query` | the chat page: natural-language questions over assets, work orders, PM, inventory and reports |
| `POST /ai/chat` | multi-turn follow-ups with conversation context |
| `POST /ai/summarize-wo` | "Summarise" on a work order: status, history, comments, parts, next steps |
| `POST /ai/troubleshoot` | troubleshooting steps for a reported problem on a given asset |
| `POST /ai/maintenance-recommendation` | suggested PM intervals and tasks from an asset's history |
| `POST /ai/predict-failure` | risk assessment from downtime, condition logs and meter trends |

Each call is scoped to the active organization. Prompts include only the records needed
for the question. Responses are advisory; nothing is changed without a person clicking.
