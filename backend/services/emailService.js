const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

const RETRYABLE_SMTP_CODES = new Set(['ECONNECTION', 'ETIMEDOUT', 'EDNS', 'ESOCKET', 'EMAXLIMIT']);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createSmtpTransporter() {
  const emailUser = process.env.EMAIL_USER || '';
  const host = process.env.EMAIL_HOST ||
    (emailUser.includes('@gmail.com')
      ? 'smtp.gmail.com'
      : emailUser.includes('@outlook.com') || emailUser.includes('@hotmail.com')
        ? 'smtp-mail.outlook.com'
        : emailUser.includes('@yahoo.com')
          ? 'smtp.mail.yahoo.com'
          : undefined);

  return nodemailer.createTransport({
    host,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === 'true',
    requireTLS: process.env.EMAIL_SECURE !== 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });
}

function isRetryableEmailError(error) {
  if (!error) return false;
  if (RETRYABLE_SMTP_CODES.has(error.code)) return true;
  const status = Number(error.code || error.responseCode || error.statusCode);
  return status >= 500 || status === 429;
}

async function sendViaProvider(message) {
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const [result] = await sgMail.send({
      to: message.to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER,
        name: process.env.SENDGRID_FROM_NAME || 'Andino Express'
      },
      subject: message.subject,
      html: message.html
    });
    return {
      provider: 'sendgrid',
      messageId: result?.headers?.['x-message-id'],
      statusCode: result?.statusCode
    };
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.warn('email_not_configured_dev_mode', { to: message.to, subject: message.subject });
    return { provider: 'dev', messageId: 'dev-mode-no-email' };
  }

  const transporter = createSmtpTransporter();
  const result = await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || 'Andino Express'}" <${process.env.EMAIL_USER}>`,
    ...message
  });

  if (result.rejected?.length) {
    const err = new Error(`Rejected recipients: ${result.rejected.join(', ')}`);
    err.code = 'EENVELOPE';
    throw err;
  }

  return { provider: 'smtp', messageId: result.messageId };
}

async function sendTransactionalEmail(message, options = {}) {
  const maxAttempts = options.maxAttempts || 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await sendViaProvider(message);
      logger.info('email_sent', {
        type: options.type,
        orderId: options.orderId,
        to: message.to,
        provider: result.provider,
        messageId: result.messageId,
        attempt
      });
      return { ok: true, ...result, attempt };
    } catch (error) {
      lastError = error;
      logger.warn('email_failed', {
        type: options.type,
        orderId: options.orderId,
        to: message.to,
        code: error.code,
        responseCode: error.responseCode,
        message: error.message,
        attempt
      });

      if (attempt >= maxAttempts || !isRetryableEmailError(error)) {
        break;
      }
      await sleep(250 * attempt);
    }
  }

  return {
    ok: false,
    error: lastError?.message || 'Email failed',
    code: lastError?.code
  };
}

module.exports = {
  sendTransactionalEmail,
  isRetryableEmailError
};
