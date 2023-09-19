export type UserDataType = {
	"secret": string;
	"settings:value": string;
	"settings:written": string;
};

export const userDataKeys = ["secret", "settings:value", "settings:written"] as const;
