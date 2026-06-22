import { gameEvents, type GameEventBus } from '../events/GameEvents';

export interface ResourceBalances {
	wood: number;
	meat: number;
	money: number;
}

export type ResourceType = keyof ResourceBalances;

export interface GameStateSnapshot {
	resources: Readonly<ResourceBalances>;
	unlockedBuildings: readonly string[];
	wave: number;
}

const INITIAL_RESOURCES: ResourceBalances = {
	wood: 0,
	meat: 0,
	money: 0
};

export class GameState {
	private resources: ResourceBalances = { ...INITIAL_RESOURCES };
	private readonly unlockedBuildings = new Set<string>();
	private currentWave = 0;

	constructor(private readonly events: GameEventBus = gameEvents) {}

	get snapshot(): GameStateSnapshot {
		return {
			resources: { ...this.resources },
			unlockedBuildings: [...this.unlockedBuildings],
			wave: this.currentWave
		};
	}

	changeResource(resource: ResourceType, delta: number): number {
		if (!Number.isFinite(delta)) {
			throw new TypeError('Resource delta must be a finite number.');
		}

		const previousValue = this.resources[resource];
		const nextValue = Math.max(0, previousValue + delta);
		const appliedDelta = nextValue - previousValue;

		if (appliedDelta === 0) {
			return 0;
		}

		this.resources = {
			...this.resources,
			[resource]: nextValue
		};
		this.events.emit('resource:changed', {
			resource,
			value: nextValue,
			delta: appliedDelta
		});
		this.publishSnapshot();
		return appliedDelta;
	}

	spendResource(resource: ResourceType, amount: number): boolean {
		if (!Number.isFinite(amount) || amount < 0) {
			throw new RangeError('Resource spend amount must be a non-negative finite number.');
		}

		if (this.resources[resource] < amount) {
			return false;
		}

		this.changeResource(resource, -amount);
		return true;
	}

	unlockBuilding(buildingId: string): boolean {
		const normalizedId = buildingId.trim();

		if (!normalizedId) {
			throw new Error('Building id cannot be empty.');
		}

		if (this.unlockedBuildings.has(normalizedId)) {
			return false;
		}

		this.unlockedBuildings.add(normalizedId);
		this.events.emit('building:unlocked', { buildingId: normalizedId });
		this.publishSnapshot();
		return true;
	}

	setWave(wave: number): void {
		if (!Number.isInteger(wave) || wave < 0) {
			throw new RangeError('Wave must be a non-negative integer.');
		}

		if (wave === this.currentWave) {
			return;
		}

		this.currentWave = wave;
		this.events.emit('wave:changed', { wave });
		this.publishSnapshot();
	}

	reset(): void {
		const previousResources = this.resources;
		const previousWave = this.currentWave;

		this.resources = { ...INITIAL_RESOURCES };
		this.unlockedBuildings.clear();
		this.currentWave = 0;

		for (const resource of Object.keys(INITIAL_RESOURCES) as ResourceType[]) {
			const previousValue = previousResources[resource];

			if (previousValue !== 0) {
				this.events.emit('resource:changed', {
					resource,
					value: 0,
					delta: -previousValue
				});
			}
		}

		if (previousWave !== 0) {
			this.events.emit('wave:changed', { wave: 0 });
		}

		this.publishSnapshot();
	}

	private publishSnapshot(): void {
		this.events.emit('state:changed', this.snapshot);
	}
}

export const gameState = new GameState();
