"""
Document Evolve System - Evolves and improves documents over time

Supports:
- Version control
- Automated improvements
- Content suggestions
- Quality scoring
- Historical tracking
"""

import difflib
import json
import logging
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class DocVersion:
    """Document version"""

    version_id: str
    doc_id: str
    version_number: int
    timestamp: str
    content: str
    change_summary: str
    quality_score: float
    improvements: List[str]
    author: str = "system"


class DocEvolveSystem:
    """Evolves and improves documents"""

    def __init__(self, versions_dir: str = "docs_versions"):
        """Initialize evolve system"""
        self.versions_dir = Path(versions_dir)
        self.versions_dir.mkdir(parents=True, exist_ok=True)
        self.versions_index = self.versions_dir / "versions.json"
        self.versions: Dict[str, List[DocVersion]] = self._load_versions()

    def _load_versions(self) -> Dict[str, List[DocVersion]]:
        """Load version history"""
        if self.versions_index.exists():
            try:
                with open(self.versions_index, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return {
                        k: [DocVersion(**v) for v in versions]
                        for k, versions in data.items()
                    }
            except Exception as e:
                logger.error(f"Failed to load versions: {e}")
        return {}

    def _save_versions(self):
        """Save version history"""
        try:
            with open(self.versions_index, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        k: [asdict(v) for v in versions]
                        for k, versions in self.versions.items()
                    },
                    f,
                    indent=2,
                )
        except Exception as e:
            logger.error(f"Failed to save versions: {e}")

    def _calculate_quality_score(self, content: str) -> float:
        """Calculate document quality score (0-100)"""
        score = 100.0

        # Check for empty content
        if not content or len(content.strip()) == 0:
            return 0.0

        # Deduct for poor structure
        if "\n## " not in content:
            score -= 20  # No sections

        # Deduct for missing documentation
        if "```" not in content:
            score -= 10  # No code examples

        # Check line length
        long_lines = [l for l in content.split("\n") if len(l) > 120]
        if long_lines:
            score -= min(20, len(long_lines))

        # Check for empty lines
        empty_lines = content.count("\n\n\n")
        if empty_lines:
            score -= min(10, empty_lines)

        return max(0.0, min(100.0, score))

    def create_version(
        self,
        doc_id: str,
        content: str,
        change_summary: str = "",
        author: str = "system",
    ) -> str:
        """
        Create a new version of a document

        Args:
            doc_id: Document ID
            content: Document content
            change_summary: Summary of changes
            author: Author of changes

        Returns:
            Version ID
        """
        try:
            if doc_id not in self.versions:
                self.versions[doc_id] = []

            version_number = len(self.versions[doc_id]) + 1
            quality_score = self._calculate_quality_score(content)
            version_id = f"v{version_number}_{datetime.now().isoformat()}"

            # Detect improvements from previous version
            improvements = []
            if self.versions[doc_id]:
                prev_version = self.versions[doc_id][-1]
                improvements = self._detect_improvements(prev_version.content, content)

            version = DocVersion(
                version_id=version_id,
                doc_id=doc_id,
                version_number=version_number,
                timestamp=datetime.now().isoformat(),
                content=content,
                change_summary=change_summary,
                quality_score=quality_score,
                improvements=improvements,
                author=author,
            )

            self.versions[doc_id].append(version)
            self._save_versions()

            logger.info(f"Created version {version_number} for {doc_id}")
            return version_id

        except Exception as e:
            logger.error(f"Failed to create version: {e}")
            return ""

    def _detect_improvements(self, old_content: str, new_content: str) -> List[str]:
        """Detect improvements between versions"""
        improvements = []

        # Check content length
        old_len = len(old_content)
        new_len = len(new_content)
        if new_len > old_len * 1.1:
            improvements.append(
                f"Expanded by {round((new_len - old_len) / old_len * 100, 1)}%"
            )

        # Check structure
        old_sections = old_content.count("\n## ")
        new_sections = new_content.count("\n## ")
        if new_sections > old_sections:
            improvements.append(f"Added {new_sections - old_sections} sections")

        # Check code blocks
        old_code = old_content.count("```")
        new_code = new_content.count("```")
        if new_code > old_code:
            improvements.append(f"Added {(new_code - old_code) // 2} code examples")

        # Check for better formatting
        if "\n| " in new_content and "\n| " not in old_content:
            improvements.append("Added tables")

        # Check quality improvement
        old_score = self._calculate_quality_score(old_content)
        new_score = self._calculate_quality_score(new_content)
        if new_score > old_score:
            improvements.append(
                f"Quality improved from {old_score:.1f} to {new_score:.1f}"
            )

        return improvements

    def get_version(self, doc_id: str, version_number: int) -> Optional[DocVersion]:
        """Get a specific version"""
        if doc_id in self.versions:
            for version in self.versions[doc_id]:
                if version.version_number == version_number:
                    return version
        return None

    def get_latest_version(self, doc_id: str) -> Optional[DocVersion]:
        """Get latest version of document"""
        if doc_id in self.versions and self.versions[doc_id]:
            return self.versions[doc_id][-1]
        return None

    def get_version_history(self, doc_id: str) -> List[Dict[str, Any]]:
        """Get full version history"""
        if doc_id not in self.versions:
            return []

        return [
            {
                "version": v.version_number,
                "timestamp": v.timestamp,
                "quality_score": v.quality_score,
                "change_summary": v.change_summary,
                "improvements": v.improvements,
            }
            for v in self.versions[doc_id]
        ]

    def suggest_improvements(self, content: str) -> List[Dict[str, str]]:
        """
        Suggest improvements for content

        Args:
            content: Document content

        Returns:
            List of suggestions
        """
        suggestions = []

        # Check for headers
        if "\n## " not in content:
            suggestions.append(
                {
                    "type": "structure",
                    "severity": "high",
                    "suggestion": "Add section headers (## Section Name) for better organization",
                }
            )

        # Check for code examples
        if "```" not in content:
            suggestions.append(
                {
                    "type": "completeness",
                    "severity": "medium",
                    "suggestion": "Add code examples or demonstrations",
                }
            )

        # Check for long lines
        long_lines = [l for l in content.split("\n") if len(l) > 120]
        if long_lines:
            suggestions.append(
                {
                    "type": "formatting",
                    "severity": "low",
                    "suggestion": f"Wrap {len(long_lines)} lines that exceed 120 characters",
                }
            )

        # Check for excessive blank lines
        if "\n\n\n" in content:
            suggestions.append(
                {
                    "type": "formatting",
                    "severity": "low",
                    "suggestion": "Remove excessive blank lines",
                }
            )

        # Check for links
        if "http" not in content.lower():
            suggestions.append(
                {
                    "type": "references",
                    "severity": "low",
                    "suggestion": "Consider adding references or links to related resources",
                }
            )

        # Check documentation
        if len(content.split()) < 100:
            suggestions.append(
                {
                    "type": "completeness",
                    "severity": "medium",
                    "suggestion": "Expand documentation with more detailed information",
                }
            )

        return suggestions

    def apply_improvement(
        self, doc_id: str, content: str, improvement_type: str
    ) -> Tuple[bool, str]:
        """
        Apply an automatic improvement

        Args:
            doc_id: Document ID
            content: Current content
            improvement_type: Type of improvement (clean, expand, structure)

        Returns:
            (success, improved_content)
        """
        try:
            if improvement_type == "clean":
                # Clean up formatting
                improved = content
                improved = improved.replace(
                    "\n\n\n", "\n\n"
                )  # Remove excessive blank lines
                improved = improved.replace("\r\n", "\n")  # Normalize line endings
                improved = " ".join(improved.split())  # Clean whitespace
                return True, improved

            elif improvement_type == "structure":
                # Improve structure
                lines = content.split("\n")
                improved_lines = []

                for line in lines:
                    # Convert bold to headers if standalone
                    if line.startswith("**") and line.endswith("**"):
                        improved_lines.append("## " + line[2:-2])
                    else:
                        improved_lines.append(line)

                return True, "\n".join(improved_lines)

            elif improvement_type == "wrap":
                # Wrap long lines
                lines = []
                for line in content.split("\n"):
                    if len(line) > 120:
                        words = line.split()
                        current = []
                        for word in words:
                            if len(" ".join(current + [word])) <= 120:
                                current.append(word)
                            else:
                                lines.append(" ".join(current))
                                current = [word]
                        if current:
                            lines.append(" ".join(current))
                    else:
                        lines.append(line)

                return True, "\n".join(lines)

            else:
                return False, f"Unknown improvement type: {improvement_type}"

        except Exception as e:
            logger.error(f"Failed to apply improvement: {e}")
            return False, str(e)

    def compare_versions(self, doc_id: str, version1: int, version2: int) -> List[str]:
        """Compare two versions"""
        v1 = self.get_version(doc_id, version1)
        v2 = self.get_version(doc_id, version2)

        if not v1 or not v2:
            return []

        diff = difflib.unified_diff(
            v1.content.split("\n"), v2.content.split("\n"), lineterm=""
        )

        return list(diff)

    def get_statistics(self, doc_id: str) -> Dict[str, Any]:
        """Get statistics for a document"""
        if doc_id not in self.versions:
            return {}

        versions = self.versions[doc_id]
        return {
            "total_versions": len(versions),
            "average_quality": round(
                sum(v.quality_score for v in versions) / len(versions), 2
            ),
            "highest_quality": max(v.quality_score for v in versions),
            "lowest_quality": min(v.quality_score for v in versions),
            "total_improvements": sum(len(v.improvements) for v in versions),
        }


if __name__ == "__main__":
    # Example usage
    evolve = DocEvolveSystem()

    # Create versions
    v1 = evolve.create_version("doc1", "# Test\n\nInitial content")
    v2 = evolve.create_version(
        "doc1",
        "# Test\n\n## Section 1\nExpanded content\n\n```python\nprint('hello')\n```",
    )

    # Get history
    history = evolve.get_version_history("doc1")
    print(f"Version history: {json.dumps(history, indent=2)}")
