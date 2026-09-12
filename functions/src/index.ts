import { app } from "@azure/functions";

import { contactHandler } from "./contact";

app.http("contact", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "contact",
  handler: contactHandler,
});
