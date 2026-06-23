import { describe, expect, it } from 'vitest';
import {
	FloatingJoystick,
	JOYSTICK_ACTIVATION_REGION
} from './FloatingJoystick';

const viewport = { width: 320, height: 480 };

describe('floating joystick', () => {
	it('only activates in the documented lower-left movement region', () => {
		const joystick = new FloatingJoystick();

		expect(joystick.activate(1, { x: 80, y: 360 }, viewport)).toBe(true);
		joystick.reset();
		expect(joystick.activate(1, {
			x: viewport.width * JOYSTICK_ACTIVATION_REGION.maxWidthRatio + 1,
			y: 360
		}, viewport)).toBe(false);
		expect(joystick.activate(1, {
			x: 80,
			y: viewport.height * JOYSTICK_ACTIVATION_REGION.minHeightRatio - 1
		}, viewport)).toBe(false);
	});

	it('applies a dead zone and scales magnitude continuously', () => {
		const joystick = new FloatingJoystick(50, 10);
		joystick.activate(4, { x: 100, y: 300 }, viewport);

		joystick.move(4, { x: 108, y: 300 });
		expect(joystick.snapshot.direction).toEqual({ x: 0, y: 0 });

		joystick.move(4, { x: 130, y: 300 });
		expect(joystick.snapshot.direction.x).toBeCloseTo(0.5);
		expect(joystick.snapshot.direction.y).toBe(0);
	});

	it('clamps the knob and direction at full magnitude', () => {
		const joystick = new FloatingJoystick(50, 10);
		joystick.activate(2, { x: 100, y: 300 }, viewport);
		joystick.move(2, { x: 300, y: 300 });

		expect(joystick.snapshot.knob).toEqual({ x: 150, y: 300 });
		expect(joystick.snapshot.direction).toEqual({ x: 1, y: 0 });
	});

	it('maintains pointer ownership and release stops movement', () => {
		const joystick = new FloatingJoystick();
		expect(joystick.activate(7, { x: 100, y: 300 }, viewport)).toBe(true);
		expect(joystick.activate(8, { x: 120, y: 320 }, viewport)).toBe(false);
		expect(joystick.move(8, { x: 150, y: 300 })).toBe(false);
		expect(joystick.release(8)).toBe(false);

		joystick.move(7, { x: 150, y: 300 });
		expect(joystick.snapshot.direction.x).toBeGreaterThan(0);
		expect(joystick.release(7)).toBe(true);
		expect(joystick.snapshot.activePointerId).toBeNull();
		expect(joystick.snapshot.direction).toEqual({ x: 0, y: 0 });
	});
});
