export function notify(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("app:notify", { detail: { message } }));
}

