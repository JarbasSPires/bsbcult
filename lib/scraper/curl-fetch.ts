import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Some sources (Shotgun, Sympla) fingerprint the HTTP client behind their
// anti-bot layer: Node's fetch gets 403/429 while a plain curl with the same
// browser headers gets 200 from the same IP/network. curl is present on the CI
// runner and locally, so we shell out to it instead of using fetch for these.
const STATUS_MARKER = "\n__HTTP_STATUS__";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Fetches `url` via curl with browser-like headers and returns the response
// body. Throws a descriptive error — naming `sourceLabel` — on a 403/429
// (anti-bot block) or any other non-2xx status, so callers don't need their
// own status handling; `runAdapter` isolates the throw per source.
export async function fetchHtmlViaCurl(url: string, sourceLabel: string): Promise<string> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(
      "curl",
      [
        "-s",
        "-L",
        "--compressed",
        "--max-time",
        "40",
        "-A",
        BROWSER_USER_AGENT,
        "-H",
        "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "-H",
        "Accept-Language: pt-BR,pt;q=0.9,en;q=0.8",
        "-H",
        "Sec-Fetch-Dest: document",
        "-H",
        "Sec-Fetch-Mode: navigate",
        "-H",
        "Sec-Fetch-Site: none",
        "-H",
        "Upgrade-Insecure-Requests: 1",
        "-w",
        `${STATUS_MARKER}%{http_code}`,
        url,
      ],
      { maxBuffer: 25 * 1024 * 1024 },
    ));
  } catch (error) {
    throw new Error(`${sourceLabel}: falha ao executar curl (${error instanceof Error ? error.message : String(error)})`);
  }

  const markerAt = stdout.lastIndexOf(STATUS_MARKER);
  const status = markerAt >= 0 ? stdout.slice(markerAt + STATUS_MARKER.length).trim() : "";
  const html = markerAt >= 0 ? stdout.slice(0, markerAt) : stdout;

  if (status === "403" || status === "429") {
    throw new Error(`${sourceLabel} bloqueou a requisição (HTTP ${status}) — fonte requer navegador real`);
  }
  if (!/^2\d\d$/.test(status)) {
    throw new Error(`${sourceLabel} respondeu ${status || "sem status"}`);
  }
  return html;
}
