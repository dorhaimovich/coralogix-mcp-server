# Coralogix MCP Server

A Model Context Protocol (MCP) server that provides seamless integration with Coralogix's log querying and analysis capabilities. This server enables AI assistants like Claude Desktop to interact with Coralogix logs using both Lucene and DataPrime query languages.

## 🚀 Quick Start for Claude Desktop

### 1. Install the Package
```bash
npm install -g dor-coralogix-mcp-server
```

### 2. Get Your Coralogix Credentials
- **API Key**: Get from Coralogix Dashboard → Data Flow → API Keys (needs "Data Querying" permissions)
- **Domain**: Choose based on your region (see [Domains](#coralogix-domains) below)

### 3. Configure Claude Desktop
Add to your Claude Desktop MCP settings file:

**Location of settings file:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Configuration:**
```json
{
  "mcpServers": {
    "coralogix": {
      "command": "dor-coralogix-mcp-server",
      "env": {
        "CORALOGIX_API_KEY": "your-api-key-here",
        "CORALOGIX_DOMAIN": "your-coralogix-domain"
      }
    }
  }
}
```

### 4. Restart Claude Desktop
After saving the configuration, completely quit and restart Claude Desktop.

### 5. Start Querying!
You can now ask Claude to search your Coralogix logs:
- "Show me all error logs from the past hour"
- "Find API timeout errors in the payment service"
- "Analyze log patterns for the web application"

## Features

- **Multiple Query Types**: Support for Lucene and DataPrime queries
- **Advanced Analytics**: Built-in templates for error analysis, performance monitoring, and security analysis
- **Log Pattern Analysis**: Automatic pattern detection and categorization
- **Flexible Filtering**: Filter by applications, subsystems, severity levels, and time ranges
- **Context Retrieval**: Get surrounding context for specific log entries
- **Aggregations**: Built-in support for grouping and aggregating log data
- **Custom Templates**: Predefined query templates for common use cases

## Installation Options

### Option 1: npm (Recommended)
```bash
npm install -g dor-coralogix-mcp-server
```

### Option 2: npx (No Installation)
```bash
npx dor-coralogix-mcp-server
```

### Option 3: Clone and Build
```bash
git clone https://github.com/dorhaimovich/coralogix-mcp-server.git
cd coralogix-mcp-server
npm install
npm run build
```

## Configuration

### Coralogix Domains

Choose the appropriate domain based on your Coralogix region:

- **US1**: `coralogix.us`
- **US2**: `cx498.coralogix.com`
- **EU1**: `coralogix.com`
- **EU2**: `eu2.coralogix.com`
- **AP1**: `coralogix.in`
- **AP2**: `coralogixsg.com`
- **AP3**: `ap3.coralogix.com`

### API Key Setup

1. Log into your Coralogix dashboard
2. Navigate to **Data Flow** > **API Keys**
3. Create a new API key with **Data Querying** permissions
4. Use the generated key as your `CORALOGIX_API_KEY`

## Usage Examples

### With Claude Desktop (Recommended)

Once configured, you can ask Claude natural language questions:

**Basic Queries:**
- "Show me error logs from the last 2 hours"
- "Find all logs containing 'timeout' from the api-service"
- "List all applications in my Coralogix account"

**Advanced Analysis:**
- "Perform error analysis on the payment service for the last 24 hours"
- "Show me security incidents from today"
- "Analyze log patterns for the web application"

### Standalone Usage

```bash
CORALOGIX_API_KEY="your-key" CORALOGIX_DOMAIN="coralogix.com" dor-coralogix-mcp-server
```

## Available Tools

### Basic Querying

#### `search_logs`
Search logs using Lucene syntax with filtering options.

**Parameters:**
- `query` (required): Lucene query string
- `applications`: Array of application names to filter by
- `subsystems`: Array of subsystem names to filter by
- `severities`: Array of severity levels (Debug, Info, Warning, Error, Critical)
- `timeRange`: Time range (e.g., "1h", "24h", "7d") - default: "1h"
- `limit`: Maximum number of results - default: 100

**Example:**
```javascript
{
  "query": "error AND timeout",
  "applications": ["web-service"],
  "severities": ["Error", "Critical"],
  "timeRange": "24h",
  "limit": 50
}
```

#### `query_logs_dataprime`
Execute DataPrime queries for advanced log analysis.

**Parameters:**
- `query` (required): DataPrime query string
- `timeRange`: Time range for the query - default: "1h"

**Example:**
```javascript
{
  "query": "source logs | filter $m.severity == 'ERROR' | groupby $l.applicationname aggregate count() as error_count | sort error_count desc",
  "timeRange": "6h"
}
```

### Analytics and Aggregations

#### `get_log_aggregations`
Get aggregated metrics from logs.

**Parameters:**
- `groupBy` (required): Array of fields to group by
- `aggregations`: Array of aggregation functions (count, sum, avg, min, max)
- `filters`: Additional filters to apply
- `timeRange`: Time range - default: "1h"

**Example:**
```javascript
{
  "groupBy": ["applicationname", "severity"],
  "aggregations": [
    {"type": "count"},
    {"type": "avg", "field": "response_time"}
  ],
  "timeRange": "12h"
}
```

#### `advanced_dataprime_query`
Execute specialized analysis queries.

**Query Types:**
- `error_analysis`: Analyze error patterns and frequencies
- `performance_analysis`: Monitor response times and performance metrics
- `user_journey`: Track user activities and sessions
- `aggregated_metrics`: Time-series aggregations
- `log_parsing`: Extract structured data from log messages
- `enriched_analysis`: Use enrichment data for enhanced analysis

**Example:**
```javascript
{
  "queryType": "error_analysis",
  "application": "payment-service",
  "timeRange": "24h"
}
```

### Discovery and Context

#### `list_applications`
List all available applications in your Coralogix account.

#### `list_subsystems`
List subsystems for specific applications.

**Parameters:**
- `applications`: Array of application names to filter by

#### `get_log_context`
Get surrounding log entries for a specific log ID.

**Parameters:**
- `logId` (required): Unique identifier of the target log entry
- `contextSize`: Number of logs before and after to retrieve - default: 10

### Specialized Analysis

#### `log_pattern_analysis`
Analyze and categorize log patterns for an application.

**Parameters:**
- `application` (required): Application name to analyze
- `timeRange`: Time range for analysis - default: "24h"

#### `security_analysis`
Perform security-focused log analysis.

**Parameters:**
- `timeRange`: Time range for analysis - default: "24h"
- `severity`: Minimum severity level to analyze - default: "WARNING"

#### `custom_dataprime_query`
Execute custom DataPrime queries using predefined templates.

**Templates:**
- `time_series_analysis`: Analyze trends over time
- `top_errors_by_user`: Find users with most errors
- `api_performance_monitoring`: Monitor API response times
- `custom`: Execute your own DataPrime query

## Troubleshooting

### Common Issues

1. **"MCP server not found"**
   - Make sure you installed the package: `npm install -g dor-coralogix-mcp-server`
   - Restart Claude Desktop completely

2. **"Authentication failed"**
   - Verify your `CORALOGIX_API_KEY` is correct
   - Ensure the API key has "Data Querying" permissions
   - Check that your `CORALOGIX_DOMAIN` matches your region

3. **"400 Bad Request" errors**
   - Check your domain configuration
   - Verify the query syntax (Lucene vs DataPrime)

### Need Help?

- **Issues**: https://github.com/dorhaimovich/coralogix-mcp-server/issues
- **npm Package**: https://www.npmjs.com/package/dor-coralogix-mcp-server

## Contributing

Feel free to open issues or submit pull requests on GitHub!

## License

MIT License - see the [LICENSE](LICENSE) file for details.