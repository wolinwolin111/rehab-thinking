const PILOT_INVITE_STORAGE_KEY = "rehabmind-pilot-invite";

function readStoredInvite() {
  try {
    return window.sessionStorage.getItem(PILOT_INVITE_STORAGE_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

function storeInvite(token: string) {
  try {
    window.sessionStorage.setItem(PILOT_INVITE_STORAGE_KEY, token);
  } catch {
    // A blocked sessionStorage should not prevent the request from using the URL token.
  }
}

function captureInviteFromLocation() {
  const url = new URL(window.location.href);
  const queryToken = url.searchParams.get("invite")?.trim() || "";
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const fragmentToken = hashParams.get("invite")?.trim() || "";
  const token = queryToken || fragmentToken;
  if (!token) return null;

  storeInvite(token);
  url.searchParams.delete("invite");
  if (fragmentToken) url.hash = "";
  window.history.replaceState({}, "", url.toString());
  return token;
}

export function getPilotInviteToken() {
  if (typeof window === "undefined") return null;
  return captureInviteFromLocation() ?? readStoredInvite();
}

