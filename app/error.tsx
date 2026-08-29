"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="route-state">
      <p className="eyebrow">Render stopped</p>
      <h1>The local review screen could not render.</h1>
      <p>
        Your Compose text was not sent anywhere. Reload this route to restart
        the browser-only workbench.
      </p>
      <button className="button button-primary" type="button" onClick={reset}>
        Reload the workbench
      </button>
    </main>
  );
}
