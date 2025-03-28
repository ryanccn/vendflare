export type Bindings = {
	DB: D1Database;

	DISCORD_CLIENT_ID: string;
	DISCORD_CLIENT_SECRET: string;
	DISCORD_REDIRECT_URI?: string;

	SIZE_LIMIT?: string;
	ALLOWED_USERS?: string;
	ROOT_REDIRECT?: string;
};

export type Variables = {
	userId: string | null;
};

export type Env = {
	Bindings: Bindings;
	Variables: Variables;
};
