# Coralogix MCP Server

A Model Context Protocol (MCP) server that provides seamless integration with Coralogix's log querying and analysis capabilities. This server enables AI assistants to interact with Coralogix logs using both Lucene and DataPrime query languages.

## Features

- **Multiple Query Types**: Support for Lucene and DataPrime queries
- **Advanced Analytics**: Built-in templates for error analysis, performance monitoring, and security analysis
- **Log Pattern Analysis**: Automatic pattern detection and categorization
- **Flexible Filtering**: Filter by applications, subsystems, severity levels, and time ranges
- **Context Retrieval**: Get surrounding context for specific log entries
- **Aggregations**: Built-in support for grouping and aggregating log data
- **Custom Templates**: Predefined query templates for common use cases

## Installation

```bash
npm install -g coralogix-mcp-server
```

Or clone and build locally:

```bash
git clone https://github.com/your-username/coralogix-mcp-server.git
cd coralogix-mcp-server
npm install
npm run build
```

## Configuration

Set the following environment variables:

```bash
export CORALOGIX_API_KEY="your-api-key-here"
export CORALOGIX_DOMAIN="your-coralogix-domain"
```

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

## Usage

### With Claude Desktop

Add to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "coralogix": {
      "command": "coralogix-mcp-server",
      "env": {
        "CORALOGIX_API_KEY": "your-api-key-here",
        "CORALOGIX_DOMAIN": "your-coralogix-domain"
      }
    }
  }
}
```

### Standalone Usage

```bash
CORALOGIX_API_KEY="your-key" CORALOGIX_DOMAIN="coralogix.com" coralogix-mcp-server
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
Execute queries using predefined templates or custom DataPrime queries.

**Templates:**
- `time_series_analysis`: Analyze trends over time
- `top_errors_by_user`: Find users with the most errors
- `api_performance_monitoring`: Monitor API endpoint performance
- `custom`: Execute a custom DataPrime query

**Example:**
```javascript
{
  "template": "api_performance_monitoring",
  "parameters": {
    "application": "api-gateway",
    "timeRange": "6h"
  }
}
```

## DataPrime Query Examples

### Basic Filtering and Grouping
```sql
source logs 
| filter $l.applicationname == "web-service" 
| filter $m.severity == "ERROR" 
| groupby $d.error_type aggregate count() as error_count 
| sort error_count desc
```

### Time Series Analysis
```sql
source logs 
| groupby bin($m.timestamp, "1h") aggregate count() as log_count 
| sort timestamp
```

### Pattern Extraction
```sql
source logs 
| extract $d.log into $d.parsed using regexp(e=/(?<method>\\w+)\\s+(?<path>\\/[^\\s]*)\\s+(?<status>\\d+)/) 
| filter $d.parsed.method != null 
| groupby $d.parsed.method, $d.parsed.status aggregate count() as request_count
```

### Performance Analysis
```sql
source logs 
| filter $d.response_time != null 
| groupby $l.applicationname aggregate 
    avg($d.response_time) as avg_response_time,
    percentile($d.response_time, 95) as p95_response_time,
    count() as request_count
```

## Error Handling

The server provides detailed error messages for common issues:

- **Missing API Key**: Ensure `CORALOGIX_API_KEY` environment variable is set
- **Invalid Domain**: Check that `CORALOGIX_DOMAIN` matches your Coralogix region
- **Authentication Errors**: Verify your API key has the correct permissions
- **Query Syntax Errors**: Review DataPrime/Lucene syntax in the Coralogix documentation

## Development

### Building from Source

```bash
git clone https://github.com/your-username/coralogix-mcp-server.git
cd coralogix-mcp-server
npm install
npm run build
```

### Development Mode

```bash
npm run dev
```

### Testing

```bash
# Set environment variables
export CORALOGIX_API_KEY="your-test-key"
export CORALOGIX_DOMAIN="coralogix.com"

# Run the server
npm start
```

## API Reference

### Coralogix API Endpoints

The server uses the following Coralogix API endpoints:

- **DataPrime Query API**: `https://ng-api-http.{domain}/api/v1/dataprime/query`
- **Authentication**: Bearer token in Authorization header
- **Response Format**: NDJSON (Newline Delimited JSON)

### Rate Limits

Coralogix imposes the following limits:
- Maximum 12,000 results per query
- Request rate limits vary by plan
- 100MB data fetch limit for high-tier data

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions:

1. Check the [Coralogix Documentation](https://coralogix.com/docs/)
2. Review DataPrime syntax in the [DataPrime Reference](https://coralogix.com/docs/dataprime/)
3. Open an issue on GitHub
4. Contact Coralogix support for API-related issues

## Changelog

### v0.1.0
- Initial release
- Support for Lucene and DataPrime queries
- Built-in analytics templates
- Log pattern analysis
- Security analysis capabilities
- Context retrieval functionality