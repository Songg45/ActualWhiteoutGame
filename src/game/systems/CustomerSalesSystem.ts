import type { GridPoint } from '../map/IsoMath';
import { normalizeResourceAmount } from '../resources/ResourceTypes';
import type { GameState } from '../state/GameState';
import type { PreparedFoodInventory } from './FurnaceCookingSystem';
import { QueueSystem, type QueueCustomer } from './QueueSystem';

export interface CustomerSalesOptions {
	readonly capacity?: number;
	readonly foodPerSale?: number;
	readonly moneyPerSale?: number;
}

export type CustomerSaleStatus = 'served' | 'empty-queue' | 'insufficient-food';

export interface CustomerSaleResult {
	readonly status: CustomerSaleStatus;
	readonly customer?: QueueCustomer;
	readonly consumedPreparedFood: number;
	readonly paidMoney: number;
}

export class CustomerSalesSystem {
	readonly queue: QueueSystem;
	readonly foodPerSale: number;
	readonly moneyPerSale: number;

	constructor(
		private readonly state: GameState,
		private readonly preparedFood: PreparedFoodInventory,
		slotGrids: readonly GridPoint[],
		options: CustomerSalesOptions = {}
	) {
		const capacity = options.capacity ?? slotGrids.length;
		this.foodPerSale = normalizeResourceAmount(options.foodPerSale ?? 1, 'Food per sale');
		this.moneyPerSale = normalizeResourceAmount(options.moneyPerSale ?? 6, 'Money per sale');
		if (this.foodPerSale < 1) {
			throw new RangeError('Food per sale must be at least 1.');
		}
		if (this.moneyPerSale < 1) {
			throw new RangeError('Money per sale must be at least 1.');
		}
		this.queue = new QueueSystem(slotGrids, capacity);
	}

	enqueueCustomer(
		id: string,
		spawnGrid: GridPoint,
		serviceGrid: GridPoint,
		queuedAtMs: number
	): QueueCustomer | undefined {
		return this.queue.enqueue(id, spawnGrid, serviceGrid, queuedAtMs);
	}

	tryServeNext(): CustomerSaleResult {
		const next = this.queue.peek();
		if (!next) {
			return {
				status: 'empty-queue',
				consumedPreparedFood: 0,
				paidMoney: 0
			};
		}
		if (this.preparedFood.preparedFood < this.foodPerSale) {
			return {
				status: 'insufficient-food',
				customer: next,
				consumedPreparedFood: 0,
				paidMoney: 0
			};
		}

		const consumedPreparedFood = this.preparedFood.consumePreparedFood(this.foodPerSale);
		if (consumedPreparedFood !== this.foodPerSale) {
			return {
				status: 'insufficient-food',
				customer: next,
				consumedPreparedFood: 0,
				paidMoney: 0
			};
		}

		const paidMoney = this.state.changeResource('money', this.moneyPerSale);
		if (paidMoney !== this.moneyPerSale) {
			return {
				status: 'insufficient-food',
				customer: next,
				consumedPreparedFood: 0,
				paidMoney: 0
			};
		}

		return {
			status: 'served',
			customer: this.queue.serveNext(),
			consumedPreparedFood: this.foodPerSale,
			paidMoney
		};
	}
}
