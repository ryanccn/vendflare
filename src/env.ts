import { UserDataStore } from "./store";

export type Bindings = {
	STORAGE_BACKEND?: "kv" | "do";
	KV?: KVNamespace;
	USER_DATA?: DurableObjectNamespace;

	ROOT_REDIRECT?: string;

	DISCORD_CLIENT_ID: string;
	DISCORD_CLIENT_SECRET: string;
	DISCORD_REDIRECT_URI: string;

	SIZE_LIMIT?: string;
	ALLOWED_USERS?: string;

	ANALYTICS_ENABLED?: string;
};

export type Variables = {
	userId: string | null;
	store: UserDataStore | null;
};

export type Env = {
	Bindings: Bindings;
	Variables: Variables;
};
