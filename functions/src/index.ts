import { app } from "@azure/functions";

import { createContactHandler } from "./contact";
import { createConfiguredContactRateLimiter } from "./azureContactRateLimiter";
import {
  CONTACT_RETENTION_SCHEDULE,
  createContactRateLimitRetentionHandler,
} from "./contactRateLimitRetention";

app.http("contact", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "contact",
  handler: createContactHandler({
    rateLimiter: createConfiguredContactRateLimiter(),
  }),
});

// Opt in after deploying and checking dry-run results. Never run on startup.
if (
  process.env.CONTACT_RATE_LIMIT_RETENTION_MODE &&
  process.env.CONTACT_RATE_LIMIT_RETENTION_MODE !== "disabled"
) {
  app.timer("contactRateLimitRetention", {
    schedule: CONTACT_RETENTION_SCHEDULE,
    runOnStartup: false,
    useMonitor: true,
    handler: createContactRateLimitRetentionHandler(),
  });
}
