import Phaser from 'phaser';
import type { EnvironmentDefinition } from '../map/MapData';
import type { GridPoint, ScreenPoint } from '../map/IsoMath';
import { resolveEnvironmentPlacement } from './EnvironmentPlacement';

const COLORS = {
	trunk: 0x8f4d2e,
	trunkDark: 0x67331f,
	pine: 0x4e91a6,
	pineLight: 0x80c7d8,
	snow: 0xf4fbff,
	rock: 0x71869a,
	rockLight: 0xa9bac8,
	fence: 0xb86832,
	fenceLight: 0xe39a50,
	gate: 0xe0a054
} as const;

function vectorPoint(x: number, y: number): Phaser.Math.Vector2 {
	return new Phaser.Math.Vector2(x, y);
}

export class EnvironmentObject extends Phaser.GameObjects.Container {
	readonly definition: EnvironmentDefinition;
	readonly basePoint: ScreenPoint;

	constructor(
		scene: Phaser.Scene,
		definition: EnvironmentDefinition,
		origin: ScreenPoint
	) {
		const placement = resolveEnvironmentPlacement(definition, origin);
		const { basePoint } = placement;
		super(scene, basePoint.x, basePoint.y);

		this.definition = definition;
		this.basePoint = basePoint;
		this.add(
			this.createVisual(scene, definition)
				.setPosition(placement.visualOffset.x, placement.visualOffset.y)
		);
		this.setDepth(placement.depth);
		scene.add.existing(this);
	}

	getBlockedCells(): readonly GridPoint[] {
		return this.definition.blockedFootprint.map((offset) => ({
			x: this.definition.grid.x + offset.x,
			y: this.definition.grid.y + offset.y
		}));
	}

	private createVisual(
		scene: Phaser.Scene,
		definition: EnvironmentDefinition
	): Phaser.GameObjects.Graphics {
		const graphics = scene.add.graphics();

		switch (definition.kind) {
			case 'tree':
				this.drawTree(graphics);
				break;
			case 'rock':
				this.drawRock(graphics);
				break;
			case 'fence':
				this.drawFence(graphics, definition.orientation ?? 'x');
				break;
			case 'gate':
				this.drawGate(graphics, definition.orientation ?? 'x');
				break;
		}

		return graphics;
	}

	private drawTree(graphics: Phaser.GameObjects.Graphics): void {
		graphics
			.fillStyle(COLORS.trunkDark)
			.fillRect(-9, -34, 18, 36)
			.fillStyle(COLORS.trunk)
			.fillRect(-6, -38, 12, 38)
			.fillStyle(COLORS.pine)
			.fillTriangle(0, -122, -43, -54, 43, -54)
			.fillTriangle(0, -96, -52, -27, 52, -27)
			.fillTriangle(0, -70, -58, -4, 58, -4)
			.fillStyle(COLORS.pineLight)
			.fillTriangle(-4, -117, -35, -58, 3, -65)
			.fillTriangle(-7, -89, -42, -32, 2, -40)
			.fillStyle(COLORS.snow)
			.fillTriangle(0, -124, -18, -95, 18, -95)
			.fillTriangle(-2, -97, -24, -66, 19, -69);
	}

	private drawRock(graphics: Phaser.GameObjects.Graphics): void {
		graphics
			.fillStyle(0x526779, 0.24)
			.fillEllipse(0, 4, 86, 28)
			.fillStyle(COLORS.rock)
			.fillPoints([
				vectorPoint(-40, 0),
				vectorPoint(-29, -35),
				vectorPoint(5, -51),
				vectorPoint(38, -25),
				vectorPoint(42, 0)
			], true)
			.fillStyle(COLORS.rockLight)
			.fillPoints([
				vectorPoint(-27, -34),
				vectorPoint(5, -51),
				vectorPoint(13, -19),
				vectorPoint(-12, -9)
			], true)
			.fillStyle(COLORS.snow)
			.fillEllipse(-4, -39, 47, 17);
	}

	private drawFence(
		graphics: Phaser.GameObjects.Graphics,
		orientation: 'x' | 'y'
	): void {
		const direction = orientation === 'x' ? 1 : -1;
		graphics
			.lineStyle(9, COLORS.fence, 1)
			.beginPath()
			.moveTo(-52, -8)
			.lineTo(52, -8 + direction * 38)
			.strokePath()
			.lineStyle(4, COLORS.fenceLight, 1)
			.beginPath()
			.moveTo(-52, -12)
			.lineTo(52, -12 + direction * 38)
			.strokePath();

		for (const x of [-42, -14, 14, 42]) {
			const y = direction * ((x + 52) / 104) * 38;
			graphics
				.fillStyle(COLORS.fence)
				.fillRect(x - 6, y - 40, 12, 43)
				.fillStyle(COLORS.snow)
				.fillTriangle(x - 6, y - 40, x + 6, y - 40, x, y - 49);
		}
	}

	private drawGate(
		graphics: Phaser.GameObjects.Graphics,
		orientation: 'x' | 'y'
	): void {
		const direction = orientation === 'x' ? 1 : -1;
		graphics
			.lineStyle(8, COLORS.gate, 1)
			.beginPath()
			.moveTo(-53, -3)
			.lineTo(-30, -3 + direction * 9)
			.moveTo(30, -3 + direction * 29)
			.lineTo(53, -3 + direction * 38)
			.strokePath()
			.fillStyle(COLORS.fence)
			.fillRect(-58, -49, 12, 49)
			.fillRect(46, -11 + direction * 38 - 38, 12, 49)
			.fillStyle(COLORS.snow)
			.fillTriangle(-58, -49, -46, -49, -52, -57)
			.fillTriangle(46, -11 + direction * 38 - 38, 58, -11 + direction * 38 - 38, 52, -19 + direction * 38 - 38);
	}
}
