#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

interface CoralogixConfig {
  apiKey: string;
  domain: string;
}

interface QueryMetadata {
  tier?: 'TIER_FREQUENT_SEARCH' | 'TIER_ARCHIVE';
  syntax?: 'QUERY_SYNTAX_DATAPRIME' | 'QUERY_SYNTAX_LUCENE';
  defaultSource?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

interface QueryRequest {
  query: string;
  metadata?: QueryMetadata;
}

// Remove unused interface - this was not being used in the code

// Remove unused interface - this was not being used in the code

class CoralogixMCPServer {
  private server: Server;
  private config: CoralogixConfig | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'coralogix-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_logs',
            description: 'Search Coralogix logs with text queries',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query (supports Lucene syntax)',
                },
                applications: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by specific applications',
                },
                subsystems: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by specific subsystems',
                },
                severities: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by log severities (Debug, Info, Warning, Error, Critical)',
                },
                timeRange: {
                  type: 'string',
                  description: 'Time range (e.g., "1h", "24h", "7d")',
                  default: '1h',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results',
                  default: 100,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'query_logs_dataprime',
            description: 'Execute DataPrime queries on Coralogix logs',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'DataPrime query string',
                },
                timeRange: {
                  type: 'string',
                  description: 'Time range for the query',
                  default: '1h',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_log_aggregations',
            description: 'Get aggregated metrics from logs',
            inputSchema: {
              type: 'object',
              properties: {
                groupBy: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Fields to group by',
                },
                aggregations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['count', 'sum', 'avg', 'min', 'max'] },
                      field: { type: 'string' },
                    },
                  },
                  description: 'Aggregation functions to apply',
                },
                filters: {
                  type: 'object',
                  description: 'Additional filters to apply',
                },
                timeRange: {
                  type: 'string',
                  default: '1h',
                },
              },
              required: ['groupBy'],
            },
          },
          {
            name: 'list_applications',
            description: 'List available applications in Coralogix',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'list_subsystems',
            description: 'List subsystems for specific applications',
            inputSchema: {
              type: 'object',
              properties: {
                applications: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Applications to get subsystems for',
                },
              },
            },
          },
          {
            name: 'get_log_context',
            description: 'Get surrounding context for a specific log entry',
            inputSchema: {
              type: 'object',
              properties: {
                logId: {
                  type: 'string',
                  description: 'Unique identifier of the log entry',
                },
                contextSize: {
                  type: 'number',
                  description: 'Number of logs before and after to retrieve',
                  default: 10,
                },
              },
              required: ['logId'],
            },
          },
          {
            name: 'advanced_dataprime_query',
            description: 'Execute advanced DataPrime queries with specialized analysis types',
            inputSchema: {
              type: 'object',
              properties: {
                queryType: {
                  type: 'string',
                  enum: ['error_analysis', 'performance_analysis', 'user_journey', 'aggregated_metrics', 'log_parsing', 'enriched_analysis', 'basic'],
                  description: 'Type of advanced analysis to perform',
                  default: 'basic',
                },
                application: {
                  type: 'string',
                  description: 'Filter by specific application name',
                },
                subsystem: {
                  type: 'string',
                  description: 'Filter by specific subsystem name',
                },
                severity: {
                  type: 'string',
                  description: 'Filter by log severity level',
                },
                userId: {
                  type: 'string',
                  description: 'Filter by specific user ID',
                },
                timeRange: {
                  type: 'string',
                  description: 'Time range for the query (e.g., "1h", "24h", "7d")',
                  default: '1h',
                },
                interval: {
                  type: 'string',
                  description: 'Time interval for aggregated metrics (e.g., "5m", "1h")',
                  default: '5m',
                },
                parsePattern: {
                  type: 'string',
                  enum: ['api_logs', 'user_activity', 'database_logs', 'key_value'],
                  description: 'Pattern for log parsing queries',
                  default: 'api_logs',
                },
              },
              required: ['queryType'],
            },
          },
          {
            name: 'log_pattern_analysis',
            description: 'Analyze log patterns and categorize log entries',
            inputSchema: {
              type: 'object',
              properties: {
                application: {
                  type: 'string',
                  description: 'Application name to analyze patterns for',
                  required: true,
                },
                timeRange: {
                  type: 'string',
                  description: 'Time range for analysis (e.g., "1h", "24h")',
                  default: '24h',
                },
              },
              required: ['application'],
            },
          },
          {
            name: 'security_analysis',
            description: 'Perform security-focused log analysis to identify threats and suspicious activities',
            inputSchema: {
              type: 'object',
              properties: {
                timeRange: {
                  type: 'string',
                  description: 'Time range for security analysis (e.g., "1h", "24h")',
                  default: '24h',
                },
                severity: {
                  type: 'string',
                  description: 'Minimum severity level to analyze',
                  default: 'WARNING',
                },
              },
            },
          },
          {
            name: 'custom_dataprime_query',
            description: 'Execute custom DataPrime queries using predefined templates or custom queries',
            inputSchema: {
              type: 'object',
              properties: {
                template: {
                  type: 'string',
                  enum: ['time_series_analysis', 'top_errors_by_user', 'api_performance_monitoring', 'custom'],
                  description: 'Query template to use',
                  default: 'basic',
                },
                parameters: {
                  type: 'object',
                  description: 'Parameters for the template or custom query',
                  properties: {
                    customQuery: {
                      type: 'string',
                      description: 'Custom DataPrime query string (when template is "custom")',
                    },
                    application: {
                      type: 'string',
                      description: 'Application name to filter by',
                    },
                    timeRange: {
                      type: 'string',
                      description: 'Time range for the query',
                    },
                    interval: {
                      type: 'string',
                      description: 'Time interval for time series (e.g., "1h", "5m")',
                    },
                    limit: {
                      type: 'number',
                      description: 'Maximum number of results to return',
                    },
                    orderBy: {
                      type: 'string',
                      description: 'Field to order results by',
                    },
                  },
                },
              },
              required: ['template'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_logs':
            return await this.searchLogs(args);
          case 'query_logs_dataprime':
            return await this.queryLogsDataPrime(args);
          case 'get_log_aggregations':
            return await this.getLogAggregations(args);
          case 'list_applications':
            return await this.listApplications(args);
          case 'list_subsystems':
            return await this.listSubsystems(args);
          case 'get_log_context':
            return await this.getLogContext(args);
          case 'advanced_dataprime_query':
            return await this.advancedDataPrimeQuery(args);
          case 'log_pattern_analysis':
            return await this.logPatternAnalysis(args);
          case 'security_analysis':
            return await this.securityAnalysis(args);
          case 'custom_dataprime_query':
            return await this.customDataPrimeQuery(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error}`);
      }
    });
  }

  private getConfig(): CoralogixConfig {
    if (!this.config) {
      const apiKey = process.env.CORALOGIX_API_KEY;
      const domain = process.env.CORALOGIX_DOMAIN;

      if (!apiKey || !domain) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'Missing required environment variables: CORALOGIX_API_KEY and CORALOGIX_DOMAIN'
        );
      }

      this.config = { apiKey, domain };
    }
    return this.config;
  }

  private async makeCoralogixRequest(queryRequest: QueryRequest): Promise<any> {
    const config = this.getConfig();
    const url = `https://ng-api-http.${config.domain}/api/v1/dataprime/query`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(queryRequest),
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `Coralogix API request failed: ${response.status} ${response.statusText}`
      );
    }

    const responseText = await response.text();
    
    // Parse NDJSON response
    const lines = responseText.trim().split('\n').filter(line => line.trim());
    const results: any[] = [];
    
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        results.push(parsed);
      } catch (e) {
        console.warn('Failed to parse NDJSON line:', line);
      }
    }

    return results;
  }

  private timeRangeToDateRange(timeRange: string): { startDate: string; endDate: string } {
    const now = new Date();
    const endDate = now.toISOString();
    
    const match = timeRange.match(/^(\d+)([hdw])$/);
    if (!match) {
      throw new Error('Invalid time range format. Use format like "1h", "24h", "7d"');
    }

    const [, amount, unit] = match;
    const value = parseInt(amount);
    
    let startTime = new Date(now);
    switch (unit) {
      case 'h':
        startTime.setHours(startTime.getHours() - value);
        break;
      case 'd':
        startTime.setDate(startTime.getDate() - value);
        break;
      case 'w':
        startTime.setDate(startTime.getDate() - (value * 7));
        break;
    }

    return {
      startDate: startTime.toISOString(),
      endDate,
    };
  }

  private async searchLogs(args: any) {
    const { query, applications, subsystems, severities, timeRange = '1h', limit = 100 } = args;
    
    let luceneQuery = query;
    
    // Add filters to the query
    const filters: string[] = [];
    
    if (applications && applications.length > 0) {
      const appFilter = applications.map((app: string) => `coralogix.metadata.applicationName:"${app}"`).join(' OR ');
      filters.push(`(${appFilter})`);
    }
    
    if (subsystems && subsystems.length > 0) {
      const subFilter = subsystems.map((sub: string) => `coralogix.metadata.subsystemName:"${sub}"`).join(' OR ');
      filters.push(`(${subFilter})`);
    }
    
    if (severities && severities.length > 0) {
      const sevFilter = severities.map((sev: string) => `coralogix.metadata.severity:"${sev}"`).join(' OR ');
      filters.push(`(${sevFilter})`);
    }
    
    if (filters.length > 0) {
      luceneQuery = `${query} AND ${filters.join(' AND ')}`;
    }

    const { startDate, endDate } = this.timeRangeToDateRange(timeRange);

    const queryRequest: QueryRequest = {
      query: luceneQuery,
      metadata: {
        syntax: 'QUERY_SYNTAX_LUCENE',
        tier: 'TIER_FREQUENT_SEARCH',
        startDate,
        endDate,
        limit,
      },
    };

    const results = await this.makeCoralogixRequest(queryRequest);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            query: luceneQuery,
            timeRange: { startDate, endDate },
            totalResults: results.length,
            results: results,
          }, null, 2),
        },
      ],
    };
  }

  private async queryLogsDataPrime(args: any) {
    const { query, timeRange = '1h' } = args;
    
    const { startDate, endDate } = this.timeRangeToDateRange(timeRange);

    const queryRequest: QueryRequest = {
      query,
      metadata: {
        syntax: 'QUERY_SYNTAX_DATAPRIME',
        tier: 'TIER_FREQUENT_SEARCH',
        defaultSource: 'logs',
        startDate,
        endDate,
      },
    };

    const results = await this.makeCoralogixRequest(queryRequest);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            query,
            timeRange: { startDate, endDate },
            totalResults: results.length,
            results: results,
          }, null, 2),
        },
      ],
    };
  }

  private async getLogAggregations(args: any) {
    const { groupBy, aggregations, filters, timeRange = '1h' } = args;
    
    // Build DataPrime aggregation query
    let query = 'source logs';
    
    // Add filters if provided
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        query += ` | filter $d.${key} == "${value}"`;
      }
    }
    
    // Add grouping
    const groupByFields = groupBy.map((field: string) => `$d.${field}`).join(', ');
    query += ` | groupby ${groupByFields}`;
    
    // Add aggregations
    if (aggregations && aggregations.length > 0) {
      const aggExpressions = aggregations.map((agg: any) => {
        switch (agg.type) {
          case 'count':
            return 'count() as count';
          case 'sum':
            return `sum($d.${agg.field}) as sum_${agg.field}`;
          case 'avg':
            return `avg($d.${agg.field}) as avg_${agg.field}`;
          case 'min':
            return `min($d.${agg.field}) as min_${agg.field}`;
          case 'max':
            return `max($d.${agg.field}) as max_${agg.field}`;
          default:
            return 'count() as count';
        }
      });
      query += ` aggregate ${aggExpressions.join(', ')}`;
    } else {
      query += ' aggregate count() as count';
    }

    const { startDate, endDate } = this.timeRangeToDateRange(timeRange);

    const queryRequest: QueryRequest = {
      query,
      metadata: {
        syntax: 'QUERY_SYNTAX_DATAPRIME',
        tier: 'TIER_FREQUENT_SEARCH',
        defaultSource: 'logs',
        startDate,
        endDate,
      },
    };

    const results = await this.makeCoralogixRequest(queryRequest);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            query,
            groupBy,
            aggregations,
            timeRange: { startDate, endDate },
            results: results,
          }, null, 2),
        },
      ],
    };
  }

  private async listApplications(_args: any) {
    const query = 'source logs | groupby $l.applicationname aggregate count() as log_count | sort log_count desc | limit 100';
    
    // Add default time range for consistency
    const { startDate, endDate } = this.timeRangeToDateRange('24h');
    
    const queryRequest: QueryRequest = {
      query,
      metadata: {
        syntax: 'QUERY_SYNTAX_DATAPRIME',
        tier: 'TIER_FREQUENT_SEARCH',
        defaultSource: 'logs',
        startDate,
        endDate,
      },
    };

    const results = await this.makeCoralogixRequest(queryRequest);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            query: 'List applications',
            timeRange: { startDate, endDate },
            results: results,
          }, null, 2),
        },
      ],
    };
  }

  private async listSubsystems(args: any) {
    const { applications } = args;
    
    let query = 'source logs';
    
    if (applications && applications.length > 0) {
      const appFilters = applications.map((app: string) => `$l.applicationname == "${app}"`).join(' OR ');
      query += ` | filter (${appFilters})`;
    }
    
    query += ' | groupby $l.subsystemname aggregate count() as log_count | sort log_count desc | limit 100';

    // Add default time range for consistency
    const { startDate, endDate } = this.timeRangeToDateRange('24h');

    const queryRequest: QueryRequest = {
      query,
      metadata: {
        syntax: 'QUERY_SYNTAX_DATAPRIME',
        tier: 'TIER_FREQUENT_SEARCH',
        defaultSource: 'logs',
        startDate,
        endDate,
      },
    };

    const results = await this.makeCoralogixRequest(queryRequest);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            query: 'List subsystems',
            applications,
            timeRange: { startDate, endDate },
            results: results,
          }, null, 2),
        },
      ],
    };
  }

  private async getLogContext(args: any) {
    const { logId, contextSize = 10 } = args;
    
    // First, find the log entry by ID
    const findQuery = `source logs | filter $m.logid == "${logId}" | limit 1`;
    
    const findRequest: QueryRequest = {
      query: findQuery,
      metadata: {
        syntax: 'QUERY_SYNTAX_DATAPRIME',
        tier: 'TIER_FREQUENT_SEARCH',
        defaultSource: 'logs',
      },
    };

    const logResults = await this.makeCoralogixRequest(findRequest);
    
    if (!logResults || logResults.length === 0) {
      throw new McpError(ErrorCode.InvalidRequest, `Log entry with ID ${logId} not found`);
    }

    // Extract timestamp from the found log
    const logEntry = logResults[0];
    let timestamp;
    
    try {
      if (logEntry.result && logEntry.result.results && logEntry.result.results[0]) {
        // Try to extract timestamp from metadata or labels
        const entry = logEntry.result.results[0];
        timestamp = entry.metadata?.find((m: any) => m.key === 'timestamp')?.value ||
                   entry.labels?.find((l: any) => l.key === 'timestamp')?.value;
      }
    } catch (e) {
      console.warn('Could not extract timestamp from log entry');
    }

    // If we have a timestamp, get context around it
    let contextQuery = 'source logs';
    
    if (timestamp) {
      // Get logs around the timestamp
      contextQuery += ` | filter $m.timestamp >= "${timestamp}" - 5m AND $m.timestamp <= "${timestamp}" + 5m`;
    }
    
    contextQuery += ` | sort $m.timestamp | limit ${contextSize * 2}`;

    const contextRequest: QueryRequest = {
      query: contextQuery,
      metadata: {
        syntax: 'QUERY_SYNTAX_DATAPRIME',
        tier: 'TIER_FREQUENT_SEARCH',
        defaultSource: 'logs',
      },
    };

    const contextResults = await this.makeCoralogixRequest(contextRequest);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            logId,
            contextSize,
            targetLog: logResults,
            contextLogs: contextResults,
          }, null, 2),
        },
      ],
    };
  }

  private async advancedDataPrimeQuery(args: any) {
    const { 
      queryType, 
      application, 
      subsystem, 
      severity, 
      userId, 
      timeRange = '1h', 
      interval = '5m',
      parsePattern = 'api_logs'
    } = args;

    let query = 'source logs';
    
    // Add filters
    const filters: string[] = [];
    if (application) filters.push(`$l.applicationname == "${application}"`);
    if (subsystem) filters.push(`$l.subsystemname == "${subsystem}"`);
    if (severity) filters.push(`$m.severity == "${severity.toUpperCase()}"`);
    if (userId) filters.push(`$d.user_id == "${userId}"`);
    
    if (filters.length > 0) {
      query += ` | filter ${filters.join(' AND ')}`;
    }

    // Build query based on type
    switch (queryType) {
      case 'error_analysis':
        query += ' | filter $m.severity == "ERROR" | groupby $d.error_type, $l.applicationname aggregate count() as error_count | sort error_count desc';
        break;
        
      case 'performance_analysis':
        query += ' | filter $d.response_time != null | groupby $l.applicationname aggregate avg($d.response_time) as avg_response_time, max($d.response_time) as max_response_time, min($d.response_time) as min_response_time';
        break;
        
      case 'user_journey':
        if (userId) {
          query += ' | sort $m.timestamp | limit 1000';
        } else {
          query += ' | filter $d.user_id != null | groupby $d.user_id aggregate count() as event_count | sort event_count desc | limit 50';
        }
        break;
        
      case 'aggregated_metrics':
        query += ` | groupby bin($m.timestamp, "${interval}") aggregate count() as log_count | sort timestamp`;
        break;
        
      case 'log_parsing':
        switch (parsePattern) {
          case 'api_logs':
            query += ' | extract $d.log into $d.parsed using regexp(e=/(?<method>\\w+)\\s+(?<path>\\/[^\\s]*)\\s+(?<status>\\d+)\\s+(?<response_time>\\d+)ms/) | filter $d.parsed.method != null';
            break;
          case 'user_activity':
            query += ' | extract $d.log into $d.parsed using regexp(e=/user_id=(?<user_id>\\w+)\\s+action=(?<action>\\w+)/) | filter $d.parsed.user_id != null';
            break;
          case 'database_logs':
            query += ' | extract $d.log into $d.parsed using regexp(e=/query_time=(?<query_time>\\d+\\.\\d+)\\s+query=(?<query>[^\\n]+)/) | filter $d.parsed.query_time != null';
            break;
          case 'key_value':
            query += ' | extract $d.log into $d.parsed using regexp(e=/(?<key>\\w+)=(?<value>[^\\s]+)/) | filter $d.parsed.key != null';
            break;
        }
        break;
        
      case 'enriched_analysis':
        query += ' | enrich $d.ip_address from ip_enrichment on ip | filter $d.country != null | groupby $d.country aggregate count() as requests_by_country | sort requests_by_country desc';
        break;
        
      default:
        query += ' | limit 100';
        break;
    }

    const { startDate, endDate } = this.timeRangeToDateRange(timeRange);

    const queryRequest: QueryRequest = {
      query,
      metadata: {
        syntax: 'QUERY_SYNTAX_DATAPRIME',
        tier: 'TIER_FREQUENT_SEARCH',
        defaultSource: 'logs',
        startDate,
        endDate,
      },
    };

    const results = await this.makeCoralogixRequest(queryRequest);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            queryType,
            query,
            parameters: args,
            timeRange: { startDate, endDate },
            results: results,
          }, null, 2),
        },
      ],
    };
  }

  private async logPatternAnalysis(args: any) {
    const { application, timeRange = '24h' } = args;
    
    const { startDate, endDate } = this.timeRangeToDateRange(timeRange);

    // Analyze log patterns for the application
    const query = `source logs | filter $l.applicationname == "${application}" | extract $d.log into $d.pattern using regexp(e=/^(?<prefix>\\w+:\\s*)?(?<level>\\w+)?\\s*(?<message>.{0,50})/) | groupby $d.pattern.level, $d.pattern.prefix aggregate count() as pattern_count | sort pattern_count desc | limit 50`;

    const queryRequest: QueryRequest = {
      query,
      metadata: {
        syntax: 'QUERY_SYNTAX_DATAPRIME',
        tier: 'TIER_FREQUENT_SEARCH',
        defaultSource: 'logs',
        startDate,
        endDate,
      },
    };

    const results = await this.makeCoralogixRequest(queryRequest);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            analysis: 'Log Pattern Analysis',
            application,
            query,
            timeRange: { startDate, endDate },
            results: results,
          }, null, 2),
        },
      ],
    };
  }

  private async securityAnalysis(args: any) {
    const { timeRange = '24h', severity = 'WARNING' } = args;
    
    const { startDate, endDate } = this.timeRangeToDateRange(timeRange);

    // Security-focused analysis
    const queries = [
      // Failed login attempts
      'source logs | filter $d.log contains "failed" AND $d.log contains "login" | groupby $d.ip_address aggregate count() as failed_attempts | sort failed_attempts desc | limit 20',
      
      // Error patterns by severity
      `source logs | filter $m.severity >= "${severity}" | groupby $m.severity, $l.applicationname aggregate count() as error_count | sort error_count desc`,
      
      // Suspicious activity patterns
      'source logs | filter $d.log contains "suspicious" OR $d.log contains "unauthorized" OR $d.log contains "blocked" | groupby $d.action, $d.ip_address aggregate count() as incident_count | sort incident_count desc | limit 30',
    ];

    const results = [];

    for (const query of queries) {
      const queryRequest: QueryRequest = {
        query,
        metadata: {
          syntax: 'QUERY_SYNTAX_DATAPRIME',
          tier: 'TIER_FREQUENT_SEARCH',
          defaultSource: 'logs',
          startDate,
          endDate,
        },
      };

      const result = await this.makeCoralogixRequest(queryRequest);
      results.push({ query, result });
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            analysis: 'Security Analysis',
            timeRange: { startDate, endDate },
            severity,
            results: results,
          }, null, 2),
        },
      ],
    };
  }

  private async customDataPrimeQuery(args: any) {
    const { template, parameters = {} } = args;
    
    let query: string;
    
    switch (template) {
      case 'time_series_analysis':
        const interval = parameters.interval || '1h';
        query = `source logs | groupby bin($m.timestamp, "${interval}") aggregate count() as log_count, count_distinct($l.applicationname) as unique_apps | sort timestamp`;
        break;
        
      case 'top_errors_by_user':
        query = 'source logs | filter $m.severity == "ERROR" | filter $d.user_id != null | groupby $d.user_id aggregate count() as error_count | sort error_count desc | limit 20';
        break;
        
      case 'api_performance_monitoring':
        query = 'source logs | filter $d.response_time != null | groupby $d.endpoint aggregate avg($d.response_time) as avg_response_time, count() as request_count, percentile($d.response_time, 95) as p95_response_time | sort avg_response_time desc';
        break;
        
      case 'custom':
        if (!parameters.customQuery) {
          throw new McpError(ErrorCode.InvalidRequest, 'Custom query is required when using custom template');
        }
        query = parameters.customQuery;
        break;
        
      default:
        query = 'source logs | limit 100';
        break;
    }

    // Apply additional parameters
    if (parameters.application) {
      query = query.replace('source logs', `source logs | filter $l.applicationname == "${parameters.application}"`);
    }
    
    if (parameters.limit) {
      query += ` | limit ${parameters.limit}`;
    }
    
    if (parameters.orderBy) {
      query += ` | sort ${parameters.orderBy} desc`;
    }

    const timeRange = parameters.timeRange || '1h';
    const { startDate, endDate } = this.timeRangeToDateRange(timeRange);

    const queryRequest: QueryRequest = {
      query,
      metadata: {
        syntax: 'QUERY_SYNTAX_DATAPRIME',
        tier: 'TIER_FREQUENT_SEARCH',
        defaultSource: 'logs',
        startDate,
        endDate,
      },
    };

    const results = await this.makeCoralogixRequest(queryRequest);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            template,
            query,
            parameters,
            timeRange: { startDate, endDate },
            results: results,
          }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Coralogix MCP server running on stdio');
  }
}

const server = new CoralogixMCPServer();
server.run().catch(console.error);