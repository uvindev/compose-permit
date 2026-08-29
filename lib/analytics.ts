export type AnalyticsEvent =
  | "workbench_viewed"
  | "compose_compared"
  | "review_exported"
  | "pricing_intent"
  | "feedback_intent";

declare global {
  interface Window {
    plausible?: (
      event: AnalyticsEvent,
      options?: { props?: Record<string, string | number | boolean> },
    ) => void;
  }
}

export function track(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;
  window.plausible?.(event);
}
