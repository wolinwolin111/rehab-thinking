/** Minimal local declarations for the optional Cloudflare worker entrypoint.
 * The production hosting runtime supplies the real implementations. Keeping
 * these declarations local lets the application pass strict type checking in
 * the browser/demo workspace without coupling the demo to Cloudflare's type
 * package.
 */
declare type Fetcher = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

declare type D1Database = Record<string, unknown>;

declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
    [key: string]: unknown;
  };
}
