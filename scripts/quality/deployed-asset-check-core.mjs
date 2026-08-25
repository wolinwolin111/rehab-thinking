export function extractCriticalAssetPaths(html) {
  const css = html.match(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+\.css(?:\?[^"']*)?)["']/i)?.[1]
    ?? html.match(/<link[^>]+href=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]+rel=["']stylesheet["']/i)?.[1];
  const javascript = html.match(/<(?:script|link)[^>]+(?:src|href)=["']([^"']+\.js(?:\?[^"']*)?)["']/i)?.[1];
  if (!css || !javascript) throw new Error("deployed HTML omitted a critical CSS or JavaScript asset");
  return { css, javascript };
}

export function assertCriticalAssetResponse({ kind, status, contentType, bodyPrefix }) {
  if (status < 200 || status >= 300) throw new Error(`${kind} asset returned HTTP ${status}`);
  const normalizedType = String(contentType ?? "").toLowerCase();
  if (kind === "css" && !normalizedType.includes("text/css")) throw new Error(`CSS asset returned ${contentType || "no content type"}`);
  if (kind === "javascript" && !/(?:java|ecma)script/.test(normalizedType)) throw new Error(`JavaScript asset returned ${contentType || "no content type"}`);
  if (/^\s*<!doctype html/i.test(String(bodyPrefix ?? ""))) throw new Error(`${kind} asset returned HTML content`);
}
