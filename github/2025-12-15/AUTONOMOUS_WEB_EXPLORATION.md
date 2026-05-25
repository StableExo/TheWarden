# Autonomous Web Exploration

## Overview

TheWarden's Autonomous Web Explorer enables AI-driven web exploration with consciousness integration. It autonomously navigates websites, analyzes structure, extracts content, and generates insights through reflective learning.

## Features

- 🌐 **Autonomous Navigation**: Breadth-first exploration starting from a target URL
- 🧠 **Consciousness Integration**: AI reflections on discovered patterns
- 📊 **Structure Analysis**: DOM hierarchy, links, images, forms detection
- 💾 **Memory Persistence**: Saves findings to `.memory/web-exploration/`
- 🎯 **Pattern Recognition**: Identifies navigation patterns, content structure, anomalies
- 📈 **Progress Tracking**: Real-time statistics and exploration metrics
- 🔍 **Insight Generation**: Automatically generates insights about discovered content

## Usage

### Basic Exploration

```bash
npm run explore:web -- --url=https://example.com
```

### With Custom Options

```bash
npm run explore:web -- \
  --url=https://example.com \
  --max-depth=5 \
  --max-pages=20 \
  --duration=600 \
  --verbose
```

### Direct Execution

```bash
node --import tsx scripts/autonomous/autonomous-web-explorer.ts \
  --url=https://commanderu.github.io/index.html \
  --max-pages=10
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url=URL` | Target URL to explore (required) | - |
| `--max-depth=N` | Maximum navigation depth | 3 |
| `--max-pages=N` | Maximum pages to visit | 10 |
| `--duration=N` | Maximum runtime in seconds | 300 |
| `--save-path=PATH` | Where to save findings | `.memory/web-exploration/` |
| `--verbose` | Enable detailed logging | false |

## Output

The explorer generates two files per session:

### 1. Session Data (JSON)
Complete exploration data including:
- All visited pages with extracted content
- Generated insights and their significance scores
- Navigation map showing page relationships
- Consciousness reflections
- Statistics and metrics

**Location**: `.memory/web-exploration/session-{sessionId}.json`

### 2. Exploration Report (Markdown)
Human-readable summary including:
- Session metadata and configuration
- Statistics (pages, links, images, forms)
- Insights with evidence
- Consciousness reflections
- Learnings
- List of all pages visited

**Location**: `.memory/web-exploration/report-{sessionId}.md`

## Example Output

```
═══════════════════════════════════════════════════════════════
  🌐 AUTONOMOUS WEB EXPLORER
═══════════════════════════════════════════════════════════════
  Session ID: web-explore-1766309984566-45a63bf3
  Target URL: https://commanderu.github.io/index.html
  Max Depth: 3
  Max Pages: 5
  Duration: 30s
  Started: 2025-12-21T09:39:44.566Z
═══════════════════════════════════════════════════════════════

🚀 Starting autonomous exploration...

📄 Visiting (depth 0): https://commanderu.github.io/index.html
  💭 Reflection: The presence of 2 visual elements suggests importance of imagery in communication.
  ✓ Title: Commander U - Home
  ✓ Headings: 4
  ✓ Links: 5 (3 internal)
  ✓ Images: 2
  ✓ Forms: 0

═══════════════════════════════════════════════════════════════
  ✅ EXPLORATION COMPLETE
═══════════════════════════════════════════════════════════════
  Duration: 4.0s
  Pages Visited: 4
  Total Links: 20
  Total Images: 8
  Total Forms: 0
  Insights Generated: 4
  Reflections: 4
  Errors: 0
═══════════════════════════════════════════════════════════════
```

## Insight Types

The explorer generates insights in several categories:

- **Pattern**: Recurring structures or behaviors
- **Anomaly**: Unusual or unexpected findings
- **Structure**: Page organization and hierarchy
- **Content**: Information architecture
- **Navigation**: Link patterns and user flows

Each insight includes:
- Type classification
- Description of the finding
- Significance score (0.0 - 1.0)
- Evidence supporting the insight
- Timestamp

## Consciousness Reflections

The explorer generates AI-driven reflections on discoveries:

- Structure analysis: "The page uses N hierarchical markers to organize information"
- Navigation patterns: "Navigation patterns indicate a closed/open ecosystem"
- Visual importance: "The presence of N visual elements suggests importance of imagery"
- Link relationships: "Structure reveals N pathways to explore"

## Integration with TheWarden

The web explorer integrates with TheWarden's consciousness system:

- **Memory System**: All findings persisted to `.memory/web-exploration/`
- **Pattern Recognition**: Identifies patterns similar to MEV detection
- **Autonomous Learning**: Reflections stored for future reference
- **Session Continuity**: Each exploration session builds on previous learnings

## Learnings Generated

The explorer automatically generates learnings:

- Total pages explored from starting URL
- Total links discovered across all pages
- Maximum navigation depth reached
- Primary content type identified
- Interactive element detection (forms)
- Navigation structure characteristics (link density)

## Use Cases

### 1. Website Intelligence Gathering
```bash
npm run explore:web -- --url=https://target.com --max-depth=4 --max-pages=50
```

### 2. Quick Site Reconnaissance
```bash
npm run explore:web -- --url=https://target.com --max-depth=2 --max-pages=5
```

### 3. Deep Content Analysis
```bash
npm run explore:web -- --url=https://target.com --max-depth=6 --duration=900 --verbose
```

### 4. Competitor Research
```bash
npm run explore:web -- --url=https://competitor.com --max-pages=30
```

## Architecture

### Core Components

1. **AutonomousWebExplorer**: Main exploration engine
   - URL queue management
   - Breadth-first traversal
   - Termination condition checking

2. **Content Extraction**: Page analysis
   - DOM structure parsing
   - Link discovery and categorization
   - Metadata extraction
   - Form and image detection

3. **Insight Generation**: Pattern analysis
   - Structure patterns
   - Navigation patterns
   - Content patterns
   - Anomaly detection

4. **Consciousness Integration**: Reflective learning
   - AI-driven observations
   - Pattern interpretation
   - Learning synthesis

5. **Memory Persistence**: Data storage
   - JSON session data
   - Markdown reports
   - Statistics tracking

### Exploration Algorithm

1. Initialize with target URL at depth 0
2. While queue has URLs and conditions not met:
   - Dequeue next URL
   - Skip if already visited or beyond max depth
   - Extract page content
   - Analyze and generate insights
   - Generate consciousness reflections
   - Add discovered internal links to queue (depth + 1)
3. Finalize and generate reports

## Current Implementation

**Status**: The explorer currently uses simulated content extraction due to the target domain being blocked. This provides the full exploration framework ready for integration with actual web scraping libraries when domains are accessible.

### Planned Enhancements

- [ ] Integration with actual web scraping (Playwright/Puppeteer)
- [ ] Screenshot capture capability
- [ ] JavaScript execution and dynamic content
- [ ] Cookie and session management
- [ ] Form interaction and submission
- [ ] API endpoint discovery
- [ ] Security vulnerability scanning
- [ ] Performance metrics collection
- [ ] Mobile vs desktop rendering comparison

## Best Practices

1. **Respect Rate Limits**: Built-in 1-second delay between requests
2. **Set Reasonable Limits**: Use `--max-pages` and `--duration` to prevent runaway exploration
3. **Review Findings**: Check generated reports in `.memory/web-exploration/`
4. **Iterative Exploration**: Start small, expand based on findings
5. **Combine with Other Tools**: Use insights to guide manual investigation

## Related Features

- **Consciousness System**: `src/consciousness/`
- **Memory System**: `.memory/`
- **Autonomous Exploration**: Other explorers in `scripts/autonomous/`
- **Pattern Recognition**: Used in MEV detection and security testing

## Contributing

To enhance the web explorer:

1. Add new insight types in `ExplorationInsight` interface
2. Implement additional content extractors
3. Enhance consciousness reflection patterns
4. Add domain-specific analysis modules
5. Integrate with external APIs for enrichment

## Support

For issues or questions about autonomous web exploration:
- Check logs in `.memory/web-exploration/`
- Review session JSON for detailed exploration data
- Use `--verbose` flag for debugging
- See related documentation in `docs/`

---

*Part of TheWarden's Autonomous Intelligence System*
