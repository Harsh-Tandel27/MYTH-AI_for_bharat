import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://524d7183ceee136c67768f415dd50935@o4509695988531200.ingest.us.sentry.io/4509956862509056",
  integrations: [
    Sentry.feedbackIntegration({
      // Additional SDK configuration goes in here, for example:
      colorScheme: "system",
    }),
  ],
});