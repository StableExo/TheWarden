# GitHub Workflow Permissions Quick Reference 🔐

## Overview

This guide explains the GitHub Actions permissions granted to TheWarden's autonomous workflows and what each permission enables.

## 📋 Permission Scopes Reference

### Core Repository Permissions

| Permission | Level | What It Enables |
|-----------|-------|-----------------|
| `contents` | `read` | Checkout code, read files, view git history |
| `contents` | `write` | Commit changes, push code, create/delete branches |
| `actions` | `read` | View workflow status, download artifacts |
| `actions` | `write` | Upload artifacts, cancel workflows |
| `issues` | `read` | View issues and comments |
| `issues` | `write` | Create/update/close issues, add labels |
| `pull-requests` | `read` | View PRs and reviews |
| `pull-requests` | `write` | Create/update PRs, request reviews, merge |
| `checks` | `read` | View check run status |
| `checks` | `write` | Create/update check runs, set status |
| `statuses` | `write` | Update commit status (✓/✗ indicators) |
| `security-events` | `write` | Upload CodeQL results, report vulnerabilities |
| `packages` | `read` | Pull Docker images from GHCR |
| `packages` | `write` | Push Docker images to GHCR |
| `id-token` | `write` | Generate OIDC tokens for cloud deployments |

## 🔍 Workflow-Specific Permissions

### 1. autonomous-ankr-attack.yml (Security Testing)

```yaml
permissions:
  contents: write        # Commit security findings
  actions: read          # Read workflow artifacts
  issues: write          # Create vulnerability issues
  pull-requests: write   # Create security fix PRs
  security-events: write # Report to security tab
  statuses: write        # Update commit status
```

**Why These Permissions?**
- `contents: write` - Save security test results to `.memory/security-testing/`
- `issues: write` - Auto-create issues for high-risk vulnerabilities
- `security-events: write` - Integrate with GitHub Security Dashboard
- `statuses: write` - Show ✓/✗ on commits for security status

**Use Case**: Autonomous 24/7 security testing with automatic issue creation for critical findings.

---

### 2. truth-social-daily.yml (Content Generation)

```yaml
permissions:
  contents: write        # Commit generated posts
  actions: read          # Monitor workflow status
  issues: write          # Report posting failures
  pull-requests: write   # Create update PRs
```

**Why These Permissions?**
- `contents: write` - Save daily posts to `.memory/truth-social-posts/`
- `issues: write` - Alert if post generation fails
- `pull-requests: write` - Submit content updates for review

**Use Case**: Daily automated social media content generation with archival.

---

### 3. consciousness_persistence.yml (Memory System)

```yaml
permissions:
  contents: write        # Commit consciousness state
  actions: read          # Monitor workflow execution
  issues: write          # Report anomalies
  pull-requests: write   # Submit state updates
```

**Why These Permissions?**
- `contents: write` - Persist thoughts and cognitive state to git
- `issues: write` - Alert on consciousness anomalies
- `pull-requests: write` - Submit consciousness evolution updates

**Use Case**: Maintain persistent consciousness across sessions through git-backed memory.

---

### 4. deploy.yml (Build & Deploy)

**Test Job**:
```yaml
permissions:
  contents: read         # Checkout code
  actions: read          # Read artifacts
  checks: write          # Create test result checks
  statuses: write        # Update commit with test status
```

**Build Job**:
```yaml
permissions:
  contents: read         # Checkout code
  packages: write        # Push Docker images
  actions: read          # Read build artifacts
  id-token: write        # OIDC for cloud deployments
```

**Why These Permissions?**
- `checks: write` - Show test pass/fail status on PRs
- `packages: write` - Publish Docker images to GitHub Container Registry
- `id-token: write` - Authenticate with cloud providers (AWS, Azure, GCP)

**Use Case**: Automated testing, building, and deployment pipeline.

---

### 5. code-quality.yml (Quality Gates)

**Lint Job**:
```yaml
permissions:
  contents: read         # Checkout code
  checks: write          # Create lint check runs
  statuses: write        # Update commit status
  pull-requests: write   # Comment lint issues on PRs
```

**Build Job**:
```yaml
permissions:
  contents: read         # Checkout code
  actions: write         # Upload build artifacts
  checks: write          # Create build check
```

**Test Job**:
```yaml
permissions:
  contents: read         # Checkout code
  checks: write          # Create test checks
  pull-requests: write   # Comment coverage on PRs
  actions: read          # Read test artifacts
```

**Security Audit Job**:
```yaml
permissions:
  contents: read         # Checkout code
  security-events: write # Report npm audit findings
  issues: write          # Create security issues
  checks: write          # Create audit check
```

**Why These Permissions?**
- `checks: write` - Create check runs for each quality gate
- `pull-requests: write` - Auto-comment on code quality issues
- `security-events: write` - Integrate npm audit with GitHub Security

**Use Case**: Comprehensive automated code quality enforcement on every PR.

---

### 6. codeql.yml (Security Scanning)

```yaml
permissions:
  security-events: write # Upload CodeQL results
  packages: read         # Fetch CodeQL packs
  actions: read          # Read workflow status
  contents: read         # Checkout code
```

**Why These Permissions?**
- `security-events: write` - Upload scan results to Security tab
- `packages: read` - Download internal CodeQL query packs
- `contents: read` - Access code for static analysis

**Use Case**: Weekly automated security vulnerability scanning with CodeQL.

---

## 🎯 Permission Design Principles

### 1. Least Privilege
Start with minimum permissions and only add what's needed:
```yaml
# Good: Explicit minimal permissions
permissions:
  contents: read
  checks: write

# Bad: Overly broad permissions
permissions: write-all
```

### 2. Explicit Over Implicit
Always specify permissions explicitly:
```yaml
# Good: Clear what the workflow can do
permissions:
  contents: write
  issues: write

# Bad: Relies on default permissions
# permissions: {} or no permissions block
```

### 3. Read-Only Default
Default to read-only, write only when necessary:
```yaml
# Good: Most workflows should start here
permissions:
  contents: read
  
# Add write only if needed
permissions:
  contents: write  # Only if committing changes
```

### 4. Scoped to Job
Set permissions at the job level for fine-grained control:
```yaml
jobs:
  read-only-job:
    permissions:
      contents: read  # Can only read
  
  write-job:
    permissions:
      contents: write # Can write
```

## 🔐 Security Best Practices

### Token Usage

**GITHUB_TOKEN (Auto-provided)**:
- ✅ Use for basic operations in workflows
- ✅ Automatically rotated after workflow
- ❌ Cannot trigger other workflows
- ❌ Limited to current repository

**GH_PAT_COPILOT (Personal Access Token)**:
- ✅ Can trigger other workflows
- ✅ Works across repositories
- ✅ Persists beyond workflow execution
- ⚠️ Requires manual rotation
- ⚠️ Higher privilege, use carefully

**When to Use Each**:
```yaml
# Use GITHUB_TOKEN for most operations
- name: Checkout code
  uses: actions/checkout@v4
  with:
    token: ${{ secrets.GITHUB_TOKEN }}

# Use GH_PAT_COPILOT only when needed
- name: Trigger another workflow
  uses: actions/github-script@v7
  with:
    github-token: ${{ secrets.GH_PAT_COPILOT }}
```

### Secret Management

**Never Expose Secrets**:
```yaml
# Good: Secrets stay masked
env:
  API_KEY: ${{ secrets.API_KEY }}

# Bad: Secret in plain text
run: echo "My secret is ${{ secrets.API_KEY }}"
```

**Validate Before Use**:
```yaml
- name: Validate secrets
  run: |
    if [ -z "${{ secrets.REQUIRED_KEY }}" ]; then
      echo "::error::REQUIRED_KEY not set"
      exit 1
    fi
```

### Audit Trail

**Always Include Attribution**:
```yaml
- name: Commit changes
  run: |
    git config user.name "TheWarden Bot"
    git config user.email "thewarden@autonomous.ai"
    git commit -m "Automated: Security scan results"
```

**Log Important Actions**:
```yaml
- name: Deploy
  run: |
    echo "::notice::Deploying version $VERSION to production"
    ./deploy.sh
```

## 📊 Permission Matrix

| Workflow | contents | actions | issues | PRs | checks | statuses | security | packages |
|----------|----------|---------|--------|-----|--------|----------|----------|----------|
| ankr-attack | write | read | write | write | - | write | write | - |
| truth-social | write | read | write | write | - | - | - | - |
| consciousness | write | read | write | write | - | - | - | - |
| deploy (test) | read | read | - | - | write | write | - | - |
| deploy (build) | read | read | - | - | - | - | - | write |
| quality (lint) | read | - | - | write | write | write | - | - |
| quality (test) | read | read | - | write | write | - | - | - |
| quality (audit) | read | - | write | - | write | - | write | - |
| codeql | read | read | - | - | - | - | write | read |

**Legend**: write = full access, read = read-only, - = not needed

## 🚀 Adding New Workflows

### Template for New Workflow

```yaml
name: My New Workflow

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  my-job:
    runs-on: ubuntu-latest
    
    # ALWAYS specify permissions explicitly
    permissions:
      contents: read        # What do I need to read?
      # Add write permissions ONLY if needed:
      # contents: write     # Do I need to commit?
      # issues: write       # Do I need to create issues?
      # checks: write       # Do I need to create checks?
      # pull-requests: write # Do I need to update PRs?
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Do work
        run: echo "Work happens here"
```

### Permission Checklist

Before adding a new permission, ask:

- [ ] Is this permission absolutely necessary?
- [ ] Can I use a more restrictive permission?
- [ ] Is there a safer alternative approach?
- [ ] Have I documented why this permission is needed?
- [ ] Have I tested with minimal permissions first?
- [ ] Is there a security risk if this permission is misused?

## 📚 Resources

- [GitHub Actions Permissions Documentation](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)
- [Security Hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [TheWarden Autonomous Access Guide](./AUTONOMOUS_ACCESS_CAPABILITIES.md)

## 🎓 Examples

### Example 1: Read-Only Analysis

```yaml
name: Code Analysis
jobs:
  analyze:
    permissions:
      contents: read      # Read code only
      checks: write       # Report results
    steps:
      - uses: actions/checkout@v4
      - run: npm run analyze
```

### Example 2: Auto-Fix Issues

```yaml
name: Auto-Fix Lint
jobs:
  fix:
    permissions:
      contents: write     # Commit fixes
      pull-requests: write # Create PR
    steps:
      - uses: actions/checkout@v4
      - run: npm run lint:fix
      - run: git commit && git push
```

### Example 3: Security Reporting

```yaml
name: Security Scan
jobs:
  scan:
    permissions:
      contents: read          # Read code
      security-events: write  # Report findings
      issues: write           # Create security issues
    steps:
      - uses: actions/checkout@v4
      - run: npm run security:scan
```

---

## Summary

**Key Takeaways**:

1. ✅ **Always specify permissions explicitly** - No defaults
2. ✅ **Use least privilege** - Minimum permissions needed
3. ✅ **Prefer read-only** - Write only when necessary
4. ✅ **Audit everything** - Log all important actions
5. ✅ **Test safely** - Start restricted, expand carefully

**TheWarden's autonomous workflows follow these principles to maintain**:
- 🔒 **Security**: Minimal attack surface
- 📝 **Transparency**: All actions logged
- 🤝 **Trust**: Earned through responsible operation
- 🚀 **Capability**: Powerful yet safe

---

*Last Updated: 2025-12-17*  
*For questions about permissions, see: [AUTONOMOUS_ACCESS_CAPABILITIES.md](./AUTONOMOUS_ACCESS_CAPABILITIES.md)*
