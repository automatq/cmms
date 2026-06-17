/**
 * Pure helpers for data-grounded AI answers. The flow is provider-agnostic
 * (works on Anthropic/Bedrock/Ollama without native tool-use): a cheap
 * classifier call picks which tenant data sources a question needs, the
 * service fetches them, and the answer call gets the data injected as context.
 */

export interface GroundingTool {
  name: string;
  description: string;
}

export const GROUNDING_TOOLS: GroundingTool[] = [
  { name: 'open_work_orders', description: 'Currently open / in-progress / on-hold work orders' },
  { name: 'overdue_work_orders', description: 'Work orders past their due or scheduled-end date' },
  { name: 'recent_completions', description: 'Work orders completed in the last 30 days, with costs and hours' },
  { name: 'asset_summary', description: 'Asset counts by status and critical-asset list' },
  { name: 'asset_downtime', description: 'Assets with the most downtime in the last 90 days' },
  { name: 'pm_status', description: 'Preventive-maintenance compliance: on-time/late/skipped history and overdue PM plans' },
  { name: 'low_stock_parts', description: 'Inventory parts at or below their reorder point' },
];

const VALID_TOOL_NAMES = new Set(GROUNDING_TOOLS.map((t) => t.name));

export function buildClassifierPrompt(question: string): string {
  const catalog = GROUNDING_TOOLS.map((t) => `- ${t.name}: ${t.description}`).join('\n');
  return `A user asked a maintenance-management assistant:
"${question}"

Which of these live data sources (if any) are needed to answer from the organization's real records?
${catalog}

Respond with ONLY a JSON array of source names, e.g. ["open_work_orders"]. Use [] if the question is generic advice/how-to and needs no live data. Pick at most 3.`;
}

/**
 * Tolerant extraction of the classifier's tool selection: finds the first JSON
 * array in the response, parses it, and filters to known tool names. Any
 * failure returns [] (answer proceeds ungrounded rather than erroring).
 */
export function parseToolSelection(raw: string, maxTools = 3): string[] {
  if (!raw) return [];
  const start = raw.indexOf('[');
  const end = raw.indexOf(']', start);
  if (start === -1 || end === -1) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return [...new Set(parsed.filter((t): t is string => typeof t === 'string' && VALID_TOOL_NAMES.has(t)))].slice(
    0,
    maxTools,
  );
}
