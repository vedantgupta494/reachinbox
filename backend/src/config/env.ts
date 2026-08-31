import dotenv from "dotenv";
dotenv.config();

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwtSecret: required("JWT_SECRET", "dev_secret_change_me"),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",

  databaseUrl: required("DATABASE_URL"),

  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
  },

  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE ?? "http://localhost:9200",
    emailsIndex: process.env.ELASTICSEARCH_EMAILS_INDEX ?? "emails",
  },

  ethereal: {
    host: process.env.ETHEREAL_SMTP_HOST ?? "smtp.ethereal.email",
    port: parseInt(process.env.ETHEREAL_SMTP_PORT ?? "587", 10),
    user: process.env.ETHEREAL_SMTP_USER ?? "",
    pass: process.env.ETHEREAL_SMTP_PASS ?? "",
  },

  rateLimiting: {
    // Global default; can be overridden per-Sender row in the DB
    maxEmailsPerHourDefault: parseInt(
      process.env.MAX_EMAILS_PER_HOUR_PER_SENDER ?? "200",
      10
    ),
    minDelayBetweenSendsMs: parseInt(
      process.env.MIN_DELAY_BETWEEN_SENDS_MS ?? "2000",
      10
    ),
    workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY ?? "5", 10),
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? "",
  },

  slack: {
    clientId: process.env.SLACK_CLIENT_ID ?? "",
    clientSecret: process.env.SLACK_CLIENT_SECRET ?? "",
    redirectUri: process.env.SLACK_REDIRECT_URI ?? "",
  },
};
