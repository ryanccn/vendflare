import { Hono } from "hono";

import { cors } from "hono/cors";

import { auth, requireAuth } from "./auth";
import { get, put, del, delAll } from "./durable";

import { toHex } from "./utils";
import type { Bindings, Variables } from "./env";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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

app.get("/", (c) =>
	c.redirect(c.env.ROOT_REDIRECT || "https://vencord.dev/", 302)
);

app.use("/v1/settings", requireAuth);

app.get("/v1/settings", async (ctx) => {
	const durableObject = ctx.get("durableObject")!;

	const [settings, written] = await Promise.all([
		get(durableObject, "settings:value"),
		get(durableObject, "settings:written"),
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
	const durableObject = ctx.get("durableObject")!;

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
		put(durableObject, "settings:value", await ctx.req.arrayBuffer()),
		put(durableObject, "settings:written", `${now}`),
	]);

	return ctx.json({ written: now });
});

app.delete("/v1/settings", async (ctx) => {
	const durableObject = ctx.get("durableObject")!;

	await Promise.all([
		del(durableObject, "settings:value"),
		del(durableObject, "settings:written"),
	]);

	return ctx.body(null, 204);
});

app.get("/v1", (c) => c.json({ ping: "pong" }));

app.delete("/v1/", requireAuth);
app.delete("/v1/", async (ctx) => {
	const durableObject = ctx.get("durableObject")!;

	await delAll(durableObject);
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

	const durableObject = ctx.env.USER_DATA.get(
		ctx.env.USER_DATA.idFromName(userId)
	);

	let secret = await get(durableObject, "secret");

	if (!secret) {
		const randValues = new Uint8Array(64);
		crypto.getRandomValues(randValues);

		secret = toHex(randValues);
		await put(durableObject, "secret", secret);
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
export { UserData } from "./durable";
