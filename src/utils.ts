export const toHex = (data: ArrayLike<number> | ArrayBufferLike) => {
	return [...new Uint8Array(data)].map((x) => x.toString(16).padStart(2, "0")).join("");
};
