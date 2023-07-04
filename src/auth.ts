import { MiddlewareHandler } from "hono";
import { UserDataStore } from "./store";

import type { Bindings, Variables } from "./env";

export const auth: MiddlewareHandler<{
	Bindings: Bindings;
	Variables: Variables;
}> = async (c, next) => {
	c.set("userId", null);
	c.set("store", null);

	const authHeader = c.req.headers.get("authorization");
	if (authHeader === null) {
		await next();
		return;
	}

	let token: string;

	try {
		token = atob(authHeader);
	} catch {
		await next();
		return;
	}

	const tokenSplit = token.split(":");

	if (tokenSplit.length !== 2) {
		await next();
		return;
	}

	const [secret, userId] = tokenSplit;

	if (c.env.ALLOWED_USERS && !c.env.ALLOWED_USERS.split(",").includes(userId)) {
		await next();
		return;
	}

	const store = new UserDataStore(c.env, userId);
	const storedSecret = await store.get("secret");

	if (!storedSecret || storedSecret !== secret) {
		await next();
		return;
	}

	c.set("userId", userId);
	c.set("store", store);

	await next();
};

export const requireAuth: MiddlewareHandler = async (c, next) => {
	const userId = c.get("userId");
	if (userId === null) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	await next();
};
