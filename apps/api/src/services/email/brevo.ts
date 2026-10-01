import { config } from "../../config";

/**
 * Minimal Brevo (ex-Sendinblue) transactional email client.
 *
 * Sending is best-effort by design: a failed email must never break the request
 * that triggered it (a candidate's application still counts even if the receipt
 * doesn't arrive), so every call resolves to a boolean and logs its own errors.
 */

const ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export interface Mail {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
  /** Groups messages in Brevo's dashboard, e.g. "password-reset". */
  tag: string;
  replyTo?: { email: string; name?: string };
}

export const emailEnabled = () => Boolean(config.BREVO_API_KEY);

export async function sendMail(mail: Mail): Promise<boolean> {
  if (!config.BREVO_API_KEY) {
    if (!config.isTest) console.warn(`[email] BREVO_API_KEY not set - skipped "${mail.subject}" to ${mail.to.email}`);
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.BREVO_TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "api-key": config.BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: config.BREVO_SENDER_EMAIL, name: config.BREVO_SENDER_NAME },
        to: [mail.to],
        replyTo: mail.replyTo ?? (config.BREVO_REPLY_TO ? { email: config.BREVO_REPLY_TO } : undefined),
        subject: mail.subject,
        htmlContent: mail.html,
        textContent: mail.text,
        tags: [mail.tag],
      }),
    });
    if (!res.ok) {
      // Brevo explains refusals (unverified sender, quota, bad address) in the body.
      console.error(`[email] Brevo rejected "${mail.tag}" for ${mail.to.email}: ${res.status} ${await res.text().catch(() => "")}`);
      return false;
    }
    return true;
  } catch (err) {
    const reason = (err as Error)?.name === "AbortError" ? `timed out after ${config.BREVO_TIMEOUT_MS}ms` : String(err);
    console.error(`[email] Could not send "${mail.tag}" to ${mail.to.email}: ${reason}`);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/** Fire-and-forget: use where the caller must not wait for the mail to go out. */
export function sendMailInBackground(mail: Mail): void {
  void sendMail(mail);
}

/**
 * Logged once at startup so a misconfigured mailer is obvious immediately,
 * rather than being discovered when a candidate never receives a reset link.
 * Brevo accounts can restrict API access by IP, which rejects every call from
 * a new server until that IP is authorised - this names that case explicitly.
 */
export async function reportEmailSetup(): Promise<void> {
  if (!config.BREVO_API_KEY) {
    console.warn("Email is disabled: BREVO_API_KEY is not set. Password resets and notifications will not be delivered.");
    return;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.BREVO_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.brevo.com/v3/account", {
      signal: controller.signal,
      headers: { "api-key": config.BREVO_API_KEY, accept: "application/json" },
    });
    if (res.ok) {
      console.log(`Email enabled via Brevo, sending as ${config.BREVO_SENDER_NAME} <${config.BREVO_SENDER_EMAIL}>`);
      return;
    }
    const detail = await res.text().catch(() => "");
    if (detail.includes("unrecognised IP") || detail.includes("authorised_ips")) {
      console.error(
        "Email will FAIL: Brevo is blocking this server's IP address. Authorise it at " +
          "https://app.brevo.com/security/authorised_ips (or turn off the IP restriction), then redeploy.",
      );
    } else {
      console.error(`Email may fail: Brevo rejected the API key (${res.status}). ${detail.slice(0, 300)}`);
    }
  } catch (err) {
    console.error(`Email setup could not be verified: ${String(err)}`);
  } finally {
    clearTimeout(timeout);
  }
}
