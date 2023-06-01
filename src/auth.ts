import { MiddlewareHandler } from "hono";
import type { Bindings, Variables } from "./bindings";

import { toHex } from "./utils";

export const sha512 = async (data: string) => {
	const digest = await crypto.subtle.digest(
		"SHA-512",
		new TextEncoder().encode(data)
	);

	return toHex(digest);
};

export const getSaltedUserHash = async (userId: string, salt: string) => {
	return await sha512(salt + userId);
};

export const auth: MiddlewareHandler<{
	Bindings: Bindings;
	Variables: Variables;
}> = async (c, next) => {
	c.set("userId", null);
	c.set("saltedUserHash", null);

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

	const storedSecretKey = `secret:${await sha512(c.env.SECRETS_SALT + userId)}`;
	const storedSecret = await c.env.KV.get(storedSecretKey);

	if (!storedSecret || storedSecret !== secret) {
		await next();
		return;
	}

	c.set("userId", userId);
	c.set("saltedUserHash", await getSaltedUserHash(userId, c.env.SETTINGS_SALT));

	await next();
};

export const requireAuth: MiddlewareHandler = async (c, next) => {
	const userId = c.get("userId");
	if (userId === null) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	await next();
};
