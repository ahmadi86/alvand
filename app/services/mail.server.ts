import nodemailer from "nodemailer";

export async function sendMagicLinkEmail(email: string, magicLink: string) {
  const smtpUrl = process.env.SMTP_URL;
  const from = process.env.EMAIL_FROM;

  if (!smtpUrl || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP_URL and EMAIL_FROM are required in production");
    }

    console.info("Development magic link", { email, magicLink });
    return;
  }

  const transport = nodemailer.createTransport(smtpUrl);
  await transport.sendMail({
    from,
    to: email,
    subject: "Sign in to Alvand",
    text: `Use this one-time link within 15 minutes to sign in: ${magicLink}`,
    html: `<p>Use this one-time link within 15 minutes to sign in:</p><p><a href="${magicLink}">Sign in to Alvand</a></p>`,
  });
}
