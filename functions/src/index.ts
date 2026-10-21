import { app } from "@azure/functions";

import { createContactHandler } from "./contact";
import { createConfiguredContactRateLimiter } from "./azureContactRateLimiter";

app.http("contact", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "contact",
  handler: createContactHandler({
    rateLimiter: createConfiguredContactRateLimiter(),
  }),
});
