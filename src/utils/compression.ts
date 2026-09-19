export const compress = (text: string) =>
	new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));

export const decompress = async (data: ArrayBuffer, maxSize: number) => {
	const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
	const decoder = new TextDecoder();

	let size = 0;
	let text = '';

	for (;;) {
		const { done, value } = await reader.read();
		if (done) {
			return text + decoder.decode();
		}

		size += value.byteLength;
		if (size > maxSize) {
			await reader.cancel();
			return null;
		}

		text += decoder.decode(value, { stream: true });
	}
};
