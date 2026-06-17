import { parseToolSelection, buildClassifierPrompt, GROUNDING_TOOLS } from './ai-grounding.util';

describe('ai-grounding.util', () => {
  describe('parseToolSelection', () => {
    it('parses a plain JSON array of valid tools', () => {
      expect(parseToolSelection('["open_work_orders", "asset_downtime"]')).toEqual([
        'open_work_orders',
        'asset_downtime',
      ]);
    });

    it('extracts the array out of surrounding prose or code fences', () => {
      expect(parseToolSelection('Sure! ```json\n["pm_status"]\n```')).toEqual(['pm_status']);
      expect(parseToolSelection('The sources needed are ["low_stock_parts"].')).toEqual([
        'low_stock_parts',
      ]);
    });

    it('filters out unknown tool names and non-strings', () => {
      expect(parseToolSelection('["open_work_orders", "drop_tables", 42]')).toEqual([
        'open_work_orders',
      ]);
    });

    it('dedupes and caps at maxTools', () => {
      expect(
        parseToolSelection(
          '["open_work_orders","open_work_orders","pm_status","asset_summary","asset_downtime"]',
        ),
      ).toEqual(['open_work_orders', 'pm_status', 'asset_summary']);
    });

    it('returns [] for empty selections, malformed JSON, and non-arrays', () => {
      expect(parseToolSelection('[]')).toEqual([]);
      expect(parseToolSelection('no data needed')).toEqual([]);
      expect(parseToolSelection('["unterminated')).toEqual([]);
      expect(parseToolSelection('{"tools": "open_work_orders"}')).toEqual([]);
      expect(parseToolSelection('')).toEqual([]);
    });
  });

  describe('buildClassifierPrompt', () => {
    it('includes the question and every tool name', () => {
      const prompt = buildClassifierPrompt('which assets had the most downtime?');
      expect(prompt).toContain('which assets had the most downtime?');
      for (const tool of GROUNDING_TOOLS) {
        expect(prompt).toContain(tool.name);
      }
    });
  });
});
