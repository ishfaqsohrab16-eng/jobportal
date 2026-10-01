import { DIGIBIZZ } from "@digibizz/jobs-shared";
import { config } from "../../config";

/**
 * One responsive HTML shell for every message, built with table layout and
 * inline styles because that is what email clients reliably render.
 */

const BRAND = "#0b9a5c";
const INK = "#14171a";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";

export const escapeHtml = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface Block {
  /** Paragraph text. Already-escaped HTML may be passed with `html: true`. */
  p?: string;
  html?: boolean;
  /** A labelled row inside a bordered summary card. */
  rows?: { label: string; value: string }[];
  button?: { label: string; url: string };
  note?: string;
}

export function renderEmail(opts: { preheader: string; heading: string; blocks: Block[] }): { html: string; text: string } {
  const body = opts.blocks
    .map((b) => {
      if (b.button) {
        return `<tr><td style="padding:8px 0 20px">
          <a href="${b.button.url}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:10px">${escapeHtml(b.button.label)}</a>
        </td></tr>`;
      }
      if (b.rows) {
        const rows = b.rows
          .map(
            (r) => `<tr>
              <td style="padding:7px 0;color:${MUTED};font-size:13px;width:40%;vertical-align:top">${escapeHtml(r.label)}</td>
              <td style="padding:7px 0;color:${INK};font-size:14px;font-weight:500">${escapeHtml(r.value)}</td>
            </tr>`,
          )
          .join("");
        return `<tr><td style="padding:4px 0 18px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:10px;padding:10px 16px;background:#f9fafb">${rows}</table>
        </td></tr>`;
      }
      if (b.note) {
        return `<tr><td style="padding:4px 0 18px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="border-left:3px solid ${BRAND};background:#e9f7f0;border-radius:0 8px 8px 0;padding:12px 16px;color:${INK};font-size:13.5px;line-height:1.6">${escapeHtml(b.note)}</td>
          </tr></table>
        </td></tr>`;
      }
      const text = b.html ? (b.p ?? "") : escapeHtml(b.p ?? "");
      return `<tr><td style="padding:0 0 16px;color:#3d434a;font-size:15px;line-height:1.65">${text}</td></tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:28px 12px">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${LINE}">
      <tr><td style="background:#0b0f0d;padding:22px 28px">
        <span style="color:#ffffff;font-size:19px;font-weight:700;letter-spacing:-0.4px">digibizz<span style="color:#2fd08a">.</span></span>
        <span style="color:#f3a93a;font-size:10px;letter-spacing:2.4px;font-weight:700;margin-left:8px">JOBS PORTAL</span>
      </td></tr>
      <tr><td style="padding:28px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:0 0 14px;color:${INK};font-size:21px;font-weight:700;line-height:1.3">${escapeHtml(opts.heading)}</td></tr>
          ${body}
        </table>
      </td></tr>
      <tr><td style="border-top:1px solid ${LINE};padding:18px 28px;color:${MUTED};font-size:12px;line-height:1.6">
        ${escapeHtml(DIGIBIZZ.name)} · <a href="${config.publicWebUrl}" style="color:${BRAND};text-decoration:none">${escapeHtml(config.publicWebUrl.replace(/^https?:\/\//, ""))}</a><br>
        You received this email because you have an account on the ${escapeHtml(DIGIBIZZ.name)} jobs portal.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const text = [
    opts.heading,
    "",
    ...opts.blocks.flatMap((b) => {
      if (b.button) return [`${b.button.label}: ${b.button.url}`, ""];
      if (b.rows) return [...b.rows.map((r) => `${r.label}: ${r.value}`), ""];
      if (b.note) return [b.note, ""];
      return [stripTags(b.p ?? ""), ""];
    }),
    `${DIGIBIZZ.name} · ${config.publicWebUrl}`,
  ].join("\n");

  return { html, text };
}

const stripTags = (s: string) =>
  s
    .replace(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
