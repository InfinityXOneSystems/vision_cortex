#!/usr/bin/env python3
"""
Vision Cortex - Interactive CLI Interface
Provides an interactive command-line interface for managing the entire system
Version: 1.0.0
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime
from unified_orchestrator import UnifiedOrchestrator
from auto_sop_agent import AutoSOPAgent
from sop_validator_refiner import SOPValidator, SOPRefiner


class VisionCortexCLI:
    """Interactive CLI for Vision Cortex"""
    
    def __init__(self, workspace_root: str = "."):
        """Initialize the CLI"""
        self.orchestrator = UnifiedOrchestrator(workspace_root)
        self.workspace_root = Path(workspace_root)
        self.sop_agent = AutoSOPAgent(workspace_root, Path(workspace_root) / "doc_system" / "sops")
        self.sop_validator = SOPValidator(validator_name="cli_validator")
        self.sop_refiner = SOPRefiner()
    
    def show_menu(self):
        """Display main menu"""
        print("\n" + "="*60)
        print("VISION CORTEX - UNIFIED SYSTEM")
        print("="*60)
        print("\n📚 DOCUMENTS")
        print("  1. Index a document")
        print("  2. Search documents")
        print("  3. Link documents")
        print("\n🗺️  ROADMAP")
        print("  4. Create roadmap item")
        print("  5. View roadmap progress")
        print("  6. Link document to roadmap")
        print("\n✅ TODOS")
        print("  7. Create todo")
        print("  8. Update todo")
        print("  9. View todo progress")
        print(" 10. Get todos by status")
        print("\n🔍 VALIDATION")
        print(" 11. Validate file")
        print(" 12. Validate directory")
        print(" 13. Validate and commit")
        print(" 14. View validation report")
        print("\n🔗 INTEGRATED WORK")
        print(" 15. Create complete work item (roadmap + todo + doc)")
        print(" 16. Complete work item")
        print(" 17. Get work item status")
        print("\n📋 SOP SYSTEM")
        print(" 22. List SOPs")
        print(" 23. Execute SOP")
        print(" 24. Create SOP from operations")
        print(" 25. Validate SOP")
        print(" 26. Refine SOP")
        print(" 27. View SOP metrics")
        print(" 28. View execution history")
        print(" 29. Export SOP report")
        print(" 30. Rebuild from SOP")
        print("\n📊 REPORTS")
        print(" 18. System status")
        print(" 19. Full system report")
        print(" 20. Export report to markdown")
        print("\n🏥 HEALTH")
        print(" 21. Health check")
        print("\n0. Exit")
        print("="*60)
    
    def run_interactive(self):
        """Run interactive CLI"""
        while True:
            self.show_menu()
            choice = input("\nEnter command number (0-30): ").strip()
            
            try:
                if choice == "0":
                    print("\n✅ Exiting Vision Cortex")
                    break
                elif choice == "1":
                    self._index_document()
                elif choice == "2":
                    self._search_documents()
                elif choice == "3":
                    self._link_documents()
                elif choice == "4":
                    self._create_roadmap_item()
                elif choice == "5":
                    self._view_roadmap_progress()
                elif choice == "6":
                    self._link_doc_to_roadmap()
                elif choice == "7":
                    self._create_todo()
                elif choice == "8":
                    self._update_todo()
                elif choice == "9":
                    self._view_todo_progress()
                elif choice == "10":
                    self._get_todos_by_status()
                elif choice == "11":
                    self._validate_file()
                elif choice == "12":
                    self._validate_directory()
                elif choice == "13":
                    self._validate_and_commit()
                elif choice == "14":
                    self._view_validation_report()
                elif choice == "15":
                    self._create_work_item()
                elif choice == "16":
                    self._complete_work_item()
                elif choice == "17":
                    self._get_work_item_status()
                elif choice == "18":
                    self._system_status()
                elif choice == "19":
                    self._full_system_report()
                elif choice == "20":
                    self._export_report()
                elif choice == "21":
                    self._health_check()
                elif choice == "22":
                    self._list_sops()
                elif choice == "23":
                    self._execute_sop()
                elif choice == "24":
                    self._create_sop_from_operations()
                elif choice == "25":
                    self._validate_sop()
                elif choice == "26":
                    self._refine_sop()
                elif choice == "27":
                    self._view_sop_metrics()
                elif choice == "28":
                    self._view_execution_history()
                elif choice == "29":
                    self._export_sop_report()
                elif choice == "30":
                    self._rebuild_from_sop()
                else:
                    print("❌ Invalid choice")
            
            except KeyboardInterrupt:
                print("\n\n⚠️  Interrupted by user")
                break
            except Exception as e:
                print(f"\n❌ Error: {str(e)}")
            
            input("\nPress Enter to continue...")
                    self._complete_work_item()
                elif choice == "17":
                    self._get_work_item_status()
                elif choice == "18":
                    self._system_status()
                elif choice == "19":
                    self._full_system_report()
                elif choice == "20":
                    self._export_report()
                elif choice == "21":
                    self._health_check()
                else:
                    print("❌ Invalid choice")
            
            except KeyboardInterrupt:
                print("\n\n⚠️  Interrupted by user")
                break
            except Exception as e:
                print(f"\n❌ Error: {str(e)}")
            
            input("\nPress Enter to continue...")
    
    def _index_document(self):
        """Index a document"""
        print("\n📚 INDEX DOCUMENT")
        doc_id = input("Document ID: ").strip()
        name = input("Document name: ").strip()
        path = input("File path: ").strip()
        doc_type = input("Type (markdown/json/plaintext/code): ").strip() or "markdown"
        description = input("Description: ").strip()
        tags = input("Tags (comma-separated): ").strip().split(',') if input("Tags (comma-separated): ").strip() else []
        
        # Read file content
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            success, message = self.orchestrator.index_document(
                doc_id, name, path, content, doc_type, description, tags
            )
            
            if success:
                print(f"\n✅ {message}")
            else:
                print(f"\n❌ {message}")
        
        except Exception as e:
            print(f"\n❌ Error reading file: {str(e)}")
    
    def _search_documents(self):
        """Search documents"""
        print("\n🔍 SEARCH DOCUMENTS")
        query = input("Search query: ").strip()
        tag_filter = input("Tag filter (optional): ").strip() or None
        
        results = self.orchestrator.search_documents(query, tag_filter=tag_filter)
        
        print(f"\n📌 Found {len(results)} documents:")
        for result in results[:10]:
            print(f"  - {result['name']} (ID: {result['doc_id']}, Score: {result['match_score']:.2f})")
    
    def _link_documents(self):
        """Link two documents"""
        print("\n🔗 LINK DOCUMENTS")
        doc_id_1 = input("First document ID: ").strip()
        doc_id_2 = input("Second document ID: ").strip()
        relationship = input("Relationship (related/depends-on/references): ").strip() or "related"
        
        success, message = self.orchestrator.link_documents(doc_id_1, doc_id_2, relationship)
        
        if success:
            print(f"\n✅ {message}")
        else:
            print(f"\n❌ {message}")
    
    def _create_roadmap_item(self):
        """Create a roadmap item"""
        print("\n🗺️  CREATE ROADMAP ITEM")
        item_id = input("Item ID: ").strip()
        section = input("Section (A-Z): ").strip()
        title = input("Title: ").strip()
        description = input("Description: ").strip()
        priority = int(input("Priority (1-4, 1=low): ").strip() or "2")
        estimated_effort = float(input("Estimated hours: ").strip() or "0")
        
        success, message = self.orchestrator.create_roadmap_item(
            item_id, section, title, description, priority, estimated_effort
        )
        
        if success:
            print(f"\n✅ {message}")
        else:
            print(f"\n❌ {message}")
    
    def _view_roadmap_progress(self):
        """View roadmap progress"""
        print("\n📊 ROADMAP PROGRESS")
        progress = self.orchestrator.get_roadmap_progress()
        
        print(f"\n📈 Overall Progress")
        print(f"  Total Items: {progress['total_items']}")
        print(f"  Completed: {progress['completed']}")
        print(f"  In Progress: {progress['in_progress']}")
        print(f"  Planned: {progress['planned']}")
        print(f"  Completion: {progress['completion_percent']:.1f}%")
        print(f"\n⏱️  Effort")
        print(f"  Estimated: {progress['total_estimated_hours']:.1f} hours")
        print(f"  Actual: {progress['total_actual_hours']:.1f} hours")
        print(f"  Efficiency: {progress['efficiency']:.1f}%")
    
    def _link_doc_to_roadmap(self):
        """Link document to roadmap"""
        print("\n🔗 LINK DOCUMENT TO ROADMAP")
        doc_id = input("Document ID: ").strip()
        roadmap_item_id = input("Roadmap item ID: ").strip()
        
        success, message = self.orchestrator.link_document_to_roadmap(doc_id, roadmap_item_id)
        
        if success:
            print(f"\n✅ {message}")
        else:
            print(f"\n❌ {message}")
    
    def _create_todo(self):
        """Create a todo"""
        print("\n✅ CREATE TODO")
        todo_id = input("Todo ID: ").strip()
        title = input("Title: ").strip()
        description = input("Description: ").strip()
        priority = int(input("Priority (1-4): ").strip() or "2")
        assigned_to = input("Assigned to (optional): ").strip()
        estimated_hours = float(input("Estimated hours: ").strip() or "0")
        tags = input("Tags (comma-separated): ").strip().split(',') if input("Tags (comma-separated): ").strip() else []
        
        success, message = self.orchestrator.create_todo(
            todo_id, title, description, priority, assigned_to,
            estimated_hours=estimated_hours, tags=tags
        )
        
        if success:
            print(f"\n✅ {message}")
        else:
            print(f"\n❌ {message}")
    
    def _update_todo(self):
        """Update a todo"""
        print("\n✏️  UPDATE TODO")
        todo_id = input("Todo ID: ").strip()
        status = input("Status (not-started/in-progress/blocked/in-review/completed): ").strip() or None
        progress = input("Progress percent (0-100, optional): ").strip()
        progress_percent = int(progress) if progress else None
        actual_hours = input("Actual hours (optional): ").strip()
        actual_hours = float(actual_hours) if actual_hours else None
        notes = input("Notes (optional): ").strip() or None
        
        success, message = self.orchestrator.update_todo(
            todo_id, status, progress_percent, actual_hours, notes
        )
        
        if success:
            print(f"\n✅ {message}")
        else:
            print(f"\n❌ {message}")
    
    def _view_todo_progress(self):
        """View todo progress"""
        print("\n📊 TODO PROGRESS")
        progress = self.orchestrator.get_todo_progress()
        
        print(f"\n📈 Overall Progress")
        print(f"  Total Todos: {progress['total_todos']}")
        print(f"  Completed: {progress['completed']}")
        print(f"  In Progress: {progress['in_progress']}")
        print(f"  Blocked: {progress['blocked']}")
        print(f"  Completion: {progress['completion_percent']:.1f}%")
        print(f"  Overdue: {progress['overdue_count']}")
    
    def _get_todos_by_status(self):
        """Get todos by status"""
        print("\n📋 TODOS BY STATUS")
        status = input("Status: ").strip()
        todos = self.orchestrator.get_todos_by_status(status)
        
        print(f"\n📌 {len(todos)} todos with status '{status}':")
        for todo in todos[:10]:
            print(f"  - {todo['title']} (Progress: {todo['progress_percent']}%)")
    
    def _validate_file(self):
        """Validate a file"""
        print("\n🔍 VALIDATE FILE")
        file_path = input("File path: ").strip()
        roadmap_id = input("Roadmap item ID (optional): ").strip() or None
        todo_id = input("Todo ID (optional): ").strip() or None
        
        success, message = self.orchestrator.validate_file(file_path, roadmap_id, todo_id)
        
        if success:
            print(f"\n✅ {message}")
        else:
            print(f"\n❌ {message}")
    
    def _validate_directory(self):
        """Validate a directory"""
        print("\n🔍 VALIDATE DIRECTORY")
        directory = input("Directory path: ").strip() or "."
        roadmap_id = input("Roadmap item ID (optional): ").strip() or None
        todo_id = input("Todo ID (optional): ").strip() or None
        
        validated, issues = self.orchestrator.validate_directory(directory, True, roadmap_id, todo_id)
        
        print(f"\n✅ Validated {validated} files with {issues} issues")
    
    def _validate_and_commit(self):
        """Validate and commit"""
        print("\n🔄 VALIDATE AND COMMIT")
        files = input("File paths (comma-separated, or leave empty for all): ").strip()
        file_paths = [f.strip() for f in files.split(',')] if files else None
        roadmap_id = input("Roadmap item ID (optional): ").strip() or None
        todo_id = input("Todo ID (optional): ").strip() or None
        auto_push = input("Auto push? (y/n): ").strip().lower() == 'y'
        
        success, message = self.orchestrator.validate_and_commit(file_paths, roadmap_id, todo_id, auto_push)
        
        if success:
            print(f"\n✅ {message}")
        else:
            print(f"\n❌ {message}")
    
    def _view_validation_report(self):
        """View validation report"""
        print("\n📊 VALIDATION REPORT")
        report = self.orchestrator.get_validation_report()
        
        print(f"\n📈 Summary")
        print(f"  Total Issues: {report['total_issues']}")
        print(f"  Critical: {report['critical']}")
        print(f"  Errors: {report['errors']}")
        print(f"  Warnings: {report['warnings']}")
        
        if report['by_type']:
            print(f"\n📋 By Type")
            for issue_type, count in report['by_type'].items():
                print(f"  - {issue_type}: {count}")
    
    def _create_work_item(self):
        """Create a complete work item"""
        print("\n🔗 CREATE COMPLETE WORK ITEM")
        roadmap_id = input("Roadmap item ID: ").strip()
        section = input("Section (A-Z): ").strip()
        title = input("Title: ").strip()
        description = input("Description: ").strip()
        todo_id = input("Todo ID: ").strip()
        doc_id = input("Document ID (optional): ").strip() or None
        priority = int(input("Priority (1-4): ").strip() or "2")
        estimated_hours = float(input("Estimated hours: ").strip() or "0")
        
        success, message = self.orchestrator.create_roadmap_work_item(
            roadmap_id, section, title, description, todo_id, doc_id or None,
            priority, estimated_hours
        )
        
        if success:
            print(f"\n✅ {message}")
        else:
            print(f"\n❌ {message}")
    
    def _complete_work_item(self):
        """Complete a work item"""
        print("\n✅ COMPLETE WORK ITEM")
        roadmap_id = input("Roadmap item ID: ").strip()
        todo_id = input("Todo ID: ").strip()
        actual_hours = float(input("Actual hours spent: ").strip() or "0")
        files = input("File paths to validate (comma-separated, optional): ").strip()
        file_paths = [f.strip() for f in files.split(',')] if files else None
        auto_push = input("Auto push? (y/n): ").strip().lower() == 'y'
        
        success, message = self.orchestrator.complete_work_item(
            roadmap_id, todo_id, actual_hours, file_paths, True, auto_push
        )
        
        if success:
            print(f"\n✅ {message}")
        else:
            print(f"\n❌ {message}")
    
    def _get_work_item_status(self):
        """Get work item status"""
        print("\n📊 WORK ITEM STATUS")
        roadmap_id = input("Roadmap item ID: ").strip()
        todo_id = input("Todo ID: ").strip()
        
        status = self.orchestrator.get_work_item_status(roadmap_id, todo_id)
        
        print(f"\n📋 Status")
        print(f"  Alignment: {status['status']}")
        print(f"  Roadmap Status: {status['progress']['roadmap_status']}")
        print(f"  Todo Status: {status['progress']['todo_status']}")
        print(f"  Todo Progress: {status['progress']['todo_progress']}%")
    
    def _system_status(self):
        """Show system status"""
        print("\n🏥 SYSTEM STATUS")
        status = self.orchestrator.health_check()
        
        print(f"\n✅ {status['status']}")
        print(f"  Documents: {status['components']['documents']}")
        print(f"  Roadmap Items: {status['components']['roadmap_items']}")
        print(f"  Todos: {status['components']['todos']}")
        print(f"  Validation Results: {status['components']['validation_results']}")
    
    def _full_system_report(self):
        """Generate full system report"""
        print("\n📊 FULL SYSTEM REPORT")
        report = self.orchestrator.generate_system_report()
        
        print(json.dumps(report, indent=2))
    
    def _export_report(self):
        """Export report to markdown"""
        print("\n📥 EXPORT REPORT")
        filepath = input("Output filepath (default: system_report.md): ").strip() or "system_report.md"
        
        success, message = self.orchestrator.export_complete_report(filepath)
        
        if success:
            print(f"\n✅ {message}")
        else:
            print(f"\n❌ {message}")
    
    def _health_check(self):
        """Run health check"""
        print("\n🏥 HEALTH CHECK")
        health = self.orchestrator.health_check()
        
        print(f"\n✅ System Health: {health['status']}")
        print(json.dumps(health['components'], indent=2))
    
    # ========== SOP SYSTEM COMMANDS ==========
    
    def _list_sops(self):
        """List available SOPs"""
        print("\n📋 LIST SOPs")
        component = input("Filter by component (optional): ").strip() or None
        status = input("Filter by status (optional, draft/validated/in_use/deprecated): ").strip() or None
        
        sops = self.sop_agent.list_sops(component, status)
        
        if not sops:
            print("\n  No SOPs found")
            return
        
        print(f"\n📌 Found {len(sops)} SOPs:")
        for sop in sops:
            print(f"  - {sop.name} (ID: {sop.sop_id})")
            print(f"    Version: {sop.version}, Status: {sop.status}")
            print(f"    Executions: {sop.execution_count}, Success Rate: {(sop.success_count/sop.execution_count*100 if sop.execution_count > 0 else 0):.1f}%")
    
    def _execute_sop(self):
        """Execute a SOP"""
        print("\n▶️  EXECUTE SOP")
        sop_id = input("SOP ID: ").strip()
        dry_run = input("Dry run? (y/n): ").strip().lower() == 'y'
        
        print(f"\nExecuting {sop_id} (dry_run={dry_run})...")
        success, execution = self.sop_agent.execute_sop(sop_id, dry_run)
        
        if success:
            print(f"\n✅ Execution successful")
            print(f"  Duration: {execution.duration_seconds:.1f}s")
            print(f"  Steps: {execution.steps_completed} completed")
            print(f"  Success Rate: {execution.success_rate * 100:.1f}%")
        else:
            print(f"\n❌ Execution failed")
            if execution.failed_steps:
                print(f"  Failed steps: {execution.failed_steps}")
            if execution.error:
                print(f"  Error: {execution.error}")
    
    def _create_sop_from_operations(self):
        """Create SOP from operations"""
        print("\n📝 CREATE SOP FROM OPERATIONS")
        sop_id = input("SOP ID: ").strip()
        name = input("SOP Name: ").strip()
        description = input("Description: ").strip()
        component = input("Component: ").strip()
        purpose = input("Purpose: ").strip()
        
        # For now, create empty operations list (in real use, would import from logs)
        print("\nNote: Operations must be provided as a list of dicts with 'command' and 'output'")
        operations = []
        
        while True:
            cmd = input("Add operation command (or press Enter to finish): ").strip()
            if not cmd:
                break
            operations.append({"command": cmd, "output": f"Output from {cmd}"})
        
        if not operations:
            print("❌ No operations provided")
            return
        
        success, message = self.sop_agent.create_sop_from_operations(
            sop_id, name, description, component, purpose, operations
        )
        
        if success:
            print(f"\n✅ {message}")
        else:
            print(f"\n❌ {message}")
    
    def _validate_sop(self):
        """Validate a SOP"""
        print("\n✓ VALIDATE SOP")
        sop_id = input("SOP ID: ").strip()
        
        print(f"\nValidating {sop_id}...")
        sop_data = self.sop_agent.get_sop(sop_id)
        
        if not sop_data:
            print(f"❌ SOP not found: {sop_id}")
            return
        
        validation_report = self.sop_validator.validate_sop_comprehensive(sop_data.__dict__)
        
        print(f"\n📊 Validation Report")
        print(f"  Quality Score: {validation_report.overall_quality_score:.1f}%")
        print(f"  Status: {'✅ APPROVED' if validation_report.is_approved else '❌ NOT APPROVED'}")
        print(f"  Findings: {validation_report.errors} errors, {validation_report.warnings} warnings, {validation_report.suggestions} suggestions")
        
        if validation_report.findings:
            print(f"\n  Issues:")
            for finding in validation_report.findings[:5]:  # Show first 5
                print(f"    - [{finding.finding_type.upper()}] {finding.message}")
                print(f"      → {finding.recommendation}")
    
    def _refine_sop(self):
        """Refine a SOP"""
        print("\n✏️  REFINE SOP")
        sop_id = input("SOP ID: ").strip()
        
        sop_data = self.sop_agent.get_sop(sop_id)
        if not sop_data:
            print(f"❌ SOP not found: {sop_id}")
            return
        
        # Get validation report to suggest improvements
        validation_report = self.sop_validator.validate_sop_comprehensive(sop_data.__dict__)
        
        if validation_report.is_approved:
            print("✅ SOP is already approved, no refinement needed")
            return
        
        # Show improvement suggestions
        improvements = self.sop_refiner.suggest_improvements(sop_data.__dict__, validation_report)
        
        if improvements:
            print(f"\n💡 Suggested improvements:")
            for imp in improvements[:3]:
                print(f"  Step {imp['step']}: {imp['suggested_improvement']}")
        
        # For now, just show the suggestions
        # In real use, would apply specific refinements
        print(f"\n  Apply these refinements manually and re-validate")
    
    def _view_sop_metrics(self):
        """View SOP metrics"""
        print("\n📊 SOP METRICS")
        sop_id = input("SOP ID: ").strip()
        
        sop_data = self.sop_agent.get_sop(sop_id)
        if not sop_data:
            print(f"❌ SOP not found: {sop_id}")
            return
        
        print(f"\n📈 Metrics for {sop_data.name}")
        print(f"  Total Executions: {sop_data.execution_count}")
        print(f"  Successful: {sop_data.success_count}")
        print(f"  Failed: {sop_data.failure_count}")
        
        if sop_data.execution_count > 0:
            success_rate = sop_data.success_count / sop_data.execution_count * 100
            print(f"  Success Rate: {success_rate:.1f}%")
        
        print(f"  Average Duration: {sop_data.average_duration:.1f}s")
        print(f"  Validation Level: {sop_data.validation_level}")
    
    def _view_execution_history(self):
        """View execution history"""
        print("\n📜 EXECUTION HISTORY")
        sop_id = input("SOP ID: ").strip()
        limit = int(input("Number of records to show (default: 10): ").strip() or "10")
        
        history = self.sop_agent.get_execution_history(sop_id, limit)
        
        if not history:
            print(f"\n  No execution history for {sop_id}")
            return
        
        print(f"\n📌 Last {len(history)} executions:")
        for execution in history:
            status_icon = "✅" if execution.status == "COMPLETED" else "❌"
            print(f"  {status_icon} {execution.execution_id}")
            print(f"    Status: {execution.status}, Duration: {execution.duration_seconds:.1f}s")
            print(f"    Steps: {execution.steps_completed}, Success: {execution.success_rate*100:.1f}%")
    
    def _export_sop_report(self):
        """Export SOP report"""
        print("\n📥 EXPORT SOP REPORT")
        sop_id = input("SOP ID: ").strip()
        filepath = input("Output filepath (default: {sop_id}_report.json): ").strip() or f"{sop_id}_report.json"
        
        success, message = self.sop_agent.export_sop_report(sop_id, filepath)
        
        if success:
            print(f"\n✅ {message}")
        else:
            print(f"\n❌ {message}")
    
    def _rebuild_from_sop(self):
        """Rebuild from SOP"""
        print("\n🔨 REBUILD FROM SOP")
        sop_id = input("SOP ID: ").strip()
        confirm = input("This will execute the SOP. Continue? (y/n): ").strip().lower() == 'y'
        
        if not confirm:
            print("Cancelled")
            return
        
        print(f"\nRebuilding from {sop_id}...")
        success, summary = self.sop_agent.rebuild_from_sop(sop_id)
        
        if success:
            print(f"\n✅ Rebuild successful")
            print(summary)
        else:
            print(f"\n❌ Rebuild failed")
            print(summary)



def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Vision Cortex - Unified System CLI"
    )
    parser.add_argument(
        "--workspace",
        default=".",
        help="Workspace root directory"
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        default=True,
        help="Run in interactive mode"
    )
    
    args = parser.parse_args()
    
    cli = VisionCortexCLI(args.workspace)
    
    if args.interactive:
        cli.run_interactive()


if __name__ == "__main__":
    main()
