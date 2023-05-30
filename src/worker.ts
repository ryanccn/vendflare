import { Hono } from "hono";

import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { auth, getSaltedUserHash, requireAuth } from "./auth";

import type { Bindings, Variables } from "./bindings";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", logger());
app.use(
	"*",
	cors({
		origin: [
			"https://discord.com",
			"https://ptb.discord.com",
			"https://canary.discord.com",
		],
		exposeHeaders: ["etag"],
	})
);

app.use("*", auth);

app.get("/", (c) => c.redirect(c.env.ROOT_REDIRECT, 302));

app.use("/v1/settings", requireAuth);

app.head("/v1/settings", async (ctx) => {
	const saltedUserHash = ctx.get("saltedUserHash")!;

	const written = await ctx.env.KV.get(`settings:${saltedUserHash}:written`);

	if (!written) {
		return ctx.notFound();
	}

	ctx.header("etag", written);

	return ctx.body(null, 204);
});

app.get("/v1/settings", async (ctx) => {
	const saltedUserHash = ctx.get("saltedUserHash")!;

	const [settings, written] = await Promise.all([
		ctx.env.KV.get(`settings:${saltedUserHash}:value`, "arrayBuffer"),
		ctx.env.KV.get(`settings:${saltedUserHash}:written`),
	]);

	if (!settings || !written) {
		return ctx.notFound();
	}

	const ifNoneMatch = ctx.req.headers.get("if-none-match");
	if (ifNoneMatch && ifNoneMatch === written) {
		return ctx.body(null, 304);
	}

	ctx.header("content-type", "application/octet-stream");
	ctx.header("etag", written);

	return ctx.body(settings);
});

app.put("/v1/settings", async (ctx) => {
	const saltedUserHash = ctx.get("saltedUserHash")!;

	if (ctx.req.headers.get("content-type") !== "application/octet-stream") {
		return ctx.json(
			{ error: "Content type must be application/octet-stream" },
			400
		);
	}

	if (!ctx.req.body) {
		return ctx.json({ error: "No body provided" }, 400);
	}

	const actualContentLength = parseInt(ctx.req.headers.get("content-length")!);
	const sizeLimit = ctx.env.SIZE_LIMIT ? parseInt(ctx.env.SIZE_LIMIT) : null;
	if (sizeLimit && actualContentLength > sizeLimit) {
		return ctx.json({ error: "Settings are too large" }, 413);
	}

	const now = Date.now();

	await Promise.all([
		ctx.env.KV.put(`settings:${saltedUserHash}:value`, ctx.req.body),
		ctx.env.KV.put(`settings:${saltedUserHash}:written`, `${now}`),
	]);

	return ctx.json({ written: now });
});

app.delete("/v1/settings", async (ctx) => {
	const saltedUserHash = ctx.get("saltedUserHash")!;

	await Promise.all([
		ctx.env.KV.delete(`settings:${saltedUserHash}:value`),
		ctx.env.KV.delete(`settings:${saltedUserHash}:written`),
	]);

	return ctx.body(null, 204);
});

app.get("/v1", (c) => c.json({ ping: "pong" }));

app.delete("/v1", requireAuth);
app.delete("/v1", async (ctx) => {
	const saltedUserHash = ctx.get("saltedUserHash")!;
	await Promise.all([
		ctx.env.KV.delete(`secret:${saltedUserHash}`),
		ctx.env.KV.delete(`settings:${saltedUserHash}:value`),
		ctx.env.KV.delete(`settings:${saltedUserHash}:written`),
	]);

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

	const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
		method: "POST",
		body: formData,
	});

	if (!tokenRes.ok) {
		return ctx.json({ error: "Failed to authorize with Discord" }, 401);
	}

	const { access_token } = (await tokenRes.json()) as { access_token: string };

	const userRes = await fetch("https://discord.com/api/users/@me", {
		headers: { Authorization: `Bearer ${access_token}` },
	});

	if (!userRes.ok) {
		return ctx.json({ error: "Failed to retrieve account information" }, 500);
	}

	const { id: userId } = (await userRes.json()) as { id: string };
	if (
		ctx.env.ALLOWED_USERS &&
		!ctx.env.ALLOWED_USERS.split(",").includes(userId)
	) {
		return ctx.json({ error: "Not whitelisted" }, 401);
	}

	const saltedUserHash = await getSaltedUserHash(userId, ctx.env.SECRETS_SALT);
	let secret = await ctx.env.KV.get(`secret:${saltedUserHash}`);

	if (!secret) {
		const randValues = new Uint8Array(64);
		crypto.getRandomValues(randValues);

		secret = [...randValues]
			.map((x) => x.toString(16).padStart(2, "0"))
			.join("");
		await ctx.env.KV.put(`secret:${saltedUserHash}`, secret);
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
