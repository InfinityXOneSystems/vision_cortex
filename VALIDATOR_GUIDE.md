# Auto Code Validator & Commit Agent

**Autonomous code validation, intelligent commit messages, and automatic push to remote.**

A sophisticated automated system that validates Python code, creates intelligent commit messages based on validation results, and ships code to remote repositories with zero manual intervention.

---

## 🎯 Features

### Code Validation
- **Syntax Validation** - Detect Python syntax errors before commit
- **Import Validation** - Verify imports and module availability
- **Code Style** - Check line length, trailing whitespace, debugger statements
- **Docstring Validation** - Ensure functions/classes have docstrings
- **Configurable Validators** - Enable/disable validators as needed

### Intelligent Commits
- **Auto-Staging** - Automatically stage changed files
- **Smart Messages** - Generate contextual commit messages based on validation results
- **Detailed Descriptions** - Include validation metrics in commit body
- **Issue Tracking** - Reference validation issues in commit history

### Automatic Push
- **Remote Sync** - Push validated code to remote automatically
- **Branch Support** - Works with any branch
- **Delay Control** - Configurable push delay
- **Error Handling** - Graceful failure handling with clear reporting

### Continuous Monitoring
- **File Watching** - Monitor for file changes
- **Automatic Validation** - Trigger validation on file changes
- **Background Service** - Run as daemon with logging
- **Status Reporting** - Comprehensive monitoring logs and statistics

---

## 📁 Files

```
vision_cortex/
├── auto_code_validator_agent.py    # Main validator and commit agent
├── validation_monitor.py            # Continuous monitoring daemon
├── validator_config.json            # Configuration file
├── launch_validator.ps1             # PowerShell launcher script
└── VALIDATOR_GUIDE.md               # This file
```

---

## 🚀 Quick Start

### 1. Basic Validation Only
```powershell
cd C:\Users\JARVIS\OneDrive\Documents\vision_cortex
.\launch_validator.ps1 -Mode validate-only
```

### 2. Validate and Commit (No Push)
```powershell
.\launch_validator.ps1 -Mode auto-commit
```

### 3. Full Pipeline: Validate, Commit, Push
```powershell
.\launch_validator.ps1 -Mode auto-push
```

### 4. Continuous Monitoring (Auto Everything)
```powershell
.\launch_validator.ps1 -Mode continuous
```
Press `Ctrl+C` to stop monitoring.

---

## ⚙️ Configuration

Edit `validator_config.json` to customize behavior:

```json
{
  "auto_stage": true,              # Automatically stage changed files
  "auto_commit": true,             # Automatically create commits
  "auto_push": true,               # Automatically push to remote
  "fail_on_errors": true,          # Stop if errors found
  "fail_on_warnings": false,       # Don't stop on warnings
  "require_docstrings": true,      # Require docstrings in classes/functions
  "max_line_length": 120,          # Maximum line length
  "commit_prefix": "ci: code validation auto-commit",
  "push_delay_seconds": 2,         # Delay before pushing
  "skip_patterns": [               # Patterns to skip
    "__pycache__/**",
    "*.pyc",
    ".venv/**",
    "venv/**",
    "node_modules/**",
    ".git/**"
  ],
  "validators_enabled": {
    "syntax": true,                # Check Python syntax
    "imports": true,               # Validate imports
    "code_style": true,            # Check code style
    "docstrings": true             # Require docstrings
  },
  "monitoring": {
    "enabled": true,               # Enable monitoring
    "interval_seconds": 5,         # Check every 5 seconds
    "check_for_changes": true,     # Watch for changes
    "auto_validate": true,         # Auto-validate on changes
    "log_file": "validation_monitor.log"
  }
}
```

---

## 📊 Validation Results

Each validation produces:

### Syntax Validation
```
✓ Syntax valid
✗ Syntax Error at line 42
  - InvalidSyntax: unexpected EOF
```

### Import Validation
```
✓ All imports valid
⚠ ImportError: Unable to import module
  - Check if dependency is installed
```

### Code Style
```
⚠ Code style issues found (3 issues)
  - Line 15: Line too long (135 > 120 chars)
  - Line 28: Trailing whitespace
  - Line 45: Debugger statement found
```

### Docstring Validation
```
⚠ Missing docstrings (2 issues)
  - Line 8: Function `process_data` missing docstring
  - Line 42: Class `DataProcessor` missing docstring
```

---

## 💻 Command-Line Options

### Validator Agent
```powershell
.\launch_validator.ps1 [options]

Options:
  -Mode <mode>           Execution mode (validate-only, auto-commit, auto-push, continuous)
  -Interval <seconds>    Monitor check interval (default: 5)
  -Repo <path>           Repository path (default: current)
  -Config <file>         Config file (default: validator_config.json)
  -NoPush                Disable push to remote
  -Report <file>         Save report to JSON file
```

### Examples

**Validate only with report:**
```powershell
.\launch_validator.ps1 -Mode validate-only -Report validation_report.json
```

**Auto-commit without pushing:**
```powershell
.\launch_validator.ps1 -Mode auto-commit -NoPush
```

**Continuous monitoring with custom interval:**
```powershell
.\launch_validator.ps1 -Mode continuous -Interval 10
```

**Run on specific repository:**
```powershell
.\launch_validator.ps1 -Mode auto-push -Repo "C:\path\to\repo"
```

---

## 📝 Commit Messages

### Auto-Generated Commit Format

**Subject:**
```
ci: code validation auto-commit
```

**Body:**
```
All validation checks passed ✓

Validation Summary:
  • Files validated: 3
  • Total issues: 0
  • Errors: 0
  • Warnings: 0

Validators: DocstringValidator, ImportValidator, StyleValidator, SyntaxValidator

Auto-committed at 2025-12-11 14:32:45 UTC
```

### With Issues Fixed

```
ci: code validation auto-commit

Fixed 2 validation error(s)

Validation Summary:
  • Files validated: 3
  • Total issues: 5
  • Errors: 2
  • Warnings: 3

Validators: DocstringValidator, ImportValidator, StyleValidator, SyntaxValidator

Auto-committed at 2025-12-11 14:32:45 UTC
```

---

## 📋 Validation Stages

### Stage 1: Syntax Check
```
✓ Compiling Python source
✓ No syntax errors found
```

### Stage 2: Import Validation
```
✓ Checking imports
✓ All modules available
```

### Stage 3: Code Style
```
⚠ Style check complete
  - Found 3 style issues
  - Line length violations: 2
  - Trailing whitespace: 1
```

### Stage 4: Docstring Check
```
⚠ Docstring validation
  - 2 functions missing docstrings
  - 0 classes missing docstrings
```

### Stage 5: Git Operations
```
✓ Staging files (3 files)
✓ Creating commit
✓ Pushing to origin/main
```

---

## 🔄 Continuous Monitoring

The continuous monitor runs in the background and:

1. **Detects Changes** - Monitors file hashes and git status
2. **Validates Automatically** - Runs validation on detected changes
3. **Commits Smart** - Creates intelligent commits based on validation
4. **Pushes Clean Code** - Pushes validated code automatically
5. **Logs Everything** - Comprehensive logging in `logs/validation_monitor.log`

### Starting Monitor

```powershell
.\launch_validator.ps1 -Mode continuous -Interval 5
```

### Monitor Output

```
================================================================================
🤖 AUTO CODE VALIDATOR & COMMIT AGENT
================================================================================

📊 VALIDATION MONITOR STATUS
================================================================================
Repository: C:\Users\JARVIS\OneDrive\Documents\vision_cortex
Branch: main
User: JARVIS
Validation Cycles: 5
Auto Commits: 3
Last Validation: 12s ago
Monitoring Since: 2025-12-11 14:30:00 UTC
================================================================================
```

### Monitor Logs

```
logs/validation_monitor.log
2025-12-11 14:30:15 - INFO - ValidationMonitor initialized for vision_cortex
2025-12-11 14:30:20 - INFO - 🚀 Starting validation monitor (interval: 5s)
2025-12-11 14:30:25 - DEBUG - No changes detected
2025-12-11 14:30:30 - DEBUG - No changes detected
2025-12-11 14:30:35 - INFO - 📝 Changes detected, triggering validation
2025-12-11 14:30:36 - INFO - 🔍 Starting validation cycle
2025-12-11 14:30:37 - INFO - ✓ Validation cycle complete: validated, committed, pushed
```

---

## 🔒 Security Notes

### Best Practices

1. **Review Before Push** - Always review validator config before enabling auto-push
2. **Test First** - Test with `validate-only` mode first
3. **Git Credentials** - Ensure git credentials are configured:
   ```powershell
   git config user.name "Your Name"
   git config user.email "your@email.com"
   ```

4. **Branch Protection** - Consider branch protection rules on remote
5. **Pre-commit Hooks** - Can be used alongside this tool

### Git Configuration

Required for commits to work:

```powershell
# Check current config
git config user.name
git config user.email

# Set if needed
git config user.name "JARVIS"
git config user.email "jarvis@infinity-x.ai"
```

---

## 🐛 Troubleshooting

### "Python not found"
```powershell
# Activate virtual environment
C:\Users\JARVIS\OneDrive\Documents\docker_llm\.venv\Scripts\Activate.ps1
```

### "Git not initialized"
```powershell
# Initialize git in repository
cd <repo_path>
git init
git config user.name "Your Name"
git config user.email "your@email.com"
```

### "No changes to validate"
```powershell
# Check git status
git status

# Stage changes if needed
git add .
```

### "Push fails - authentication"
```powershell
# Configure git credentials
git config credential.helper manager-core

# Try push
git push origin main
```

### "Monitor keeps running"
```powershell
# Press Ctrl+C to stop
# Or end process
Stop-Process -Name python -Force
```

---

## 📊 Reports

### Validation Report
```json
{
  "timestamp": "2025-12-11T14:32:45",
  "repository": "C:\\Users\\JARVIS\\OneDrive\\Documents\\vision_cortex",
  "branch": "main",
  "user": "JARVIS",
  "files_validated": 3,
  "total_issues": 5,
  "total_errors": 2,
  "total_warnings": 3,
  "validation_logs": [
    {
      "file": "src/core/agent.py",
      "passed": false,
      "issue_count": 2,
      "error_count": 1,
      "warning_count": 1
    }
  ],
  "commit_logs": [
    {
      "timestamp": "2025-12-11T14:32:45",
      "message": "ci: code validation auto-commit",
      "files": 3,
      "pushed": true
    }
  ]
}
```

### Generate Report
```powershell
.\launch_validator.ps1 -Mode auto-push -Report "report_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
```

---

## 🔧 Advanced Usage

### Custom Config for Different Branches

```powershell
# Create branch-specific config
Copy-Item validator_config.json validator_config.dev.json

# Edit for dev settings
# ...

# Use custom config
.\launch_validator.ps1 -Mode continuous -Config validator_config.dev.json
```

### Integration with CI/CD

```powershell
# In GitHub Actions or similar
python auto_code_validator_agent.py --repo . --validate-only

# Only auto-commit on specific branches
if ($GITHUB_REF -match 'develop') {
    .\launch_validator.ps1 -Mode auto-push
}
```

### Scheduled Validation

Create a Windows scheduled task:

```powershell
# Create task
$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "C:\path\to\launch_validator.ps1 -Mode validate-only"

$trigger = New-ScheduledTaskTrigger -Daily -At 2am

Register-ScheduledTask `
  -TaskName "CodeValidator" `
  -Action $action `
  -Trigger $trigger `
  -RunLevel Highest
```

---

## 📈 Metrics & Monitoring

### Tracked Metrics

- **Validation Cycles** - Total validation runs
- **Auto Commits** - Successful auto-commits
- **Files Validated** - Python files checked
- **Issues Found** - Total validation issues
- **Errors** - Critical issues
- **Warnings** - Non-critical issues
- **Push Success Rate** - Percentage of successful pushes

### View Metrics

```powershell
# From monitor status
.\launch_validator.ps1 -Mode status

# From logs
Get-Content logs/validation_monitor.log | Where-Object { $_ -match "VALIDATOR" }
```

---

## 🎓 Use Cases

### 1. Continuous Integration
```powershell
# Auto-validate and push on every code change
.\launch_validator.ps1 -Mode continuous -Interval 5
```

### 2. Pre-Deployment Validation
```powershell
# Validate and report before deployment
.\launch_validator.ps1 -Mode validate-only -Report deployment_check.json
```

### 3. Feature Branch Testing
```powershell
# Auto-commit while developing features
git checkout -b feature/new-feature
.\launch_validator.ps1 -Mode auto-commit
```

### 4. Code Quality Enforcement
```powershell
# Ensure all code meets standards before merging
.\launch_validator.ps1 -Mode auto-push -Interval 10
```

---

## 🔗 Related Documentation

- **T1_ARCHITECTURE.md** - System architecture and design
- **T5_DEV_SETUP.md** - Development environment setup
- **T6_SECURITY.md** - Security best practices
- **T8_TROUBLESHOOTING.md** - Common issues and solutions

---

## 📞 Support

For issues or questions:

1. Check **Troubleshooting** section above
2. Review logs in `logs/validation_monitor.log`
3. Run with `--report` flag to save detailed output
4. Check git status: `git status --porcelain`

---

**Status: Production Ready** ✅

Last Updated: December 11, 2025
