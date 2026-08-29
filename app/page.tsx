/**
 * @project  ComposePermit — github.com/uvindev/compose-permit
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  MIT
 */

import { IntentLink } from "@/components/intent-link";
import { Workbench } from "@/components/workbench";

export default function Home() {
  return (
    <main id="top">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="ComposePermit home">
          COMPOSE<span>PERMIT</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#workbench">Review</a>
          <a href="#boundary">Boundary</a>
          <a href="#open-source">Source</a>
        </nav>
        <a
          className="repo-link"
          href="https://github.com/uvindev/compose-permit"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub / MIT
        </a>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="iteration-stamp">
          <span>TRUST REVIEW</span>
          <strong>12</strong>
          <small>portfolio iteration</small>
        </div>
        <div className="hero-copy">
          <p className="eyebrow">For Docker Compose pull requests</p>
          <h1 id="hero-title">A Compose diff can cross the host boundary.</h1>
          <p className="hero-description">
            Compare the approved and proposed manifests. Isolate new sockets,
            mounts, capabilities, namespaces, devices, ports, and host file
            reads before anyone executes the change.
          </p>
          <a className="button button-primary" href="#workbench">
            Inspect the permit
          </a>
        </div>
        <div
          className="boundary-diagram"
          aria-label="Container authority crossing into host authority"
        >
          <div className="diagram-zone zone-container">
            <span>CONTAINER</span>
            <i>process</i>
            <i>network</i>
            <i>filesystem</i>
          </div>
          <div className="diagram-crossing">
            <span>privileged</span>
            <span>socket</span>
            <span>bind</span>
            <span>device</span>
          </div>
          <div className="diagram-zone zone-host">
            <span>HOST</span>
            <strong>authority</strong>
          </div>
        </div>
        <div
          className="operating-boundary"
          aria-label="ComposePermit operating boundary"
        >
          <span>NO DAEMON</span>
          <span>NO INTERPOLATION</span>
          <span>NO YAML UPLOAD</span>
          <span>MIT LICENSE</span>
        </div>
      </section>

      <Workbench />

      <section
        className="boundary-section"
        id="boundary"
        aria-labelledby="boundary-title"
      >
        <div className="section-rule">
          <span>03 / execution boundary</span>
          <span>declared text is not resolved runtime state</span>
        </div>
        <div className="boundary-heading">
          <p className="eyebrow">Review the permit, then run the source tool</p>
          <h2 id="boundary-title">ComposePermit stops before execution.</h2>
        </div>
        <div className="boundary-steps">
          <article>
            <span>01</span>
            <h3>Input</h3>
            <p>
              Two bounded Compose YAML documents. Never env values, referenced
              file contents, images, or daemon state.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Evidence</h3>
            <p>
              Declared privilege, namespace, device, capability, mount, port,
              file-read, config, and secret changes.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Source check</h3>
            <p>
              Run `docker compose config`, inspect referenced files and images,
              then apply repository and runtime policy.
            </p>
          </article>
          <article>
            <span>04</span>
            <h3>Limit</h3>
            <p>
              A clean text review does not establish image trust, daemon safety,
              effective isolation, or workload intent.
            </p>
          </article>
        </div>
      </section>

      <section
        className="commercial-section"
        aria-labelledby="commercial-title"
      >
        <div>
          <p className="eyebrow">Commercial hypothesis</p>
          <h2 id="commercial-title">
            Keep the local reviewer open. Sell the repository workflow.
          </h2>
          <p>
            Team would add pull-request comments, organization policy, approved
            exceptions, saved baselines, and retained review history.
          </p>
        </div>
        <div className="price-plate">
          <span>TEAM / [TARGET]</span>
          <strong>$24</strong>
          <p>
            organization / month
            <br />
            first 10 repositories
          </p>
          <IntentLink
            event="pricing_intent"
            href="mailto:uvin95dev@gmail.com?subject=ComposePermit%20Team%20pilot"
            className="button button-inverse"
          >
            Request pilot access
          </IntentLink>
        </div>
      </section>

      <section
        className="source-section"
        id="open-source"
        aria-labelledby="source-title"
      >
        <div>
          <p className="eyebrow">Public source / MIT</p>
          <h2 id="source-title">
            The complete local comparison stays open source.
          </h2>
        </div>
        <div className="source-actions">
          <a
            className="button button-primary"
            href="https://github.com/uvindev/compose-permit"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the source
          </a>
          <IntentLink
            event="feedback_intent"
            className="button button-quiet"
            href="https://github.com/uvindev/compose-permit/issues/new/choose"
            target="_blank"
            rel="noopener noreferrer"
          >
            Report a Compose case
          </IntentLink>
        </div>
      </section>

      <footer>
        <p>
          ComposePermit does not run Docker, pull images, resolve references, or
          certify runtime safety.
        </p>
        <p className="footer-credit">
          Built by{" "}
          <a
            href="https://iamuvin.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Uvin Vindula
          </a>{" "}
          ·{" "}
          <a
            href="https://asiresearch.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            ASI Research Labs
          </a>
        </p>
      </footer>
    </main>
  );
}
