import Link from "next/link";

export default function NotFound() {
  return (
    <main className="route-state">
      <p className="eyebrow">404 / no manifest</p>
      <h1>This route is outside the permit desk.</h1>
      <Link className="button button-primary" href="/">
        Return to ComposePermit
      </Link>
    </main>
  );
}
