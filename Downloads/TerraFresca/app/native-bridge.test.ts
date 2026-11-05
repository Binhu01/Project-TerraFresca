import { describe, it, expect } from 'vitest';
import { isNative } from './native-bridge';

describe('isNative', () => {
	it('returns false when Capacitor.isNativePlatform is undefined', () => {
		expect(isNative()).toBe(false);
	});
});