/** Only resident-facing routes can be a sign-in return destination. */
export function authDestination(value?: string) {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/account";
  try {
    const url = new URL(value, "https://local.invalid");
    if (url.origin !== "https://local.invalid" || !(/^\/reports\/[A-Z0-9-]{3,80}$/.test(url.pathname) || ["/account", "/account/reports", "/account/notifications"].includes(url.pathname))) return "/account";
    return url.pathname + url.search;
  } catch { return "/account"; }
}
