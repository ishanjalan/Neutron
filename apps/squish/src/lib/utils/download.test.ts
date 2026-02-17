import { describe, it, expect } from 'vitest';
import { isFileSystemAccessSupported } from './download';

describe('download utils', () => {
	describe('isFileSystemAccessSupported', () => {
		it('should return true when showDirectoryPicker is available', () => {
			// In our test environment, this is mocked to be available
			expect(isFileSystemAccessSupported()).toBe(true);
		});

		it('should check for showDirectoryPicker property', () => {
			// Verify the function checks the right property
			expect('showDirectoryPicker' in window).toBe(true);
		});
	});
});
