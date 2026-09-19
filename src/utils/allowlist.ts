export const isAllowedUser = (allowedUsers: string | undefined, userId: string) =>
	!allowedUsers || allowedUsers.split(',').some((id) => id.trim() === userId);
