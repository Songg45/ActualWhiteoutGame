import type { MovementDirection } from './MovementSystem';

// Lower-left movement space; the right side stays available for future actions.
export const JOYSTICK_ACTIVATION_REGION = {
	maxWidthRatio: 0.58,
	minHeightRatio: 0.42
} as const;

export interface JoystickSnapshot {
	activePointerId: number | null;
	anchor: MovementDirection;
	knob: MovementDirection;
	direction: MovementDirection;
}

export class FloatingJoystick {
	private pointerId: number | null = null;
	private anchorPoint: MovementDirection = { x: 0, y: 0 };
	private knobPoint: MovementDirection = { x: 0, y: 0 };
	private directionValue: MovementDirection = { x: 0, y: 0 };

	constructor(
		readonly radius = 54,
		readonly deadZone = 9
	) {}

	get snapshot(): JoystickSnapshot {
		return {
			activePointerId: this.pointerId,
			anchor: { ...this.anchorPoint },
			knob: { ...this.knobPoint },
			direction: { ...this.directionValue }
		};
	}

	activate(
		pointerId: number,
		point: MovementDirection,
		viewport: { width: number; height: number }
	): boolean {
		if (
			this.pointerId !== null
			|| point.x > viewport.width * JOYSTICK_ACTIVATION_REGION.maxWidthRatio
			|| point.y < viewport.height * JOYSTICK_ACTIVATION_REGION.minHeightRatio
		) {
			return false;
		}

		this.pointerId = pointerId;
		this.anchorPoint = { ...point };
		this.knobPoint = { ...point };
		this.directionValue = { x: 0, y: 0 };
		return true;
	}

	move(pointerId: number, point: MovementDirection): boolean {
		if (pointerId !== this.pointerId) {
			return false;
		}

		const offsetX = point.x - this.anchorPoint.x;
		const offsetY = point.y - this.anchorPoint.y;
		const distance = Math.hypot(offsetX, offsetY);
		const clampedDistance = Math.min(distance, this.radius);
		const unitX = distance > 0 ? offsetX / distance : 0;
		const unitY = distance > 0 ? offsetY / distance : 0;

		this.knobPoint = {
			x: this.anchorPoint.x + unitX * clampedDistance,
			y: this.anchorPoint.y + unitY * clampedDistance
		};

		if (distance <= this.deadZone) {
			this.directionValue = { x: 0, y: 0 };
		} else {
			const magnitude = Math.min(
				1,
				(distance - this.deadZone) / (this.radius - this.deadZone)
			);
			this.directionValue = {
				x: unitX * magnitude,
				y: unitY * magnitude
			};
		}
		return true;
	}

	release(pointerId: number): boolean {
		if (pointerId !== this.pointerId) {
			return false;
		}
		this.reset();
		return true;
	}

	reset(): void {
		this.pointerId = null;
		this.directionValue = { x: 0, y: 0 };
	}
}
