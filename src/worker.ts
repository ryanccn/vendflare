import { Hono } from "hono";
import { timing, startTime, endTime } from "hono/timing";
import { cors } from "hono/cors";

import { auth, requireAuth } from "./auth";
import { UserDataStore } from "./store";

import { inflateSync as inflate, deflateSync as deflate } from "fflate";
import { toHex } from "./utils";
import type { Bindings, Variables } from "./env";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use(
	"*",
	cors({
		origin: ["https://discord.com", "https://ptb.discord.com", "https://canary.discord.com"],
		exposeHeaders: ["etag"],
	}),
);

app.use("*", async (c, next) => {
	c.header("x-powered-by", `vendflare@${VENDFLARE_REVISION}`);
	await next();
});

app.use("*", timing());
app.use("*", auth);

app.get("/", (c) => c.redirect(c.env.ROOT_REDIRECT || "https://github.com/ryanccn/vendflare", 302));

app.use("/v1/settings", requireAuth);

app.get("/v1/settings", async (ctx) => {
	const store = ctx.get("store")!;

	startTime(ctx, "Read settings");
	const [settings, written] = await Promise.all([store.get("settings:value"), store.get("settings:written")]);
	endTime(ctx, "Read settings");

	if (!settings || !written) {
		return ctx.notFound();
	}

	const ifNoneMatch = ctx.req.headers.get("if-none-match");
	if (ifNoneMatch && ifNoneMatch === written) {
		return ctx.body(null, 304);
	}

	ctx.header("content-type", "application/octet-stream");
	ctx.header("etag", written);

	startTime(ctx, "Compress data");
	const compressedSettings = deflate(new TextEncoder().encode(settings));
	endTime(ctx, "Compress data");

	return ctx.body(compressedSettings);
});

app.put("/v1/settings", async (ctx) => {
	const store = ctx.get("store")!;

	if (ctx.req.headers.get("content-type") !== "application/octet-stream") {
		return ctx.json({ error: "Content type must be application/octet-stream" }, 400);
	}

	if (!ctx.req.body) {
		return ctx.json({ error: "No body provided" }, 400);
	}

	startTime(ctx, "Receive buffer");
	const rawData = await ctx.req.arrayBuffer();
	endTime(ctx, "Receive buffer");

	const sizeLimit = ctx.env.SIZE_LIMIT ? parseInt(ctx.env.SIZE_LIMIT) : null;
	if (sizeLimit && rawData.byteLength > sizeLimit) {
		return ctx.json({ error: "Settings are too large" }, 413);
	}

	const now = Date.now();

	startTime(ctx, "Decompress data");
	const decompressed = inflate(new Uint8Array(rawData));
	const dataString = new TextDecoder().decode(decompressed);
	endTime(ctx, "Decompress data");

	startTime(ctx, "Write data");
	await Promise.all([store.put("settings:value", dataString), store.put("settings:written", `${now}`)]);
	endTime(ctx, "Write data");

	return ctx.json({ written: now });
});

app.delete("/v1/settings", async (ctx) => {
	const store = ctx.get("store")!;

	startTime(ctx, "Delete data");
	await Promise.all([store.del("settings:value"), store.del("settings:written")]);
	endTime(ctx, "Delete data");

	return ctx.body(null, 204);
});

app.get("/v1", (c) => c.json({ ping: "pong" }));

app.delete("/v1/", requireAuth);
app.delete("/v1/", async (ctx) => {
	const store = ctx.get("store")!;

	startTime(ctx, "Delete data");
	await store.delAll();
	endTime(ctx, "Delete data");

	return ctx.body(null, 204);
});

app.get("/v1/oauth/callback", async (ctx) => {
	const code = new URL(ctx.req.url).searchParams.get("code");
	if (code === null) {
		return ctx.json({ error: "Missing code" }, 400);
	}

	const formData = new FormData();
	formData.append("client_id", ctx.env.DISCORD_CLIENT_ID);
	formData.append("client_secret", ctx.env.DISCORD_CLIENT_SECRET);
	formData.append("grant_type", "authorization_code");
	formData.append("code", code);
	formData.append("redirect_uri", ctx.env.DISCORD_REDIRECT_URI);
	formData.append("scope", "identify");

	startTime(ctx, "Obtain Discord token");

	const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
		method: "POST",
		body: formData,
	});

	if (!tokenRes.ok) {
		return ctx.json({ error: "Failed to authorize with Discord" }, 401);
	}

	const { access_token } = (await tokenRes.json()) as { access_token: string };

	endTime(ctx, "Obtain Discord token");
	startTime(ctx, "Fetch user information");

	const userRes = await fetch("https://discord.com/api/users/@me", {
		headers: { Authorization: `Bearer ${access_token}` },
	});

	if (!userRes.ok) {
		return ctx.json({ error: "Failed to retrieve account information" }, 500);
	}

	const { id: userId } = (await userRes.json()) as { id: string };

	endTime(ctx, "Fetch user information");

	if (ctx.env.ALLOWED_USERS && !ctx.env.ALLOWED_USERS.split(",").includes(userId)) {
		return ctx.json({ error: "Not whitelisted" }, 401);
	}

	const store = new UserDataStore(ctx.env, userId);

	startTime(ctx, "Attempt to obtain secret");
	let secret = await store.get("secret");
	endTime(ctx, "Attempt to obtain secret");

	if (!secret) {
		startTime(ctx, "Generate secret");

		const randValues = new Uint8Array(64);
		crypto.getRandomValues(randValues);

		secret = toHex(randValues);
		await store.put("secret", secret);

		endTime(ctx, "Generate secret");
	}

	return ctx.json({ secret });
});

app.get("/v1/oauth/settings", async (ctx) => {
	return ctx.json({
		clientId: ctx.env.DISCORD_CLIENT_ID,
		redirectUri: ctx.env.DISCORD_REDIRECT_URI,
	});
});

export default app;
export { UserData } from "./store/do";
