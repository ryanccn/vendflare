export type Env = {
	KV: KVNamespace;
	USER_DATA: DurableObjectNamespace;

	ROOT_REDIRECT?: string;

	DISCORD_CLIENT_ID: string;
	DISCORD_CLIENT_SECRET: string;
	DISCORD_REDIRECT_URI: string;

	SECRETS_SALT: string;
	SETTINGS_SALT: string;

	SIZE_LIMIT?: string;
	ALLOWED_USERS?: string;
};

export type Bindings = Env;

export type Variables = {
	userId: string | null;
	saltedUserHash: string | null;
	durableObject: DurableObjectStub | null;
};
