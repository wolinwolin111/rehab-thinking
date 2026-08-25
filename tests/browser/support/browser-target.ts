export function resolveBrowserTarget(configuredUrl: string) {
  const url = new URL(configuredUrl);
  if (!url.pathname.endsWith("/")) url.pathname = `${url.pathname}/`;
  return url.toString();
}

export function isLocalBrowserTarget(configuredUrl: string) {
  const url = new URL(configuredUrl);
  return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
}
