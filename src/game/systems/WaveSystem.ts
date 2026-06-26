import type { GameplayAnchor } from '../map/GameplayAnchor';
import type { GridPoint } from '../map/IsoMath';
import type { MapRuntime } from '../map/MapRuntime';
import type { EnemyDefinition } from '../combat/EnemyModel';

export interface SpawnLanePlan {
	readonly laneId: string;
	readonly spawnAnchorId?: string;
	readonly points: readonly GridPoint[];
}

export interface EnemySpawnPlanEntry {
	readonly id: string;
	readonly wave: number;
	readonly order: number;
	readonly delayMs: number;
	readonly laneId: string;
	readonly spawnGrid: GridPoint;
	readonly path: readonly GridPoint[];
	readonly enemy: EnemyDefinition;
}

export interface WaveSpawnPlan {
	readonly wave: number;
	readonly entries: readonly EnemySpawnPlanEntry[];
}

export interface WaveSystemOptions {
	readonly baseCount?: number;
	readonly countPerWave?: number;
	readonly spawnIntervalMs?: number;
	readonly baseHp?: number;
	readonly hpPerWave?: number;
	readonly baseSpeed?: number;
	readonly attackDamage?: number;
}

const DEFAULT_OPTIONS = {
	baseCount: 2,
	countPerWave: 1,
	spawnIntervalMs: 850,
	baseHp: 30,
	hpPerWave: 6,
	baseSpeed: 72,
	attackDamage: 6
} as const;

function cloneGrid(point: GridPoint): GridPoint {
	return { x: point.x, y: point.y };
}

function sameGridPoint(a: GridPoint, b: GridPoint): boolean {
	return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

function requirePositiveInteger(value: number, label: string): void {
	if (!Number.isInteger(value) || value <= 0) {
		throw new RangeError(`${label} must be a positive integer.`);
	}
}

function requirePositiveFinite(value: number, label: string): void {
	if (!Number.isFinite(value) || value <= 0) {
		throw new RangeError(`${label} must be a positive finite number.`);
	}
}

export class WaveSystem {
	private readonly options: Required<WaveSystemOptions>;
	private readonly lanes: readonly SpawnLanePlan[];

	constructor(
		private readonly runtime: MapRuntime,
		options: WaveSystemOptions = {}
	) {
		this.options = { ...DEFAULT_OPTIONS, ...options };
		this.validateOptions();
		const spawnAnchors = runtime.getAnchors('enemy-spawn');
		const lanes = runtime.getSpawnLanes('enemy');
		if (lanes.length === 0) {
			throw new Error(`Map ${runtime.recipe.id} has no enemy spawn lanes.`);
		}

		this.lanes = lanes.map((lane) => {
			if (lane.points.length === 0) {
				throw new Error(`Enemy spawn lane ${lane.id} has no points.`);
			}
			const spawnAnchor = this.findSpawnAnchor(lane.points[0], spawnAnchors);
			return {
				laneId: lane.id,
				spawnAnchorId: spawnAnchor?.id,
				points: lane.points.map(cloneGrid)
			};
		});
	}

	getSpawnLanes(): readonly SpawnLanePlan[] {
		return this.lanes.map((lane) => ({
			laneId: lane.laneId,
			spawnAnchorId: lane.spawnAnchorId,
			points: lane.points.map(cloneGrid)
		}));
	}

	createSpawnPlan(wave: number): WaveSpawnPlan {
		requirePositiveInteger(wave, 'Wave');
		const count = this.options.baseCount + (wave - 1) * this.options.countPerWave;
		const entries: EnemySpawnPlanEntry[] = [];

		for (let order = 0; order < count; order += 1) {
			const lane = this.lanes[(wave - 1 + order) % this.lanes.length];
			const maxHp = this.options.baseHp + (wave - 1) * this.options.hpPerWave;
			entries.push({
				id: `wave-${wave}-enemy-${order + 1}`,
				wave,
				order,
				delayMs: order * this.options.spawnIntervalMs,
				laneId: lane.laneId,
				spawnGrid: cloneGrid(lane.points[0]),
				path: lane.points.map(cloneGrid),
				enemy: {
					id: `wave-${wave}-enemy-${order + 1}`,
					kind: 'bear',
					stats: {
						maxHp,
						speed: this.options.baseSpeed,
						attackDamage: this.options.attackDamage,
						rewards: [
							{ resource: 'meat', amount: 1 },
							{ resource: 'money', amount: wave }
						]
					}
				}
			});
		}

		return { wave, entries };
	}

	private findSpawnAnchor(
		start: GridPoint,
		spawnAnchors: readonly GameplayAnchor[]
	): GameplayAnchor | undefined {
		return spawnAnchors.find((anchor) => sameGridPoint(anchor.grid, start));
	}

	private validateOptions(): void {
		requirePositiveInteger(this.options.baseCount, 'Wave baseCount');
		if (!Number.isInteger(this.options.countPerWave) || this.options.countPerWave < 0) {
			throw new RangeError('Wave countPerWave must be a non-negative integer.');
		}
		requirePositiveFinite(this.options.spawnIntervalMs, 'Wave spawnIntervalMs');
		requirePositiveFinite(this.options.baseHp, 'Wave baseHp');
		if (!Number.isFinite(this.options.hpPerWave) || this.options.hpPerWave < 0) {
			throw new RangeError('Wave hpPerWave must be a non-negative finite number.');
		}
		requirePositiveFinite(this.options.baseSpeed, 'Wave baseSpeed');
		requirePositiveFinite(this.options.attackDamage, 'Wave attackDamage');
	}
}
