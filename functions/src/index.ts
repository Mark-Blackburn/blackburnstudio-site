import { app } from "@azure/functions";

import { createContactHandler } from "./contact";
import { createConfiguredContactRateLimiter } from "./azureContactRateLimiter";
import { createConfiguredGalleryAccess } from "./azureGalleryAccess";
import { createGalleryHandlers, galleryResponse } from "./galleryHttp";
import { createConfiguredGalleryDelivery } from "./azureGalleryDelivery";
import { createGalleryDeliveryHandlers } from "./galleryDelivery";
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

// Gallery access is independent of contact and stays disabled until provisioned.
if (process.env.GALLERY_API_ENABLED === "true") {
  let handlers: ReturnType<typeof createGalleryHandlers> | undefined;
  let delivery: ReturnType<typeof createGalleryDeliveryHandlers> | undefined;
  const deliveryEnabled = process.env.GALLERY_DELIVERY_ENABLED === "true";
  const getDelivery = () => delivery ??= createGalleryDeliveryHandlers(createConfiguredGalleryDelivery());
  const routes = [
    ["galleryExchange", "POST", "galleries/{galleryId}/exchange", "exchange"],
    ["galleryMetadata", "GET", "galleries/{galleryId}", "metadata"],
    ["galleryLogout", "POST", "galleries/{galleryId}/logout", "logout"],
  ] as const;
  for (const [name, method, route, action] of routes) {
    app.http(name, {
      methods: [method], authLevel: "anonymous", route,
      handler: async (request, context) => {
        try {
          handlers ??= createGalleryHandlers(createConfiguredGalleryAccess());
          return await (deliveryEnabled && action === "metadata"
            ? getDelivery().metadata(request, context) : handlers[action](request, context));
        } catch {
          context.error("[gallery-api] Request failed");
          return galleryResponse(503, { message: "Gallery temporarily unavailable." });
        }
      },
    });
  }
  if (deliveryEnabled) {
    app.http("galleryImage", {
      methods: ["GET"], authLevel: "anonymous",
      route: "galleries/{galleryId}/assets/{assetId}/{variant}",
      handler: async (request, context) => {
        try { return await getDelivery().image(request, context); }
        catch {
          context.error("[gallery-api] Request failed");
          return galleryResponse(503, { message: "Gallery temporarily unavailable." });
        }
      },
    });
  }
}

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
