import type { UserDataType } from "./types";

export type UpstashConfig = {
	url: string;
	token: string;
};

export const get = async <K extends keyof UserDataType>(
	upstash: UpstashConfig,
	userId: string,
	key: K
): Promise<UserDataType[K] | null> => {
	const key2 = userId + ":" + key;

	const res = await fetch(new URL(`/get/${encodeURIComponent(key2)}`, upstash.url), {
		headers: { Authorization: `Bearer ${upstash.token}` },
	});
	if (!res.ok) throw new Error(`Encountered error fetching "${key2}" from Upstash`);

	const { result } = (await res.json()) as { result: unknown };

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return result as any;
};

export const put = async <K extends keyof UserDataType>(
	upstash: UpstashConfig,
	userId: string,
	key: K,
	value: UserDataType[K]
) => {
	const key2 = userId + ":" + key;

	const res = await fetch(new URL(`/set/${encodeURIComponent(key2)}`, upstash.url), {
		method: "POST",
		body: JSON.stringify(value),
		headers: { Authorization: `Bearer ${upstash.token}`, "Content-Type": "application/json; encoding=utf-8" },
	});
	if (!res.ok) throw new Error(`Encountered error setting "${key2}" on Upstash`);
};

export const del = async <K extends keyof UserDataType>(upstash: UpstashConfig, userId: string, key: K) => {
	const key2 = userId + ":" + key;

	const res = await fetch(new URL(`/del/${encodeURIComponent(key2)}`, upstash.url), {
		headers: { Authorization: `Bearer ${upstash.token}` },
	});
	if (!res.ok) throw new Error(`Encountered error deleting "${key2}" from Upstash`);
};
