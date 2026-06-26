import Phaser from 'phaser';
import { DEPTH_LAYERS, GAME_COLORS, worldDepthFromBaseY } from '../config';
import { EnvironmentObject } from '../objects/EnvironmentObject';
import {
	getBlockedGridKeys,
	type MapData,
	type MapMarker,
	type TerrainTile
} from './MapData';
import type { MapRuntime } from './MapRuntime';
import {
	getTileDiamond,
	gridToScreen,
	type ScreenPoint
} from './IsoMath';

const MAP_COLORS = {
	snow: 0xdff2ff,
	snowEdge: 0xb8d8ec,
	camp: 0xb97956,
	campLight: 0xd49a75,
	campEdge: 0x8c543b,
	lane: 0xe45b67,
	laneGlow: 0xffb5b9,
	pad: 0x526b72,
	padEdge: 0xeaf7fb,
	wood: 0xd18a45,
	meat: 0xc95764,
	fire: 0xffb13b,
	fireHot: 0xffe27a,
	label: '#17384c'
} as const;

function vectorPoint(x: number, y: number): Phaser.Math.Vector2 {
	return new Phaser.Math.Vector2(x, y);
}

export interface MapScreenBounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface BuiltMap {
	readonly data: MapData;
	readonly runtime?: MapRuntime;
	readonly origin: ScreenPoint;
	readonly bounds: MapScreenBounds;
	readonly blockedGridKeys: ReadonlySet<string>;
	destroy(): void;
}

export class MapBuilder {
	constructor(
		private readonly scene: Phaser.Scene,
		private readonly data: MapData,
		private readonly origin: ScreenPoint,
		private readonly runtime?: MapRuntime
	) {}

	build(): BuiltMap {
		const terrain = this.scene.add.graphics().setDepth(DEPTH_LAYERS.ground);
		const lanes = this.scene.add.graphics().setDepth(DEPTH_LAYERS.ground + 20);
		const markerObjects: Phaser.GameObjects.GameObject[] = [];
		const environmentObjects: EnvironmentObject[] = [];

		for (const tile of this.data.terrain) {
			this.drawTerrainTile(terrain, tile);
		}

		this.drawSpawnLanes(lanes);

		for (const marker of this.data.markers.filter((marker) => marker.kind !== 'build-pad')) {
			markerObjects.push(this.createMarker(marker));
		}

		for (const definition of this.data.environment) {
			environmentObjects.push(
				new EnvironmentObject(this.scene, definition, this.origin)
			);
		}

		const bounds = this.calculateBounds();

		return {
			data: this.data,
			runtime: this.runtime,
			origin: this.origin,
			bounds,
			blockedGridKeys: getBlockedGridKeys(this.data),
			destroy: () => {
				terrain.destroy();
				lanes.destroy();
				for (const marker of markerObjects) {
					marker.destroy();
				}
				for (const environment of environmentObjects) {
					environment.destroy();
				}
			}
		};
	}

	private drawTerrainTile(
		graphics: Phaser.GameObjects.Graphics,
		tile: TerrainTile
	): void {
		const corners = getTileDiamond(tile.grid, this.origin);
		const points = corners.map(({ x, y }) => vectorPoint(x, y));

		if (tile.kind === 'camp') {
			graphics
				.fillStyle(MAP_COLORS.campEdge)
				.fillPoints(points.map((point) => vectorPoint(point.x, point.y + 6)), true)
				.fillStyle(MAP_COLORS.camp)
				.fillPoints(points, true)
				.lineStyle(1, MAP_COLORS.campLight, 0.22)
				.strokePoints(points, true);
			return;
		}

		graphics
			.fillStyle(MAP_COLORS.snowEdge)
			.fillPoints(points.map((point) => vectorPoint(point.x, point.y + 4)), true)
			.fillStyle(MAP_COLORS.snow)
			.fillPoints(points, true)
			.lineStyle(1, 0xffffff, 0.34)
			.strokePoints(points, true);
	}

	private drawSpawnLanes(graphics: Phaser.GameObjects.Graphics): void {
		for (const lane of this.data.spawnLanes) {
			const points = lane.points.map((point) => gridToScreen(point, this.origin));

			graphics
				.lineStyle(18, MAP_COLORS.laneGlow, 0.18)
				.beginPath()
				.moveTo(points[0].x, points[0].y);

			for (const point of points.slice(1)) {
				graphics.lineTo(point.x, point.y);
			}

			graphics
				.strokePath()
				.lineStyle(4, MAP_COLORS.lane, 0.62)
				.beginPath()
				.moveTo(points[0].x, points[0].y);

			for (const point of points.slice(1)) {
				graphics.lineTo(point.x, point.y);
			}

			graphics.strokePath();

			for (const point of points.slice(0, -1)) {
				graphics
					.fillStyle(MAP_COLORS.lane, 0.78)
					.fillCircle(point.x, point.y, 7);
			}
		}
	}

	private createMarker(marker: MapMarker): Phaser.GameObjects.Container {
		const point = gridToScreen(marker.grid, this.origin);
		const container = this.scene.add.container(point.x, point.y)
			.setDepth(worldDepthFromBaseY(point.y - 1));
		const graphics = this.scene.add.graphics();

		if (marker.kind === 'campfire') {
			graphics
				.fillStyle(0x5e4539, 0.2)
				.fillEllipse(0, 4, 104, 34)
				.lineStyle(10, 0x8c6a58, 1)
				.strokeCircle(0, -8, 35)
				.fillStyle(MAP_COLORS.fire)
				.fillTriangle(-19, -7, 0, -63, 20, -7)
				.fillStyle(MAP_COLORS.fireHot)
				.fillTriangle(-9, -9, 2, -43, 10, -9);
		} else if (marker.kind === 'resource-station') {
			const color = marker.variant === 'meat' ? MAP_COLORS.meat : MAP_COLORS.wood;
			graphics
				.fillStyle(0x3d4f55, 0.28)
				.fillEllipse(0, 8, 112, 34)
				.fillStyle(color)
				.fillRoundedRect(-47, -34, 94, 38, 5)
				.lineStyle(5, 0xf6d6a6, 1)
				.strokeRoundedRect(-47, -34, 94, 38, 5);

			for (const x of [-29, 0, 29]) {
				graphics
					.fillStyle(marker.variant === 'meat' ? 0xffb0b6 : 0xf3c177)
					.fillCircle(x, -37, 13);
			}
		} else {
			const diamond = getTileDiamond({ x: 0, y: 0 });
			const points = diamond.map(({ x, y }) => vectorPoint(x * 0.75, y * 0.75));
			graphics
				.fillStyle(MAP_COLORS.pad, 0.72)
				.fillPoints(points, true)
				.lineStyle(4, MAP_COLORS.padEdge, 0.92)
				.strokePoints(points, true)
				.lineStyle(3, 0xffffff, 0.7)
				.strokeCircle(0, 0, 12);
		}

		const label = this.scene.add.text(0, marker.kind === 'campfire' ? 23 : 20, marker.label, {
			color: MAP_COLORS.label,
			backgroundColor: 'rgba(244,251,255,0.88)',
			fontFamily: 'Arial, sans-serif',
			fontSize: '13px',
			fontStyle: 'bold',
			padding: { x: 6, y: 3 }
		}).setOrigin(0.5, 0);

		container.add([graphics, label]);
		return container;
	}

	private calculateBounds(): MapScreenBounds {
		const top = gridToScreen({ x: 0, y: 0 }, this.origin);
		const left = gridToScreen({ x: 0, y: this.data.height - 1 }, this.origin);
		const right = gridToScreen({ x: this.data.width - 1, y: 0 }, this.origin);
		const bottom = gridToScreen({
			x: this.data.width - 1,
			y: this.data.height - 1
		}, this.origin);

		return {
			x: left.x - 80,
			y: top.y - 150,
			width: right.x - left.x + 160,
			height: bottom.y - top.y + 230
		};
	}
}
