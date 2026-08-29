import type { ComparisonResult } from "@/lib/types";

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function buildMarkdownReview(result: ComparisonResult): string {
  const { summary, findings } = result;
  const lines = [
    "# ComposePermit review",
    "",
    `- Baseline services: ${summary.baselineServices}`,
    `- Candidate services: ${summary.candidateServices}`,
    `- Changed scopes: ${summary.changedServices}`,
    `- Expanded authority: ${summary.expanded}`,
    `- Reduced authority: ${summary.reduced}`,
    `- High-severity review prompts: ${summary.high}`,
    "",
  ];

  if (findings.length === 0) {
    lines.push("No reviewed Compose authority changes were found.", "");
  } else {
    lines.push(
      "| Severity | Direction | Scope | Finding | Evidence |",
      "| --- | --- | --- | --- | --- |",
    );
    for (const item of findings) {
      lines.push(
        `| ${item.severity} | ${item.direction} | ${escapeCell(item.service)} | ${escapeCell(item.title)} | ${escapeCell(`${item.before} → ${item.after}`)} |`,
      );
    }
    lines.push("", "## Review actions", "");
    findings.forEach((item, index) => {
      lines.push(
        `${index + 1}. **${escapeCell(item.service)} / ${escapeCell(item.title)}:** ${escapeCell(item.recommendation)}`,
      );
    });
    lines.push("");
  }

  lines.push(
    "> ComposePermit compares declared text. Run `docker compose config`, inspect referenced files and images, and apply your runtime controls before `create` or `up`.",
    "",
    "Generated locally by [ComposePermit](https://github.com/uvindev/compose-permit).",
  );
  return lines.join("\n");
}
