import Koa, { ExtendableContext } from "koa";
import Router from "koa-router";
import next from "next";

const { NODE_ENV, PORT } = process.env;

const port = PORT == null ? 8080 : parseInt(PORT, 10) || 8080;
const dev = NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const handleRequest = async (context: ExtendableContext) => {
	await handle(context.req, context.res);
	context.respond = false;
	context.res.statusCode = 200;
}

(async () => {
	try {
		await nextApp.prepare();
		const server = new Koa();
		const router = new Router();

		router.get("(/_next/static/.*)", handleRequest);
		router.get("/_next/webpack-hmr", handleRequest);
		router.get("(.*)", async (context) => {
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
