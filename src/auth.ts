import { MiddlewareHandler } from "hono";
import { startTime, endTime } from "hono/timing";
import { UserDataStore } from "./store";

import type { Bindings, Variables } from "./env";

export const auth: MiddlewareHandler<{
	Bindings: Bindings;
	Variables: Variables;
}> = async (ctx, next) => {
	startTime(ctx, "Authentication");
	ctx.set("userId", null);
	ctx.set("store", null);

	const authHeader = ctx.req.headers.get("authorization");
	if (authHeader === null) {
		endTime(ctx, "Authentication");
		await next();
		return;
	}

	let token: string;

	try {
		token = atob(authHeader);
	} catch {
		endTime(ctx, "Authentication");
		await next();
		return;
	}

	const tokenSplit = token.split(":");

	if (tokenSplit.length !== 2) {
		endTime(ctx, "Authentication");
		await next();
		return;
	}

	const [secret, userId] = tokenSplit;

	if (ctx.env.ALLOWED_USERS && !ctx.env.ALLOWED_USERS.split(",").includes(userId)) {
		endTime(ctx, "Authentication");
		await next();
		return;
	}

	const store = new UserDataStore(ctx.env, userId);
	const storedSecret = await store.get("secret");

	if (!storedSecret || storedSecret !== secret) {
		endTime(ctx, "Authentication");
		await next();
		return;
	}

	ctx.set("userId", userId);
	ctx.set("store", store);

	endTime(ctx, "Authentication");
	await next();
};

export const requireAuth: MiddlewareHandler = async (ctx, next) => {
	const userId = ctx.get("userId");
	if (userId === null) {
		return ctx.json({ error: "Unauthorized" }, 401);
	}

	await next();
};
