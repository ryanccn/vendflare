export type Bindings = {
	KV: KVNamespace;

	ROOT_REDIRECT?: string;

	DISCORD_CLIENT_ID: string;
	DISCORD_CLIENT_SECRET: string;
	DISCORD_REDIRECT_URI: string;

	SECRETS_SALT: string;
	SETTINGS_SALT: string;

	SIZE_LIMIT?: string;
	ALLOWED_USERS?: string;
};

export type Variables = {
	userId: string | null;
	saltedUserHash: string | null;
};
