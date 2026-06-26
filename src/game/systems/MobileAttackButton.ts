export interface AttackButtonLayout {
	readonly x: number;
	readonly y: number;
	readonly radius: number;
}

const BUTTON_RADIUS = 34;
const EDGE_MARGIN = 22;
const BOTTOM_MARGIN = 28;

export function mobileAttackButtonLayout(viewport: {
	readonly width: number;
	readonly height: number;
}): AttackButtonLayout {
	return {
		x: viewport.width - BUTTON_RADIUS - EDGE_MARGIN,
		y: viewport.height - BUTTON_RADIUS - BOTTOM_MARGIN,
		radius: BUTTON_RADIUS
	};
}
