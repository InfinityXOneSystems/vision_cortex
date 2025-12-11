"""
SOP VALIDATOR AND REFINER - Validates SOPs and refines through feedback
Ensures quality and continuous improvement of Standard Operating Procedures
"""

import json
import logging
from dataclasses import dataclass, asdict, field
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
from pathlib import Path
from enum import Enum


class ValidationFinding(Enum):
    """Types of validation findings"""
    ERROR = "error"              # Must be fixed
    WARNING = "warning"          # Should be reviewed
    INFO = "info"                # FYI
    SUGGESTION = "suggestion"    # Could be improved


@dataclass
class ValidationFinding:
    """A validation finding"""
    finding_id: str
    sop_id: str
    finding_type: str  # error, warning, info, suggestion
    category: str  # structure, syntax, logic, efficiency, clarity
    step_number: Optional[int]
    message: str
    recommendation: str
    severity: int  # 1-5, 5 being most severe
    fixed: bool = False


@dataclass
class ValidationReport:
    """Complete validation report"""
    validation_id: str
    sop_id: str
    sop_version: str
    validation_date: str
    validator_name: str
    total_findings: int
    errors: int
    warnings: int
    infos: int
    suggestions: int
    overall_quality_score: float  # 0-100
    is_approved: bool
    findings: List[ValidationFinding] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    refinement_plan: Dict[str, Any] = field(default_factory=dict)


class SOPValidator:
    """Validates SOP quality and correctness"""
    
    def __init__(self, validator_name: str = "validator"):
        """Initialize SOP validator
        
        Args:
            validator_name: Name of the validator
        """
        self.validator_name = validator_name
        self.logger = self._setup_logging()
        self.validation_history: List[ValidationReport] = []
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging"""
        logger = logging.getLogger("SOPValidator")
        logger.setLevel(logging.INFO)
        
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)
        formatter = logging.Formatter('[%(asctime)s] %(levelname)s - %(message)s')
        ch.setFormatter(formatter)
        logger.addHandler(ch)
        
        return logger
    
    def validate_sop_comprehensive(self, sop_data: Dict, execution_results: Dict = None) -> ValidationReport:
        """Comprehensive SOP validation
        
        Args:
            sop_data: SOP definition dict
            execution_results: Results from execution (optional)
            
        Returns:
            ValidationReport
        """
        validation_id = f"val_{sop_data['sop_id']}_{int(datetime.now().timestamp())}"
        
        self.logger.info(f"Starting comprehensive validation of {sop_data['sop_id']}")
        
        findings = []
        
        # Run validation checks
        findings.extend(self._check_structure(sop_data))
        findings.extend(self._check_syntax(sop_data))
        findings.extend(self._check_logic(sop_data))
        findings.extend(self._check_efficiency(sop_data))
        findings.extend(self._check_clarity(sop_data))
        
        # If execution results available, check them
        if execution_results:
            findings.extend(self._check_execution(sop_data, execution_results))
        
        # Calculate metrics
        errors = sum(1 for f in findings if f.finding_type == "error")
        warnings = sum(1 for f in findings if f.finding_type == "warning")
        infos = sum(1 for f in findings if f.finding_type == "info")
        suggestions = sum(1 for f in findings if f.finding_type == "suggestion")
        
        # Calculate quality score (0-100)
        # Deduct points for each finding based on severity
        quality_score = 100.0
        for finding in findings:
            if finding.finding_type == "error":
                quality_score -= finding.severity * 2
            elif finding.finding_type == "warning":
                quality_score -= finding.severity * 1
            elif finding.finding_type == "suggestion":
                quality_score -= 0.5
        
        quality_score = max(0, quality_score)
        
        # Determine approval
        is_approved = errors == 0 and quality_score >= 80
        
        # Generate recommendations
        recommendations = self._generate_recommendations(findings)
        
        # Generate refinement plan
        refinement_plan = self._create_refinement_plan(findings)
        
        report = ValidationReport(
            validation_id=validation_id,
            sop_id=sop_data["sop_id"],
            sop_version=sop_data["version"],
            validation_date=datetime.now().isoformat(),
            validator_name=self.validator_name,
            total_findings=len(findings),
            errors=errors,
            warnings=warnings,
            infos=infos,
            suggestions=suggestions,
            overall_quality_score=quality_score,
            is_approved=is_approved,
            findings=findings,
            recommendations=recommendations,
            refinement_plan=refinement_plan
        )
        
        self.validation_history.append(report)
        
        # Log summary
        status = "✓ APPROVED" if is_approved else "✗ NOT APPROVED"
        self.logger.info(f"{status} - Quality: {quality_score:.1f}% ({errors}E, {warnings}W, {suggestions}S)")
        
        return report
    
    def _check_structure(self, sop_data: Dict) -> List[ValidationFinding]:
        """Check SOP structure"""
        findings = []
        
        # Check required fields
        required_fields = ["sop_id", "name", "version", "description", "component", "steps"]
        for field in required_fields:
            if field not in sop_data or not sop_data[field]:
                findings.append(ValidationFinding(
                    finding_id=f"STR_001_{sop_data['sop_id']}",
                    sop_id=sop_data["sop_id"],
                    finding_type="error",
                    category="structure",
                    step_number=None,
                    message=f"Missing required field: {field}",
                    recommendation=f"Add {field} to SOP definition",
                    severity=5
                ))
        
        # Check steps exist and are numbered
        steps = sop_data.get("steps", [])
        if not steps:
            findings.append(ValidationFinding(
                finding_id=f"STR_002_{sop_data['sop_id']}",
                sop_id=sop_data["sop_id"],
                finding_type="error",
                category="structure",
                step_number=None,
                message="SOP has no steps",
                recommendation="Add at least one step to the SOP",
                severity=5
            ))
        
        # Check step numbering
        for i, step in enumerate(steps, 1):
            if step.get("step_number") != i:
                findings.append(ValidationFinding(
                    finding_id=f"STR_003_{sop_data['sop_id']}_step{i}",
                    sop_id=sop_data["sop_id"],
                    finding_type="error",
                    category="structure",
                    step_number=i,
                    message=f"Step numbering is incorrect at position {i}",
                    recommendation=f"Renumber step to {i}",
                    severity=4
                ))
        
        return findings
    
    def _check_syntax(self, sop_data: Dict) -> List[ValidationFinding]:
        """Check SOP syntax"""
        findings = []
        steps = sop_data.get("steps", [])
        
        for step in steps:
            step_num = step.get("step_number")
            
            # Check command syntax
            if not step.get("command"):
                findings.append(ValidationFinding(
                    finding_id=f"SYN_001_{sop_data['sop_id']}_step{step_num}",
                    sop_id=sop_data["sop_id"],
                    finding_type="error",
                    category="syntax",
                    step_number=step_num,
                    message="Step has no command",
                    recommendation="Add a command to this step",
                    severity=5
                ))
            
            # Check name
            if not step.get("name"):
                findings.append(ValidationFinding(
                    finding_id=f"SYN_002_{sop_data['sop_id']}_step{step_num}",
                    sop_id=sop_data["sop_id"],
                    finding_type="error",
                    category="syntax",
                    step_number=step_num,
                    message="Step has no name",
                    recommendation="Add a descriptive name to this step",
                    severity=4
                ))
            
            # Check description
            if not step.get("description"):
                findings.append(ValidationFinding(
                    finding_id=f"SYN_003_{sop_data['sop_id']}_step{step_num}",
                    sop_id=sop_data["sop_id"],
                    finding_type="warning",
                    category="syntax",
                    step_number=step_num,
                    message="Step has no description",
                    recommendation="Add a description explaining what this step does",
                    severity=3
                ))
        
        return findings
    
    def _check_logic(self, sop_data: Dict) -> List[ValidationFinding]:
        """Check SOP logic and dependencies"""
        findings = []
        steps = sop_data.get("steps", [])
        step_numbers = {s.get("step_number") for s in steps}
        
        for step in steps:
            step_num = step.get("step_number")
            dependencies = step.get("dependencies", [])
            
            # Check dependencies are valid
            for dep in dependencies:
                if dep not in step_numbers:
                    findings.append(ValidationFinding(
                        finding_id=f"LOG_001_{sop_data['sop_id']}_step{step_num}",
                        sop_id=sop_data["sop_id"],
                        finding_type="error",
                        category="logic",
                        step_number=step_num,
                        message=f"Dependency references non-existent step: {dep}",
                        recommendation=f"Remove or fix reference to step {dep}",
                        severity=5
                    ))
                
                # Check dependencies are not circular
                if dep >= step_num:
                    findings.append(ValidationFinding(
                        finding_id=f"LOG_002_{sop_data['sop_id']}_step{step_num}",
                        sop_id=sop_data["sop_id"],
                        finding_type="error",
                        category="logic",
                        step_number=step_num,
                        message=f"Circular or forward dependency: step {step_num} depends on step {dep}",
                        recommendation="Reorder steps to remove circular dependencies",
                        severity=5
                    ))
        
        return findings
    
    def _check_efficiency(self, sop_data: Dict) -> List[ValidationFinding]:
        """Check SOP efficiency"""
        findings = []
        steps = sop_data.get("steps", [])
        
        # Check step count (too many/too few)
        if len(steps) > 50:
            findings.append(ValidationFinding(
                finding_id=f"EFF_001_{sop_data['sop_id']}",
                sop_id=sop_data["sop_id"],
                finding_type="warning",
                category="efficiency",
                step_number=None,
                message=f"SOP has {len(steps)} steps, which may be too many",
                recommendation="Consider breaking into smaller SOPs",
                severity=2
            ))
        
        if len(steps) < 1:
            findings.append(ValidationFinding(
                finding_id=f"EFF_002_{sop_data['sop_id']}",
                sop_id=sop_data["sop_id"],
                finding_type="info",
                category="efficiency",
                step_number=None,
                message="SOP has very few steps",
                recommendation="Consider if this is complex enough to warrant a SOP",
                severity=1
            ))
        
        # Check for long timeouts
        for step in steps:
            timeout = step.get("timeout_seconds", 300)
            if timeout > 3600:
                findings.append(ValidationFinding(
                    finding_id=f"EFF_003_{sop_data['sop_id']}_step{step.get('step_number')}",
                    sop_id=sop_data["sop_id"],
                    finding_type="suggestion",
                    category="efficiency",
                    step_number=step.get("step_number"),
                    message=f"Step has very long timeout: {timeout}s",
                    recommendation="Review if timeout can be reduced",
                    severity=1
                ))
        
        return findings
    
    def _check_clarity(self, sop_data: Dict) -> List[ValidationFinding]:
        """Check SOP clarity and documentation"""
        findings = []
        
        # Check description length
        if len(sop_data.get("description", "")) < 20:
            findings.append(ValidationFinding(
                finding_id=f"CLR_001_{sop_data['sop_id']}",
                sop_id=sop_data["sop_id"],
                finding_type="suggestion",
                category="clarity",
                step_number=None,
                message="SOP description is too short",
                recommendation="Provide a more detailed description of the SOP purpose",
                severity=1
            ))
        
        # Check prerequisites
        if not sop_data.get("prerequisites"):
            findings.append(ValidationFinding(
                finding_id=f"CLR_002_{sop_data['sop_id']}",
                sop_id=sop_data["sop_id"],
                finding_type="suggestion",
                category="clarity",
                step_number=None,
                message="SOP has no prerequisites listed",
                recommendation="Add prerequisites section if applicable",
                severity=1
            ))
        
        # Check step descriptions are clear
        steps = sop_data.get("steps", [])
        for step in steps:
            desc = step.get("description", "")
            if len(desc) < 10:
                findings.append(ValidationFinding(
                    finding_id=f"CLR_003_{sop_data['sop_id']}_step{step.get('step_number')}",
                    sop_id=sop_data["sop_id"],
                    finding_type="suggestion",
                    category="clarity",
                    step_number=step.get("step_number"),
                    message="Step description is too short",
                    recommendation="Provide more detail about what this step accomplishes",
                    severity=1
                ))
        
        return findings
    
    def _check_execution(self, sop_data: Dict, execution_results: Dict) -> List[ValidationFinding]:
        """Check SOP based on execution results"""
        findings = []
        
        if execution_results.get("status") == "FAILED":
            failed_steps = execution_results.get("failed_steps", [])
            for step_num in failed_steps:
                findings.append(ValidationFinding(
                    finding_id=f"EXE_001_{sop_data['sop_id']}_step{step_num}",
                    sop_id=sop_data["sop_id"],
                    finding_type="error",
                    category="logic",
                    step_number=step_num,
                    message=f"Step {step_num} failed during execution",
                    recommendation="Review and fix the command in this step",
                    severity=5
                ))
        
        return findings
    
    def _generate_recommendations(self, findings: List[ValidationFinding]) -> List[str]:
        """Generate recommendations based on findings"""
        recommendations = []
        
        errors = [f for f in findings if f.finding_type == "error"]
        if errors:
            recommendations.append(f"Fix {len(errors)} critical errors before using SOP")
        
        warnings = [f for f in findings if f.finding_type == "warning"]
        if warnings:
            recommendations.append(f"Review {len(warnings)} warnings for quality improvement")
        
        suggestions = [f for f in findings if f.finding_type == "suggestion"]
        if suggestions:
            recommendations.append(f"Consider {len(suggestions)} suggestions for optimization")
        
        return recommendations
    
    def _create_refinement_plan(self, findings: List[ValidationFinding]) -> Dict[str, Any]:
        """Create refinement plan from findings"""
        plan = {
            "priority_fixes": [],
            "quality_improvements": [],
            "timeline": "immediate for errors, next iteration for suggestions"
        }
        
        for finding in findings:
            if finding.finding_type == "error":
                plan["priority_fixes"].append({
                    "step": finding.step_number,
                    "issue": finding.message,
                    "action": finding.recommendation
                })
            else:
                plan["quality_improvements"].append({
                    "step": finding.step_number,
                    "category": finding.category,
                    "suggestion": finding.recommendation
                })
        
        return plan


class SOPRefiner:
    """Refines SOPs based on validation feedback"""
    
    def __init__(self):
        """Initialize SOP refiner"""
        self.logger = self._setup_logging()
        self.refinement_history: List[Dict] = []
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging"""
        logger = logging.getLogger("SOPRefiner")
        logger.setLevel(logging.INFO)
        
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)
        formatter = logging.Formatter('[%(asctime)s] %(levelname)s - %(message)s')
        ch.setFormatter(formatter)
        logger.addHandler(ch)
        
        return logger
    
    def refine_from_validation(self, sop_data: Dict, validation_report: ValidationReport) -> Dict:
        """Refine SOP based on validation report
        
        Args:
            sop_data: Current SOP definition
            validation_report: Validation report with findings
            
        Returns:
            Refined SOP definition
        """
        self.logger.info(f"Refining SOP {sop_data['sop_id']} based on validation")
        
        refined_sop = sop_data.copy()
        refinements = []
        
        # Apply automatic fixes for certain findings
        for finding in validation_report.findings:
            if finding.finding_type == "error":
                # Try to auto-fix
                fixed, refinement = self._apply_auto_fix(refined_sop, finding)
                if fixed:
                    refinements.append(refinement)
                    self.logger.info(f"  Auto-fixed: {finding.message}")
        
        # Record refinement
        self.refinement_history.append({
            "timestamp": datetime.now().isoformat(),
            "sop_id": sop_data["sop_id"],
            "validation_id": validation_report.validation_id,
            "refinements_applied": len(refinements),
            "details": refinements
        })
        
        return refined_sop
    
    def _apply_auto_fix(self, sop_data: Dict, finding: ValidationFinding) -> Tuple[bool, Dict]:
        """Apply automatic fix for a finding
        
        Args:
            sop_data: SOP definition
            finding: Finding to fix
            
        Returns:
            (was_fixed, refinement_details)
        """
        # This is where specific fixes would be applied
        # For now, just return placeholder
        return False, {"message": "Manual review required"}
    
    def interactive_refinement(self, sop_data: Dict, validation_report: ValidationReport) -> Dict:
        """Interactive refinement guided by validation report
        
        Args:
            sop_data: Current SOP
            validation_report: Validation findings
            
        Returns:
            Refined SOP
        """
        self.logger.info(f"Starting interactive refinement for {sop_data['sop_id']}")
        
        refined_sop = sop_data.copy()
        
        # Present findings and get feedback
        for finding in validation_report.findings:
            if finding.finding_type == "error":
                self.logger.warning(f"[ERROR] {finding.message}")
                self.logger.info(f"  Recommendation: {finding.recommendation}")
        
        return refined_sop
    
    def suggest_improvements(self, sop_data: Dict, validation_report: ValidationReport) -> List[Dict]:
        """Suggest SOP improvements
        
        Args:
            sop_data: SOP definition
            validation_report: Validation report
            
        Returns:
            List of improvement suggestions
        """
        improvements = []
        
        for finding in validation_report.findings:
            if finding.finding_type in ["suggestion", "warning"]:
                improvements.append({
                    "step": finding.step_number,
                    "category": finding.category,
                    "current_issue": finding.message,
                    "suggested_improvement": finding.recommendation,
                    "priority": "high" if finding.severity >= 4 else "medium" if finding.severity >= 2 else "low"
                })
        
        return improvements


if __name__ == "__main__":
    # Example usage
    validator = SOPValidator(validator_name="test_validator")
    
    # Example SOP data
    sop_data = {
        "sop_id": "test_sop",
        "name": "Test SOP",
        "version": "1.0.0",
        "description": "A test SOP for validation",
        "component": "test",
        "steps": [
            {
                "step_number": 1,
                "name": "Step 1",
                "description": "First step",
                "command": "echo 'hello'"
            },
            {
                "step_number": 2,
                "name": "Step 2",
                "description": "Second step",
                "command": "echo 'world'",
                "dependencies": [1]
            }
        ]
    }
    
    # Validate
    report = validator.validate_sop_comprehensive(sop_data)
    print(f"\nValidation Report: {report.sop_id}")
    print(f"Quality Score: {report.overall_quality_score:.1f}%")
    print(f"Status: {'APPROVED' if report.is_approved else 'NOT APPROVED'}")
    print(f"Findings: {report.total_findings}")
