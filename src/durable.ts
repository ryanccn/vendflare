import { Hono } from "hono";

type UserDataType = {
	secret: string;
	"settings:value": ArrayBuffer;
	"settings:written": string;
};

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

export const get = async <K extends keyof UserDataType>(
	object: DurableObjectStub,
	key: K
): Promise<UserDataType[K] | null> => {
	const value = await rawGet(object, key);

	if (typeof value === "undefined" || value === null) return null;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return value as any;
};

export const put = async <K extends keyof UserDataType>(
	object: DurableObjectStub,
	key: K,
	value: UserDataType[K]
) => {
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

export const del = async <K extends keyof UserDataType>(
	object: DurableObjectStub,
	key: K
) => {
	const req = new Request(
		`https://kv.vendflare.ryanccn.dev/${encodeURIComponent(key)}`,
		{ method: "DELETE" }
	);
	const res = await object.fetch(req);

	if (!res.ok) {
		throw new Error(`Failed to delete key "${key}" frin Durable Object`);
	}
};
