# Vision Cortex - Complete Workflow Guide

## System Overview

Vision Cortex is a comprehensive automation system for managing code quality, git operations, workflows, SOPs, and complete work items. This guide shows how all components work together.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    VISION CORTEX SYSTEM                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              SYSTEM REQUIREMENTS (SYSTEM_REQUIREMENTS.yaml)    │
│  Single source of truth - all agents load at initialization  │
│  - System specs (Python 3.8+, Node ES2020+)                  │
│  - Git configuration (auto-push, conventional commits)       │
│  - Code validation rules                                      │
│  - AI/ML stack (Claude, OpenAI, Ollama)                      │
│  - Workflow definitions                                       │
│  - Security policies                                          │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    CORE COMPONENTS                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. DOCUMENTS                                                │
│     doc_index.py - Index, search, link documents            │
│     ├─ Index documents by ID and type                        │
│     ├─ Search with semantic matching                         │
│     └─ Link documents (related, depends-on, references)     │
│                                                               │
│  2. VALIDATION                                               │
│     code_validation_agent.py - Code quality checks           │
│     ├─ Validate syntax (Python, JavaScript, JSON, Markdown) │
│     ├─ Check for violations                                  │
│     ├─ Report issues with line numbers                       │
│     └─ Integration with git (auto-commit validation)         │
│                                                               │
│  3. ROADMAP & TODOS                                          │
│     task_management.py - Track work items                    │
│     ├─ Roadmap items with sections and progress             │
│     ├─ Todo tracking with status and priority               │
│     ├─ Link docs to roadmap items                            │
│     └─ Complete integrated work items                        │
│                                                               │
│  4. GIT AUTOMATION                                           │
│     auto_git_agent.py - Automated commit/push               │
│     ├─ Get git status (branch, ahead/behind, conflicts)     │
│     ├─ Stage files (git add)                                 │
│     ├─ Commit with conventional format                       │
│     │  Type(Component): Description                          │
│     │  - feat, fix, refactor, docs, style, test, chore     │
│     ├─ Push with retry logic (up to 3 retries)             │
│     └─ Get commit history                                    │
│                                                               │
│  5. WORKFLOWS                                                │
│     workflow_orchestrator.py - Multi-stage execution        │
│     ├─ 4 pre-defined workflows:                             │
│     │  - feature_development (8 stages)                      │
│     │  - bug_fix (5 stages)                                  │
│     │  - documentation (3 stages)                            │
│     │  - complete_work_item (5 stages)                       │
│     ├─ Stage dependencies (prevent out-of-order execution)  │
│     ├─ Automatic validation before stages                   │
│     ├─ Optional auto-commit and auto-push                   │
│     └─ Execution history with metrics                        │
│                                                               │
│  6. SOP SYSTEM                                               │
│     auto_sop_agent.py - Track everything as reusable SOPs   │
│     ├─ Create SOP from recorded operations                  │
│     ├─ Execute SOP with step tracking                       │
│     ├─ Maintain execution history with metrics              │
│     ├─ Enable complete rebuilds from SOP                    │
│     └─ Track: execution_count, success_count, avg_duration  │
│                                                               │
│     sop_validator_refiner.py - Quality assurance            │
│     ├─ Validate: structure, syntax, logic, efficiency       │
│     ├─ Generate quality score (0-100%)                       │
│     ├─ Suggest improvements with priority                    │
│     └─ Create refinement plans                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│            ORCHESTRATION & INTEGRATION                        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  EnhancedUnifiedOrchestrator.py - Central coordination       │
│  ├─ Initialize all components                                │
│  ├─ Validate system setup against SYSTEM_REQUIREMENTS       │
│  ├─ Execute integrated workflows with all agents             │
│  ├─ Auto-generate reports                                    │
│  └─ Export comprehensive system status                       │
│                                                               │
│  AgentConfigurationLoader.py - Distribute requirements       │
│  ├─ Load SYSTEM_REQUIREMENTS.yaml at startup                │
│  ├─ Build agent context with mandatory specs                │
│  ├─ Validate environment setup                               │
│  └─ Ensure all agents know what to use                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  INTERACTIVE CLI                             │
├──────────────────────────────────────────────────────────────┤
│  vision_cortex_cli.py - 30 interactive commands             │
│  ├─ Document commands: 1-3                                   │
│  ├─ Roadmap commands: 4-6                                    │
│  ├─ Todo commands: 7-10                                      │
│  ├─ Validation commands: 11-14                               │
│  ├─ Work item commands: 15-17                                │
│  ├─ SOP commands: 22-30                                      │
│  ├─ Report commands: 18-20                                   │
│  └─ Health commands: 21                                      │
└─────────────────────────────────────────────────────────────┘
```

## Complete Workflow Examples

### Example 1: Feature Development End-to-End

**Scenario**: Add a new feature to the system

**Steps**:

```
1. Plan Phase
   CLI: Create work item (roadmap + todo + doc)
   └─ Roadmap: "New Feature - In Progress"
   └─ Todo: "Implement new feature" 
   └─ Doc: "Feature specification"

2. Development Phase
   Manual: Write code in src/
   Automated: Code validation on save
   └─ Syntax check: ✓
   └─ Linting: ✓
   └─ Type check: ✓

3. Workflow Phase
   CLI: Execute "feature_development" workflow
   ├─ Stage 1: Plan ✓ (already done)
   ├─ Stage 2: Design ✓ (architecture defined)
   ├─ Stage 3: Implement ✓ (code written)
   ├─ Stage 4: Validate ✓ (auto validation)
   ├─ Stage 5: Review ✓ (peer review)
   ├─ Stage 6: Merge ✓ (merge to main)
   ├─ Stage 7: Document ✓ (update docs)
   └─ Stage 8: Complete ✓ (mark complete)

4. Git Phase (automatic)
   Auto Git Agent stages all files
   Auto Git Agent commits:
     "feat(new-feature): Add new feature support"
   Auto Git Agent pushes to remote
   └─ Result: Changes on GitHub

5. SOP Tracking Phase
   System creates SOP from feature workflow
   └─ "feature_development_sop_20240120"
   ├─ Steps: All workflow stages as SOP steps
   ├─ Status: DRAFT
   └─ Can be reused for future features

6. SOP Validation Phase
   SOP Validator checks SOP quality
   ├─ Structure validation: ✓
   ├─ Syntax validation: ✓
   ├─ Logic validation: ✓
   ├─ Efficiency validation: ✓
   ├─ Clarity validation: ✓
   └─ Quality score: 85% → APPROVED

7. Work Item Completion
   CLI: Complete work item
   ├─ Update Roadmap: "Completed"
   ├─ Update Todo: Status=Completed
   ├─ Update metrics (actual hours vs estimated)
   └─ Auto-commit and push

8. Future Reuse
   CLI: Execute SOP "feature_development_sop_20240120"
   └─ Completely replays feature development workflow
```

### Example 2: Bug Fix with Validation and Refinement

**Scenario**: Fix a critical bug

**Steps**:

```
1. Create Work Item
   CLI: Create todo for bug fix
   ├─ Title: "Fix critical memory leak"
   ├─ Priority: High
   ├─ Component: "memory-management"
   └─ Status: In Progress

2. Code Validation
   Manual: Write bug fix code
   Automatic: Code validation triggers
   ├─ Syntax check: ✓
   ├─ Logic check: ✓
   └─ No regressions: ✓

3. Commit and Push
   CLI: Validate and commit
   Auto Git Agent:
   ├─ Stages files
   ├─ Commits: "fix(memory): Prevent memory leak in cache"
   └─ Pushes to remote

4. Create Bug Fix SOP
   System extracts operations from git history
   ├─ Operation 1: "git checkout -b fix/memory-leak"
   ├─ Operation 2: "Edit file"
   ├─ Operation 3: "npm run test"
   └─ Operation 4: "git commit & push"

5. Validate Bug Fix SOP
   SOP Validator runs comprehensive check
   ├─ Structure: ✓ (all steps present)
   ├─ Syntax: ⚠️ (warning on cleanup step)
   ├─ Logic: ✓
   ├─ Efficiency: ✓
   └─ Quality: 82% → APPROVED with warnings

6. Refine SOP
   SOP Refiner suggests improvements
   ├─ Suggestion: Add rollback procedure for cleanup
   ├─ Suggestion: Improve timeout on tests
   └─ Apply refinements → Version 1.0.1

7. Future Bug Fixes
   CLI: Execute bug fix SOP
   ├─ Replays same steps
   ├─ Applies same validation
   ├─ Tracks execution metrics
   └─ Success rate increases with each run

8. Certification
   After 50+ successful executions at 99%+ success rate
   ├─ Validation level: CERTIFIED
   ├─ Can be used for critical infrastructure
   └─ Automated in CI/CD pipeline
```

### Example 3: Disaster Recovery

**Scenario**: System completely fails, need to rebuild

**Steps**:

```
1. Assess Situation
   System down, need to restore
   └─ We have complete SOP library

2. Identify Relevant SOPs
   CLI: List SOPs
   ├─ deploy_infrastructure_sop (validation: CERTIFIED)
   ├─ setup_database_sop (validation: CERTIFIED)
   ├─ deploy_services_sop (validation: CERTIFIED)
   └─ configure_monitoring_sop (validation: STRICT)

3. Execute SOPs in Order
   CLI: Rebuild from SOP
   ├─ Execute: deploy_infrastructure_sop
   │  └─ All AWS resources recreated (success rate: 100%)
   ├─ Execute: setup_database_sop
   │  └─ Database restored and migrated (success rate: 99%)
   ├─ Execute: deploy_services_sop
   │  └─ All services deployed (success rate: 98%)
   └─ Execute: configure_monitoring_sop
      └─ Monitoring re-enabled (success rate: 95%)

4. Verify System
   Health check confirms all systems operational
   └─ System restored from SOPs

5. Post-Recovery
   Document what went wrong
   Create SOP for future prevention
   ├─ "disaster_prevention_sop"
   └─ Add to critical path
```

## Data Flow

### Feature Development Complete Flow

```
Developer Code
    ↓
Code Validation Agent
    ├─ Syntax check
    ├─ Lint check
    └─ Type check
    ↓
SYSTEM_REQUIREMENTS validation
    └─ Must meet mandatory requirements
    ↓
Auto Git Agent
    ├─ Stage files (git add)
    ├─ Generate commit message (conventional)
    └─ Push to remote
    ↓
Operations recorded
    ↓
Auto SOP Agent
    ├─ Extract operations
    ├─ Create SOP
    └─ Version 1.0.0, Status: DRAFT
    ↓
SOP Validator
    ├─ Multi-level validation
    ├─ Quality score calculation
    └─ Status update if approved
    ↓
SOP Refiner (if needed)
    ├─ Suggest improvements
    ├─ Apply refinements
    └─ Increment version (1.0.0 → 1.0.1)
    ↓
SOP stored in doc_system/sops/
    └─ Ready for future execution
```

## Key Integration Points

### 1. SYSTEM_REQUIREMENTS.yaml → All Agents
```
Every agent loads this at initialization:
├─ auto_git_agent: Uses git config, commit format
├─ code_validation_agent: Uses validation rules
├─ workflow_orchestrator: Uses workflow definitions
├─ auto_sop_agent: Uses SOP requirements
└─ enhanced_orchestrator: Validates against requirements
```

### 2. Code Change → Auto Validation
```
File saved/committed
    ↓
Auto validator checks
    ├─ Syntax errors?
    ├─ Linting issues?
    ├─ Missing tests?
    └─ Type errors?
    ↓
If valid: Auto-stage and commit
If invalid: Report issues and request fix
```

### 3. Workflow → SOP Creation
```
Workflow execution completes
    ↓
Operations extracted
    ↓
Auto SOP Agent creates SOP
    └─ Enables replay of same workflow
```

### 4. Execution History → Metrics
```
SOP executed
    ↓
Metrics recorded:
    ├─ execution_id, timestamps, duration
    ├─ steps_completed, success_rate
    └─ failed_steps, output
    ↓
SOP definition updated:
    ├─ execution_count += 1
    ├─ success_count += 1 (if successful)
    ├─ average_duration recalculated
    └─ validation_level increased (if thresholds met)
```

### 5. Validation Feedback → Refinement
```
SOP validated
    ↓
Issues found?
    ├─ Yes: Create refinement plan
    │   ├─ Apply fixes
    │   ├─ Increment version
    │   └─ Re-validate
    │       ├─ Pass: Approved
    │       └─ Fail: Continue refining
    └─ No: Mark VALIDATED
```

## Critical Operations

### Validate and Commit
```python
# CLI: Option 13
orchestrator.validate_and_commit(
    files=["src/file.py"],
    roadmap_id="feat_123",
    todo_id="todo_456",
    auto_push=True
)

Process:
1. Validate each file
2. Stage valid files
3. Generate commit message
4. Commit
5. Push to remote
6. Update todo status
7. Update roadmap progress
```

### Execute Workflow
```python
# CLI: Option from workflow menu
orchestrator.execute_feature_workflow(
    feature_name="new_feature",
    component="auth"
)

Process:
1. Initialize all agents
2. Load SYSTEM_REQUIREMENTS
3. Execute each workflow stage
4. Validate code at each step
5. Auto-commit validated code
6. Track metrics
7. Update work items
8. Create SOP from operations
```

### Rebuild from SOP
```python
# CLI: Option 30
sop_agent.rebuild_from_sop("deployment_sop")

Process:
1. Load SOP definition
2. Validate dependencies
3. Execute each step
4. Validate each step output
5. Track execution metrics
6. Update SOP statistics
7. Generate report
```

## File Organization

```
vision_cortex/
├── SYSTEM_REQUIREMENTS.yaml          # Single source of truth
├── README.md
├── package.json
├── tsconfig.json
├── jest.config.js
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── infra/                             # Infrastructure as Code
│   └── *.tf files
│
├── scripts/                           # Automation scripts
│   ├── sync-gcs-bucket.ps1
│   ├── sync-secrets.ps1
│   └── sync-tri-directional.ps1
│
├── src/                               # Source code
│   ├── api/
│   ├── utils/
│   └── vision-cortex/
│       └── crawlers/
│
└── doc_system/                        # Vision Cortex system
    ├── auto_git_agent.py              # Git automation
    ├── auto_sop_agent.py              # SOP tracking
    ├── code_validation_agent.py       # Code validation
    ├── doc_index.py                   # Document indexing
    ├── task_management.py             # Roadmap & todos
    ├── unified_orchestrator.py        # Core orchestration
    ├── enhanced_unified_orchestrator.py # Extended orchestration
    ├── agent_config_loader.py         # Config distribution
    ├── sop_validator_refiner.py       # SOP validation
    ├── workflow_orchestrator.py       # Workflow execution
    ├── vision_cortex_cli.py           # Interactive CLI
    │
    ├── WORKFLOW_AND_AUTOCOMMIT_GUIDE.md
    ├── SOP_SYSTEM_GUIDE.md
    ├── SOP_SYSTEM_SUMMARY.md
    │
    ├── sops/                          # SOP storage
    │   ├── {sop_id}.json
    │   └── ...
    │
    ├── sop_executions/                # Execution records
    │   ├── {execution_id}.json
    │   └── ...
    │
    ├── documents/                     # Indexed documents
    ├── validation_reports/            # Validation results
    └── logs/                          # System logs
```

## Starting the System

### Initialize System
```bash
# Load configuration and initialize all components
python doc_system/vision_cortex_cli.py --workspace . --interactive
```

### Run Specific Command
```bash
# Execute a single operation
python doc_system/vision_cortex_cli.py --workspace .

# Then select from menu:
# 1-3: Documents
# 4-6: Roadmap
# 7-10: Todos
# 11-14: Validation
# 15-17: Work items
# 22-30: SOP system
# 18-20: Reports
# 21: Health check
```

### CLI Workflow Example
```
$ python doc_system/vision_cortex_cli.py --interactive

VISION CORTEX - UNIFIED SYSTEM
[menu displayed]

> 15  # Create complete work item
  Title: Implement new API endpoint
  Component: api
  [work item created]

> 13  # Validate and commit
  [code validated and committed]

> 23  # Execute SOP
  [SOP executed and metrics updated]

> 29  # Export SOP report
  [comprehensive report generated]
```

## Monitoring and Metrics

### System Health
```
✅ Documents: 45 indexed
✅ Roadmap: 12 items (8 completed)
✅ Todos: 34 items (28 completed)
✅ Validations: 312 total (8 issues)
✅ SOPs: 23 total (19 VALIDATED, 4 CERTIFIED)
✅ Git: Main branch, 42 commits ahead of origin
```

### SOP Metrics
```
Per SOP:
├─ Execution Count: How many times run
├─ Success Count: Successful runs
├─ Failure Count: Failed runs
├─ Success Rate: % successful
├─ Average Duration: Mean execution time
└─ Validation Level: PERMISSIVE → CERTIFIED

System-wide:
├─ Total SOPs: 23
├─ Certified SOPs: 4
├─ Avg success rate: 94.2%
└─ Avg execution time: 48.3s
```

## Troubleshooting

### SOP Validation Fails
```
1. Review validation findings
2. Check error details
3. Refine SOP using suggestions
4. Re-validate
5. Increment version
```

### Workflow Execution Fails
```
1. Check stage-specific error
2. Review validation report
3. Fix issues in code
4. Re-validate
5. Re-execute workflow
```

### Git Push Fails
```
1. Auto Git Agent retries up to 3 times
2. Check network connectivity
3. Check git credentials
4. Check branch permissions
5. Manual push if needed
```

## Best Practices

### 1. Always Validate Before Commit
```
✓ Use CLI option 13 (Validate and commit)
✓ Don't bypass validation
✓ Fix issues immediately
```

### 2. Use Workflows for Complex Operations
```
✓ Don't execute stages manually
✓ Use predefined workflows
✓ Create SOPs from successful workflows
```

### 3. Validate SOPs Before Using
```
✓ Create SOP from operations
✓ Run validation
✓ Fix issues
✓ Mark VALIDATED
✓ Then use for replication
```

### 4. Track All Changes
```
✓ Use git operations automatically
✓ Create SOPs from operations
✓ Maintain execution history
✓ Generate reports regularly
```

### 5. Continuous Improvement
```
✓ Review SOP execution failures
✓ Refine based on validation feedback
✓ Monitor success rates
✓ Increase validation level over time
```

---

**Version**: 1.0.0  
**Status**: ✅ PRODUCTION READY  
**Last Updated**: 2024
