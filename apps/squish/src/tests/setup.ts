import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
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

Object.defineProperty(global, 'localStorage', {
	value: localStorageMock,
	writable: true,
});

// Mock window.matchMedia
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

// Mock navigator.vibrate for haptic feedback
Object.defineProperty(navigator, 'vibrate', {
	writable: true,
	value: vi.fn(),
});

// Mock File System Access API
Object.defineProperty(window, 'showDirectoryPicker', {
	writable: true,
	value: vi.fn(),
});

// Mock Web Workers
global.Worker = class Worker {
	constructor(public url: string) {}
	postMessage = vi.fn();
	terminate = vi.fn();
	addEventListener = vi.fn();
	removeEventListener = vi.fn();
	dispatchEvent = vi.fn();
} as any;
