import { normalizeResourceAmount } from '../resources/ResourceTypes';
import { gameState, type GameState } from '../state/GameState';

export interface PreparedFoodInventory {
	readonly preparedFood: number;
	consumePreparedFood(amount: number): number;
}

export interface FurnaceCookingOptions {
	readonly capacity?: number;
	readonly meatPerBatch?: number;
	readonly foodPerBatch?: number;
	readonly cookIntervalMs?: number;
	readonly enabled?: boolean;
}

export interface FurnaceCookingSnapshot {
	readonly preparedFood: number;
	readonly capacity: number;
	readonly meatPerBatch: number;
	readonly foodPerBatch: number;
	readonly cookIntervalMs: number;
	readonly enabled: boolean;
}

const DEFAULT_CAPACITY = 8;
const DEFAULT_MEAT_PER_BATCH = 1;
const DEFAULT_FOOD_PER_BATCH = 1;
const DEFAULT_COOK_INTERVAL_MS = 2_400;

export class FurnaceCookingSystem implements PreparedFoodInventory {
	readonly capacity: number;
	readonly meatPerBatch: number;
	readonly foodPerBatch: number;
	readonly cookIntervalMs: number;
	private food = 0;
	private elapsedMs = 0;
	private active: boolean;
	private destroyed = false;

	constructor(
		private readonly state: GameState = gameState,
		options: FurnaceCookingOptions = {}
	) {
		this.capacity = normalizeResourceAmount(options.capacity ?? DEFAULT_CAPACITY, 'Prepared food capacity');
		this.meatPerBatch = normalizeResourceAmount(options.meatPerBatch ?? DEFAULT_MEAT_PER_BATCH, 'Meat per batch');
		this.foodPerBatch = normalizeResourceAmount(options.foodPerBatch ?? DEFAULT_FOOD_PER_BATCH, 'Prepared food per batch');
		this.cookIntervalMs = options.cookIntervalMs ?? DEFAULT_COOK_INTERVAL_MS;
		if (this.capacity < 1) {
			throw new RangeError('Prepared food capacity must be at least 1.');
		}
		if (this.meatPerBatch < 1) {
			throw new RangeError('Meat per batch must be at least 1.');
		}
		if (this.foodPerBatch < 1) {
			throw new RangeError('Prepared food per batch must be at least 1.');
		}
		if (!Number.isFinite(this.cookIntervalMs) || this.cookIntervalMs <= 0) {
			throw new RangeError('Cook interval must be positive and finite.');
		}
		this.active = options.enabled ?? true;
	}

	get preparedFood(): number {
		return this.food;
	}

	get snapshot(): FurnaceCookingSnapshot {
		return {
			preparedFood: this.food,
			capacity: this.capacity,
			meatPerBatch: this.meatPerBatch,
			foodPerBatch: this.foodPerBatch,
			cookIntervalMs: this.cookIntervalMs,
			enabled: this.active && !this.destroyed
		};
	}

	setEnabled(enabled: boolean): void {
		this.active = enabled;
		if (!enabled) {
			this.elapsedMs = 0;
		}
	}

	update(deltaMs: number): number {
		if (!Number.isFinite(deltaMs) || deltaMs < 0) {
			throw new RangeError('Cooking delta must be a non-negative finite number.');
		}
		if (this.destroyed || !this.active || this.food >= this.capacity) {
			return 0;
		}

		this.elapsedMs += deltaMs;
		const ticks = Math.floor(this.elapsedMs / this.cookIntervalMs);
		if (ticks < 1) {
			return 0;
		}
		this.elapsedMs -= ticks * this.cookIntervalMs;

		let produced = 0;
		for (let tick = 0; tick < ticks; tick += 1) {
			const remainingCapacity = this.capacity - this.food;
			if (remainingCapacity <= 0) {
				this.elapsedMs = 0;
				break;
			}
			if (this.state.snapshot.resources.meat < this.meatPerBatch) {
				break;
			}
			const consumed = this.state.changeResource('meat', -this.meatPerBatch);
			if (consumed !== -this.meatPerBatch) {
				break;
			}
			const batchOutput = Math.min(this.foodPerBatch, remainingCapacity);
			this.food += batchOutput;
			produced += batchOutput;
		}
		return produced;
	}

	consumePreparedFood(amount: number): number {
		const requested = normalizeResourceAmount(amount, 'Prepared food consume amount');
		const consumed = Math.min(requested, this.food);
		this.food -= consumed;
		return consumed;
	}

	destroy(): void {
		this.destroyed = true;
		this.elapsedMs = 0;
		this.food = 0;
	}
}
