import type { UserDataType } from "./types";

export const get = async <K extends keyof UserDataType>(
	kv: KVNamespace,
	userId: string,
	key: K
): Promise<UserDataType[K] | null> => {
	const value = await kv.get(userId + ":" + key, "text");

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return value as any;
};

export const put = async <K extends keyof UserDataType>(
	kv: KVNamespace,
	userId: string,
	key: K,
	value: UserDataType[K]
) => {
	await kv.put(userId + ":" + key, value);
};

export const del = async <K extends keyof UserDataType>(kv: KVNamespace, userId: string, key: K) => {
	await kv.delete(userId + ":" + key);
};
