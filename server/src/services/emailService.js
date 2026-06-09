import nodemailer from 'nodemailer';

import { env } from '../config/env.js';

let transporter;

function resolveDeliveryMode() {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    return 'preview';
  }

  return 'email';
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    if (env.nodeEnv === 'production') {
      throw new Error('SMTP is not configured for production OTP delivery.');
    }

    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  });

  return transporter;
}

export async function sendOtpEmail({ email, otp }) {
  const mailTransporter = getTransporter();
  const mode = resolveDeliveryMode();

  await mailTransporter.sendMail({
    from: env.smtpFrom,
    to: email,
    subject: `${env.appName} sign-in code`,
    text: `${otp} is your ${env.appName} login code. It expires in 5 minutes.`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; background:#0F172A; color:#E2E8F0; padding:24px;">
        <div style="max-width:520px; margin:0 auto; border:1px solid rgba(59,130,246,0.25); border-radius:20px; padding:32px; background:linear-gradient(180deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95));">
          <p style="font-size:12px; letter-spacing:0.3em; text-transform:uppercase; color:#60A5FA;">LitFlow secure login</p>
          <h1 style="margin:0 0 12px; font-size:28px;">Your OTP is <span style="color:#93C5FD;">${otp}</span></h1>
          <p style="line-height:1.7; color:#CBD5E1;">Use this 6-digit code to continue into LitFlow. The code expires in 5 minutes and can be used only once.</p>
          <p style="margin-top:28px; font-size:13px; color:#94A3B8;">If you did not request this email, you can safely ignore it.</p>
        </div>
      </div>
    `
  });

  return {
    mode
  };
}
