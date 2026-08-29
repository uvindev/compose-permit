"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { compareComposeEvidence } from "@/lib/compose/analyze";
import { parseComposeSource } from "@/lib/compose/parser";
import { buildMarkdownReview } from "@/lib/compose/report";
import { MAX_COMPOSE_BYTES } from "@/lib/schemas/compose";
import type { ComparisonResult, ParseIssue } from "@/lib/types";
import { track } from "@/lib/analytics";

const BASELINE_SAMPLE = `services:
  web:
    image: ghcr.io/example/web:1.4.0
    user: "1000:1000"
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    ports:
      - "127.0.0.1:8080:8080"
    volumes:
      - app-data:/var/lib/app

volumes:
  app-data:
`;

const CANDIDATE_SAMPLE = `include:
  - ./compose.observability.yaml

services:
  web:
    image: ghcr.io/example/web:1.5.0
    privileged: true
    cap_add:
      - SYS_ADMIN
    ports:
      - "8080:8080"
    volumes:
      - /:/host:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    secrets:
      - registry_token

  worker:
    image: ghcr.io/example/worker:2.0.0
    env_file: .env.production
    devices:
      - /dev/kvm:/dev/kvm
    provider:
      type: compose-worker-provider

secrets:
  registry_token:
    file: ./registry-token.txt
`;

type Side = "baseline" | "candidate";

function issueLabel(issue: ParseIssue): string {
  const label = issue.side === "baseline" ? "Baseline" : "Candidate";
  return `${label}: ${issue.message}`;
}

export function Workbench() {
  const [baseline, setBaseline] = useState("");
  const [candidate, setCandidate] = useState("");
  const [issues, setIssues] = useState<ParseIssue[]>([]);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [exportStatus, setExportStatus] = useState("");

  useEffect(() => {
    track("workbench_viewed");
  }, []);

  function loadSample() {
    setBaseline(BASELINE_SAMPLE);
    setCandidate(CANDIDATE_SAMPLE);
    setIssues([]);
    setResult(null);
    setExportStatus("");
  }

  function updateSource(side: Side, value: string) {
    if (side === "baseline") setBaseline(value);
    else setCandidate(value);
    setIssues([]);
    setResult(null);
    setExportStatus("");
  }

  function compareDocuments() {
    const baselineResult = parseComposeSource(baseline, "baseline");
    const candidateResult = parseComposeSource(candidate, "candidate");
    const nextIssues = [...baselineResult.issues, ...candidateResult.issues];
    setIssues(nextIssues);
    setExportStatus("");
    if (!baselineResult.evidence || !candidateResult.evidence) {
      setResult(null);
      return;
    }
    const comparison = compareComposeEvidence(
      baselineResult.evidence,
      candidateResult.evidence,
    );
    setResult(comparison);
    track("compose_compared");
  }

  async function loadFile(event: ChangeEvent<HTMLInputElement>, side: Side) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_COMPOSE_BYTES) {
      setResult(null);
      setIssues([
        { side, message: "The selected file exceeds the 1 MiB byte limit." },
      ]);
      return;
    }
    try {
      updateSource(side, await file.text());
    } catch {
      setResult(null);
      setIssues([
        {
          side,
          message:
            "The selected file could not be read. Choose a local text YAML file.",
        },
      ]);
    }
  }

  async function copyReview() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(buildMarkdownReview(result));
      setExportStatus("Markdown review copied.");
      track("review_exported");
    } catch {
      setExportStatus("Clipboard write failed. Use Download review instead.");
    }
  }

  function downloadReview() {
    if (!result) return;
    const url = URL.createObjectURL(
      new Blob([buildMarkdownReview(result)], { type: "text/markdown" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "compose-permit-review.md";
    link.click();
    URL.revokeObjectURL(url);
    setExportStatus("Markdown review downloaded.");
    track("review_exported");
  }

  return (
    <section
      className="workbench"
      id="workbench"
      aria-labelledby="workbench-title"
    >
      <div className="section-rule">
        <span>01 / permit desk</span>
        <span>local parser · 1 MiB per side</span>
      </div>

      <div className="workbench-heading">
        <p className="eyebrow">Before `docker compose up`</p>
        <h2 id="workbench-title">Inspect the authority transfer.</h2>
        <p>
          Use a merge-base and candidate file. ComposePermit reads declared YAML
          only; it does not interpolate variables or resolve referenced files.
        </p>
      </div>

      <div className="manifest-grid" aria-label="Compose documents">
        <article className="manifest-panel baseline-panel">
          <header>
            <span className="manifest-index">A</span>
            <div>
              <p>Approved state</p>
              <h3>Baseline Compose</h3>
            </div>
          </header>
          <textarea
            aria-label="Baseline Compose"
            value={baseline}
            onChange={(event) => updateSource("baseline", event.target.value)}
            placeholder={"services:\n  web:\n    image: example/web:1.0.0"}
            spellCheck={false}
          />
          <label className="file-control">
            Load baseline YAML
            <input
              type="file"
              accept=".yml,.yaml,text/yaml,application/yaml"
              onChange={(event) => loadFile(event, "baseline")}
            />
          </label>
        </article>

        <div
          className="boundary-rail"
          aria-label="Container to host review boundary"
        >
          <span>CONTAINER</span>
          <i aria-hidden="true" />
          <strong>PERMIT</strong>
          <i aria-hidden="true" />
          <span>HOST</span>
        </div>

        <article className="manifest-panel candidate-panel">
          <header>
            <span className="manifest-index">B</span>
            <div>
              <p>Proposed state</p>
              <h3>Candidate Compose</h3>
            </div>
          </header>
          <textarea
            aria-label="Candidate Compose"
            value={candidate}
            onChange={(event) => updateSource("candidate", event.target.value)}
            placeholder={"services:\n  web:\n    privileged: true"}
            spellCheck={false}
          />
          <label className="file-control">
            Load candidate YAML
            <input
              type="file"
              accept=".yml,.yaml,text/yaml,application/yaml"
              onChange={(event) => loadFile(event, "candidate")}
            />
          </label>
        </article>
      </div>

      <div className="workbench-actions">
        <button
          className="button button-quiet"
          type="button"
          onClick={loadSample}
        >
          Load synthetic sample
        </button>
        <button
          className="button button-primary"
          type="button"
          onClick={compareDocuments}
        >
          Review authority
        </button>
        <p>No daemon. No interpolation. No source upload.</p>
      </div>

      {issues.length > 0 ? (
        <div className="issue-block" role="alert" aria-live="assertive">
          <strong>Comparison stopped.</strong>
          <ul>
            {issues.map((issue, index) => (
              <li key={`${issue.side}-${index}`}>{issueLabel(issue)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result ? (
        <ReviewRegister
          result={result}
          onCopy={copyReview}
          onDownload={downloadReview}
          exportStatus={exportStatus}
        />
      ) : null}
    </section>
  );
}

interface ReviewRegisterProps {
  result: ComparisonResult;
  onCopy: () => Promise<void>;
  onDownload: () => void;
  exportStatus: string;
}

function ReviewRegister({
  result,
  onCopy,
  onDownload,
  exportStatus,
}: ReviewRegisterProps) {
  const { summary, findings } = result;
  return (
    <div className="review-register" aria-label="Compose authority review">
      <div className="summary-strip">
        <div className="summary-lead">
          <span>{String(summary.changedServices).padStart(2, "0")}</span>
          <p>changed scopes</p>
        </div>
        <dl>
          <div>
            <dt>baseline</dt>
            <dd>{summary.baselineServices}</dd>
          </div>
          <div>
            <dt>candidate</dt>
            <dd>{summary.candidateServices}</dd>
          </div>
          <div>
            <dt>expanded</dt>
            <dd>{summary.expanded}</dd>
          </div>
          <div>
            <dt>reduced</dt>
            <dd>{summary.reduced}</dd>
          </div>
          <div>
            <dt>high</dt>
            <dd>{summary.high}</dd>
          </div>
        </dl>
      </div>

      <div className="register-heading">
        <div>
          <p>02 / authority register</p>
          <h3>{findings.length} findings</h3>
        </div>
        <div className="export-actions">
          <button type="button" onClick={onCopy}>
            Copy Markdown
          </button>
          <button type="button" onClick={onDownload}>
            Download review
          </button>
        </div>
      </div>
      <p className="export-status" role="status" aria-live="polite">
        {exportStatus}
      </p>

      {findings.length === 0 ? (
        <div className="clean-state">
          <strong>No reviewed authority changes found.</strong>
          <p>
            Still inspect resolved configuration, referenced files, images, and
            runtime policy before execution.
          </p>
        </div>
      ) : (
        <ol className="finding-list">
          {findings.map((item, index) => (
            <li className={`finding finding-${item.direction}`} key={item.id}>
              <span className="finding-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="finding-signal">
                <span>{item.severity}</span>
                <strong>{item.direction}</strong>
              </div>
              <div className="finding-body">
                <code>{item.service}</code>
                <h4>{item.title}</h4>
                <p>{item.detail}</p>
              </div>
              <div className="finding-change">
                <span>{item.before}</span>
                <i aria-hidden="true">→</i>
                <span>{item.after}</span>
              </div>
              <p className="finding-action">{item.recommendation}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
