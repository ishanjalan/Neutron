import '@testing-library/jest-dom';
import { vi } from 'vitest';

const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value.toString();
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
	};
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

global.Worker = class Worker {
	constructor(public url: string) {}
	postMessage = vi.fn();
	terminate = vi.fn();
	addEventListener = vi.fn();
	removeEventListener = vi.fn();
	dispatchEvent = vi.fn();
} as unknown as typeof Worker;

// URL.createObjectURL / revokeObjectURL are not available in happy-dom
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// crypto.randomUUID polyfill
if (!globalThis.crypto?.randomUUID) {
	let counter = 0;
	(globalThis.crypto as Partial<Crypto>) = {
		...globalThis.crypto,
		randomUUID: () =>
			`00000000-0000-0000-0000-${String(counter++).padStart(12, '0')}` as `${string}-${string}-${string}-${string}-${string}`,
	};
}
