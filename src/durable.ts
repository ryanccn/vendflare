import { Hono } from "hono";

export class UserData {
	state: DurableObjectState;
	router: Hono;

	constructor(state: DurableObjectState) {
		this.state = state;

		this.router = new Hono();

		this.router
			.get("/:key", async (c) => {
				const key = c.req.param("key");
				const value = await this.state.storage.get(key);

				return c.json({ ok: true, value });
			})
			.put(async (c) => {
				const key = c.req.param("key");
				const { value } = await c.req.json();

				await this.state.storage.put(key, value);
				this.state.storage.sync();

				return c.json({ ok: true });
			})
			.delete(async (c) => {
				const key = c.req.param("key");
				await this.state.storage.delete(key);

				return c.json({ ok: true });
			});
	}

	async fetch(request: Request): Promise<Response> {
		return this.router.fetch(request);
	}
}

const rawGet = async (object: DurableObjectStub, key: string) => {
	const req = new Request(
		`https://kv.vendflare.ryanccn.dev/${encodeURIComponent(key)}`
	);
	const res = await object.fetch(req);

	if (!res.ok) {
		throw new Error(`Failed to get key "${key}" from Durable Object`);
	}

	const data = (await res.json()) as { value: unknown };

	return data.value;
};

export async function get(
	object: DurableObjectStub,
	key: string,
	type?: "string"
): Promise<string | null>;
export async function get(
	object: DurableObjectStub,
	key: string,
	type: "number"
): Promise<number | null>;
export async function get(
	object: DurableObjectStub,
	key: string,
	type: "arraybuffer"
): Promise<ArrayBuffer | null>;
export async function get(
	object: DurableObjectStub,
	key: string,
	type: "string" | "arraybuffer" | "number" = "string"
): Promise<string | ArrayBuffer | number | null> {
	const value = await rawGet(object, key);

	if (typeof value === "undefined" || value === null) return null;

	if (type === "string" && typeof value !== "string") {
		console.error({ type, value });
		throw new Error(`Key "${key}" is not string as required`);
	} else if (type === "number" && typeof value !== "number") {
		console.error({ type, value });
		throw new Error(`Key "${key}" is not string as required`);
	} else if (type === "arraybuffer" && !(value instanceof ArrayBuffer)) {
		console.error({ type, value });
		throw new Error(`Key "${key}" is not ArrayBuffer as required`);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return value as any;
}

export const put = async (
	object: DurableObjectStub,
	key: string,
	value: unknown
) => {
	if (value instanceof Promise) {
		value = await value;
	}

	const req = new Request(
		`https://kv.vendflare.ryanccn.dev/${encodeURIComponent(key)}`,
		{
			method: "PUT",
			body: JSON.stringify({ value }),
			headers: { "content-type": "application/json" },
		}
	);
	const res = await object.fetch(req);

	if (!res.ok) {
		throw new Error(`Failed to set key "${key}" on Durable Object`);
	}
};

export const del = async (object: DurableObjectStub, key: string) => {
	const req = new Request(
		`https://kv.vendflare.ryanccn.dev/${encodeURIComponent(key)}`,
		{ method: "DELETE" }
	);
	const res = await object.fetch(req);

	if (!res.ok) {
		throw new Error(`Failed to delete key "${key}" frin Durable Object`);
	}
};
