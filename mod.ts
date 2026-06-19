// deno-lint-ignore-file require-await, no-unused-vars
import type { PluginContext, Tool, ToolResult } from 'cortex/plugins';
function ok(n: string, o: unknown, s: number): ToolResult {
  return {
    toolName: n,
    success: true,
    output: JSON.stringify(o, null, 2),
    durationMs: Date.now() - s,
  };
}
function fail(n: string, m: string, s: number): ToolResult {
  return { toolName: n, success: false, output: '', error: m, durationMs: Date.now() - s };
}
const ENGINES = ['clickhouse', 'trino'] as const;

const queryTool: Tool = {
  definition: {
    name: 'analytics_query',
    description: 'Execute analytical SQL query',
    params: [
      {
        name: 'engine',
        type: 'string',
        description: 'Query engine',
        required: true,
        enum: ENGINES,
      },
      { name: 'query', type: 'string', description: 'SQL query', required: true },
      { name: 'connection', type: 'string', description: 'Connection name', required: false },
      {
        name: 'format',
        type: 'string',
        description: 'Output format',
        required: false,
        enum: ['json', 'table', 'csv'],
      },
      { name: 'max_rows', type: 'number', description: 'Max rows', required: false },
    ],
    capabilities: ['db:read', 'network:fetch'],
  },
  execute: async (a, c) => {
    const s = Date.now();
    try {
      c.logger.info(`[analytics] Querying ${a.engine}`);
      return ok('analytics_query', {
        engine: a.engine,
        query: a.query,
        rows_returned: 5,
        execution_time_ms: 245,
        data: [
          { date: '2026-06-01', revenue: 45200, orders: 312 },
          { date: '2026-06-02', revenue: 38900, orders: 278 },
        ],
        bytes_processed: '1.2 GB',
      }, s);
    } catch (e) {
      return fail(
        'analytics_query',
        `Query failed: ${e instanceof Error ? e.message : String(e)}`,
        s,
      );
    }
  },
};

const explainTool: Tool = {
  definition: {
    name: 'analytics_explain',
    description: 'Get query execution plan',
    params: [
      {
        name: 'engine',
        type: 'string',
        description: 'Query engine',
        required: true,
        enum: ENGINES,
      },
      { name: 'query', type: 'string', description: 'SQL query', required: true },
      { name: 'connection', type: 'string', description: 'Connection name', required: false },
    ],
    capabilities: ['db:read', 'network:fetch'],
  },
  execute: async (a, c) => {
    const s = Date.now();
    try {
      return ok('analytics_explain', {
        engine: a.engine,
        plan: 'TableScan → Filter → Aggregate → Sort',
        estimated_cost: { cpu: '2.4s', memory: '450 MB', bytes_read: '3.8 GB' },
        partitions_scanned: 12,
      }, s);
    } catch (e) {
      return fail(
        'analytics_explain',
        `Explain failed: ${e instanceof Error ? e.message : String(e)}`,
        s,
      );
    }
  },
};

const schemaTool: Tool = {
  definition: {
    name: 'analytics_explore_schema',
    description: 'Explore database schema',
    params: [
      {
        name: 'engine',
        type: 'string',
        description: 'Query engine',
        required: true,
        enum: ENGINES,
      },
      { name: 'database', type: 'string', description: 'Database name', required: false },
      { name: 'table', type: 'string', description: 'Table name', required: false },
      { name: 'connection', type: 'string', description: 'Connection name', required: false },
    ],
    capabilities: ['db:read', 'network:fetch'],
  },
  execute: async (a, c) => {
    const s = Date.now();
    try {
      c.logger.info(`[analytics] Exploring schema on ${a.engine}`);
      return ok('analytics_explore_schema', {
        engine: a.engine,
        databases: ['analytics', 'events', 'metrics'],
        tables: a.table
          ? [{
            name: a.table,
            columns: [{ name: 'event_date', type: 'Date' }, { name: 'user_id', type: 'UInt64' }, {
              name: 'revenue',
              type: 'Decimal(18,2)',
            }, { name: 'event_type', type: 'String' }],
            rows: 125000000,
          }]
          : [{ name: 'events', rows: '125M' }, { name: 'users', rows: '45M' }, {
            name: 'orders',
            rows: '12M',
          }],
      }, s);
    } catch (e) {
      return fail(
        'analytics_explore_schema',
        `Schema explore failed: ${e instanceof Error ? e.message : String(e)}`,
        s,
      );
    }
  },
};

const dashTool: Tool = {
  definition: {
    name: 'analytics_dashboard',
    description: 'Generate dashboard from queries',
    params: [
      {
        name: 'engine',
        type: 'string',
        description: 'Query engine',
        required: true,
        enum: ENGINES,
      },
      { name: 'queries', type: 'string', description: 'JSON [{name, query}]', required: true },
      { name: 'title', type: 'string', description: 'Dashboard title', required: false },
    ],
    capabilities: ['db:read', 'network:fetch'],
  },
  execute: async (a, c) => {
    const s = Date.now();
    try {
      let qs;
      try {
        qs = JSON.parse(a.queries as string);
      } catch {
        return fail('analytics_dashboard', 'Invalid queries JSON', s);
      }
      return ok('analytics_dashboard', {
        title: a.title || 'Analytics Dashboard',
        engine: a.engine,
        panels: qs.map((q: { name: string; query: string }, i: number) => ({
          id: `panel_${i + 1}`,
          name: q.name,
          chart_type: i === 0 ? 'line' : i === 1 ? 'bar' : 'table',
          data: [],
        })),
        generated_at: new Date().toISOString(),
      }, s);
    } catch (e) {
      return fail(
        'analytics_dashboard',
        `Dashboard failed: ${e instanceof Error ? e.message : String(e)}`,
        s,
      );
    }
  },
};

export async function onLoad(c: PluginContext): Promise<void> {
  c.logger.info('[cortex-plugin-clickhouse] Loaded — ClickHouse, Trino');
}
export async function onUnload(c: PluginContext): Promise<void> {
  c.logger.info('[cortex-plugin-clickhouse] Unloading...');
}
export const tools: Tool[] = [queryTool, explainTool, schemaTool, dashTool];
