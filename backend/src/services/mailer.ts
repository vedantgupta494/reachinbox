import nodemailer from "nodemailer";
import { env } from "../config/env";

// A single reusable transport pointed at Ethereal (fake SMTP for testing).
// In a real system each Sender could map to its own transport/credentials;
// for this assignment we reuse one Ethereal inbox and vary the "from" field.
export const transporter = nodemailer.createTransport({
  host: env.ethereal.host,
  port: env.ethereal.port,
  secure: false,
  auth: {
    user: env.ethereal.user,
    pass: env.ethereal.pass,
  },
});

export interface SendEmailInput {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(input: SendEmailInput) {
  const info = await transporter.sendMail({
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  // Ethereal gives back a preview URL — very handy for the demo video.
  const previewUrl = nodemailer.getTestMessageUrl(info);
  return { messageId: info.messageId, previewUrl };
}
