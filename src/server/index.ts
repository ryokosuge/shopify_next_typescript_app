import Koa, { ExtendableContext } from "koa";
import Router from "koa-router";
import next from "next";
import dotenv from "dotenv"
import Shopify, { ApiVersion } from "@shopify/shopify-api";
import shopifyAuth, { verifyRequest } from "@shopify/koa-shopify-auth";
import { ShopifyState } from "../types/types";

dotenv.config();

const {
  NODE_ENV,
  PORT,
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET,
  SCOPES,
  HOST,
} = process.env;

const port = parseInt(PORT, 10) || 8080;
const dev = NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

Shopify.Context.initialize({
  API_KEY: SHOPIFY_API_KEY,
  API_SECRET_KEY: SHOPIFY_API_SECRET,
  SCOPES: SCOPES.split(","),
  HOST_NAME: HOST.replace(/https:\/\//, ""),
  API_VERSION: ApiVersion.October20,
  IS_EMBEDDED_APP: true,
  SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
});

// Storing the currently active shops in memory will force them to re-login when your server restarts. You should
// persist this object in your app.
const ACTIVE_SHOPIFY_SHOPS: { [key: string]: boolean } = {};

const handleRequest = async (context: ExtendableContext) => {
  await handle(context.req, context.res);
  context.respond = false;
  context.res.statusCode = 200;
}

const server = new Koa();
const router = new Router();

server.keys = [Shopify.Context.API_SECRET_KEY];

(async () => {
  try {
    await nextApp.prepare();
    server.use(
      shopifyAuth({
        afterAuth: async (context) => {
          const { shop, accessToken } = context.state.shopify as ShopifyState;
          const host = context.query.host as string;
          ACTIVE_SHOPIFY_SHOPS[shop] = true;

          const response = await Shopify.Webhooks.Registry.register({
            shop,
            accessToken,
            path: "/webhooks",
            topic: "APP_UNINSTALLED",
            webhookHandler: async (topic, shop, body) => {
              delete ACTIVE_SHOPIFY_SHOPS[shop];
            }
          });

          if (!response.success) {
            console.log(
              `Failed to register APP_UNINSTALLED webhook: ${response.result}`
            );
          }

          context.redirect(`/?shop=${shop}&host=${host}`);
        }
      })
    );

    router.get("(/_next/static/.*)", handleRequest);
    router.get("/_next/webpack-hmr", handleRequest);

    router.post("/webhooks", async (context) => {
      try {
        await Shopify.Webhooks.Registry.process(context.req, context.res);
        console.log("Webhook processed, returned status code 200");
      } catch (error: any) {
        console.log(`Failed to process webhook: ${error}`);
      }
    });

    router.get("/", async (context) => {
      const shop = context.query.shop as string;
      if (ACTIVE_SHOPIFY_SHOPS[shop] === undefined) {
        context.redirect(`/auth?shop=${shop}`);
        return;
      }
      await handleRequest(context);
    });

    router.get("(.*)", verifyRequest(), async (context) => {
      await handleRequest(context);
    });

    server.use(router.allowedMethods());
    server.use(router.routes());
    server.listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    })
  } catch (error) {
    console.error(error);
  }
})();
