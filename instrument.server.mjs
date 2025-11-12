import * as Sentry from "@sentry/tanstackstart-react";

Sentry.init({
  dsn: "https://7bb4f5963879dc7ebcbee0a0efde56b1@o4510350031781888.ingest.us.sentry.io/4510350033682432",

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: import.meta.env.PROD ? false : true,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  // We recommend adjusting this value in production.
  // Learn more at https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
});
