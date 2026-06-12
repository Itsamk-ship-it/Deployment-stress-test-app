import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env";

let transporter: Transporter | null = null;

// Build (and cache) a nodemailer transport. When SMTP is not configured we fall
// back to a JSON transport that simply serializes the message — handy for local
// dev and for stress-testing the email code path without a real mail server.
export function getTransporter(): Transporter {
  if (transporter) return transporter;

  if (env.smtp.host) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail(input: SendEmailInput) {
  const tx = getTransporter();
  const info = await tx.sendMail({
    from: env.smtp.from,
    to: input.to,
    subject: input.subject,
    text: input.body,
    html: `<p>${input.body.replace(/\n/g, "<br/>")}</p>`,
  });
  return {
    messageId: info.messageId,
    // When using jsonTransport, `info.message` contains the serialized email.
    simulated: !env.smtp.host,
  };
}
