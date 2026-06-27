import { describe, expect, it } from 'vitest';
import { JOYSTICK_ACTIVATION_REGION } from './FloatingJoystick';
import { mobileAttackButtonLayout } from './MobileAttackButton';

describe('mobile attack button layout', () => {
	it('places the attack affordance away from the 320x480 joystick region', () => {
		const viewport = { width: 320, height: 480 };
		const layout = mobileAttackButtonLayout(viewport);

		expect(layout.x - layout.radius).toBeGreaterThan(
			viewport.width * JOYSTICK_ACTIVATION_REGION.maxWidthRatio
		);
		expect(layout.y + layout.radius).toBeLessThanOrEqual(viewport.height);
		expect(layout.x + layout.radius).toBeLessThanOrEqual(viewport.width);
	});
});
