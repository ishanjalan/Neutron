import { fileURLToPath } from 'node:url';

export const fixture = (name: string) =>
	fileURLToPath(new URL(`../../fixtures/${name}`, import.meta.url));
