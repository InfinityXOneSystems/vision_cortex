"""
Document Transform System - Transforms documents between formats and structures

Supports:
- Format conversion (markdown, json, html, pdf, plaintext)
- Structure normalization
- Metadata extraction
- Content enrichment
- Language processing
"""

import hashlib
import json
import logging
import re
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class TransformConfig:
    """Transform configuration"""

    source_format: str
    target_format: str
    preserve_metadata: bool = True
    extract_headers: bool = True
    extract_code_blocks: bool = True
    normalize_whitespace: bool = True
    add_toc: bool = False
    max_line_length: int = 120


class DocTransformSystem:
    """Transforms and normalizes documents"""

    def __init__(self, output_dir: str = "docs_transformed"):
        """Initialize transform system"""
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.transform_log = self.output_dir / "transform.log"
        self.transformations = []

    def _log_transform(
        self, source_id: str, target_format: str, success: bool, message: str = ""
    ):
        """Log a transformation"""
        self.transformations.append(
            {
                "timestamp": datetime.now().isoformat(),
                "source_id": source_id,
                "target_format": target_format,
                "success": success,
                "message": message,
            }
        )

    def markdown_to_json(
        self, content: str, preserve_structure: bool = True
    ) -> Dict[str, Any]:
        """Convert markdown to JSON structure"""
        try:
            result = {
                "format": "markdown-json",
                "headers": [],
                "sections": [],
                "code_blocks": [],
                "links": [],
                "metadata": {},
            }

            # Extract headers
            header_pattern = r"^(#{1,6})\s+(.+)$"
            for match in re.finditer(header_pattern, content, re.MULTILINE):
                level = len(match.group(1))
                title = match.group(2)
                result["headers"].append({"level": level, "title": title})

            # Extract code blocks
            code_pattern = r"```(\w+)?\n(.*?)```"
            for match in re.finditer(code_pattern, content, re.DOTALL):
                language = match.group(1) or "plaintext"
                code = match.group(2).strip()
                result["code_blocks"].append({"language": language, "code": code})

            # Extract links
            link_pattern = r"\[([^\]]+)\]\(([^\)]+)\)"
            for match in re.finditer(link_pattern, content):
                text = match.group(1)
                url = match.group(2)
                result["links"].append({"text": text, "url": url})

            # Extract sections
            sections = content.split("\n## ")
            for i, section in enumerate(sections):
                if section.strip():
                    result["sections"].append(
                        {"index": i, "content": section[:500]}  # First 500 chars
                    )

            return result

        except Exception as e:
            logger.error(f"Failed to convert markdown to JSON: {e}")
            return {"error": str(e)}

    def json_to_markdown(self, data: Dict[str, Any]) -> str:
        """Convert JSON structure to markdown"""
        try:
            lines = []

            # Add title if present
            if "title" in data:
                lines.append(f"# {data['title']}\n")

            # Add headers
            if "headers" in data:
                for header in data["headers"]:
                    level = header.get("level", 1)
                    title = header.get("title", "")
                    lines.append(f"{'#' * level} {title}\n")

            # Add sections
            if "sections" in data:
                for section in data["sections"]:
                    lines.append(section.get("content", "") + "\n")

            # Add code blocks
            if "code_blocks" in data:
                for block in data["code_blocks"]:
                    language = block.get("language", "")
                    code = block.get("code", "")
                    lines.append(f"```{language}\n{code}\n```\n")

            return "\n".join(lines)

        except Exception as e:
            logger.error(f"Failed to convert JSON to markdown: {e}")
            return ""

    def normalize_content(self, content: str, config: TransformConfig) -> str:
        """Normalize document content"""
        try:
            # Normalize whitespace
            if config.normalize_whitespace:
                content = re.sub(
                    r"\n\n\n+", "\n\n", content
                )  # Remove multiple blank lines
                content = re.sub(r" +", " ", content)  # Remove multiple spaces

            # Wrap lines to max length
            if config.max_line_length > 0:
                lines = []
                for line in content.split("\n"):
                    if len(line) > config.max_line_length:
                        # Simple word wrap
                        words = line.split()
                        current_line = []
                        for word in words:
                            if (
                                len(" ".join(current_line + [word]))
                                <= config.max_line_length
                            ):
                                current_line.append(word)
                            else:
                                lines.append(" ".join(current_line))
                                current_line = [word]
                        if current_line:
                            lines.append(" ".join(current_line))
                    else:
                        lines.append(line)
                content = "\n".join(lines)

            return content

        except Exception as e:
            logger.error(f"Failed to normalize content: {e}")
            return content

    def extract_metadata(self, content: str) -> Dict[str, Any]:
        """Extract metadata from document"""
        try:
            metadata = {
                "word_count": len(content.split()),
                "line_count": len(content.split("\n")),
                "char_count": len(content),
                "code_blocks": len(re.findall(r"```", content)) // 2,
                "links": len(re.findall(r"\[([^\]]+)\]\(([^\)]+)\)", content)),
                "headers": len(re.findall(r"^#{1,6}\s+", content, re.MULTILINE)),
                "has_toc": "Table of Contents" in content or "# Contents" in content,
                "language": "markdown" if "```" in content else "plaintext",
            }
            return metadata

        except Exception as e:
            logger.error(f"Failed to extract metadata: {e}")
            return {}

    def enrich_content(self, content: str, enrichments: List[str]) -> str:
        """Enrich document with additional metadata"""
        try:
            lines = [content]

            if "table_of_contents" in enrichments:
                # Generate simple TOC
                headers = re.findall(r"^(#{1,6})\s+(.+)$", content, re.MULTILINE)
                if headers:
                    lines.append("\n## Table of Contents\n")
                    for hashes, title in headers:
                        level = len(hashes) - 1
                        indent = "  " * level
                        lines.append(f"{indent}* {title}")

            if "metadata" in enrichments:
                metadata = self.extract_metadata(content)
                lines.append("\n## Document Metadata\n")
                lines.append(f"* Word Count: {metadata.get('word_count', 0)}")
                lines.append(f"* Lines: {metadata.get('line_count', 0)}")
                lines.append(f"* Headers: {metadata.get('headers', 0)}")
                lines.append(f"* Code Blocks: {metadata.get('code_blocks', 0)}")

            if "timestamp" in enrichments:
                lines.append(f"\nLast Generated: {datetime.now().isoformat()}")

            return "\n".join(lines)

        except Exception as e:
            logger.error(f"Failed to enrich content: {e}")
            return content

    def transform(
        self,
        content: str,
        source_format: str,
        target_format: str,
        config: Optional[TransformConfig] = None,
    ) -> Tuple[bool, str]:
        """
        Transform document from source to target format

        Args:
            content: Document content
            source_format: Source format (markdown, json, plaintext, html)
            target_format: Target format
            config: Transform configuration

        Returns:
            (success, transformed_content)
        """
        try:
            if config is None:
                config = TransformConfig(source_format, target_format)

            # Normalize input
            normalized = self.normalize_content(content, config)

            # Transform based on format
            if source_format == "markdown" and target_format == "json":
                result = self.markdown_to_json(normalized)
                return True, json.dumps(result, indent=2)

            elif source_format == "json" and target_format == "markdown":
                data = json.loads(normalized)
                result = self.json_to_markdown(data)
                return True, result

            elif target_format == "plaintext":
                # Remove markdown syntax
                result = re.sub(r"[#*`\[\]]", "", normalized)
                return True, result

            elif target_format == "markdown":
                return True, normalized

            else:
                return (
                    False,
                    f"Unsupported transformation: {source_format} -> {target_format}",
                )

        except Exception as e:
            logger.error(f"Transform failed: {e}")
            return False, str(e)

    def batch_transform(
        self, documents: List[Tuple[str, str, str]], target_format: str
    ) -> List[Tuple[bool, str]]:
        """
        Transform multiple documents

        Args:
            documents: List of (content, source_format, doc_id)
            target_format: Target format for all

        Returns:
            List of (success, result)
        """
        results = []
        for content, source_format, doc_id in documents:
            success, result = self.transform(content, source_format, target_format)
            results.append((success, result))
            self._log_transform(doc_id, target_format, success)

        return results

    def get_statistics(self) -> Dict[str, Any]:
        """Get transformation statistics"""
        successful = sum(1 for t in self.transformations if t["success"])
        failed = len(self.transformations) - successful

        return {
            "total_transformations": len(self.transformations),
            "successful": successful,
            "failed": failed,
            "success_rate": (
                round(successful / len(self.transformations) * 100, 2)
                if self.transformations
                else 0
            ),
        }


if __name__ == "__main__":
    # Example usage
    transform = DocTransformSystem()

    test_markdown = """
# Example Document

## Section 1
This is a test section.

```python
def hello():
    print("world")
```

[Link](https://example.com)
"""

    success, json_result = transform.transform(test_markdown, "markdown", "json")
    print(f"Transform success: {success}")
    print(f"Result: {json_result[:100]}...")
