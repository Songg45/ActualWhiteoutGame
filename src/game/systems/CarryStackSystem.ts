import Phaser from 'phaser';
import type { ResourceType } from '../state/GameState';

export type CarryCounts = Record<ResourceType, number>;

export const DEFAULT_CARRY_LIMITS: Readonly<CarryCounts> = {
	wood: 12,
	meat: 12,
	money: 20
};

const RESOURCE_ORDER: readonly ResourceType[] = ['wood', 'meat', 'money'];
const TEXTURE_KEYS: Partial<Record<ResourceType, string>> = {
	wood: 'resource-wood-stack',
	meat: 'resource-meat'
};
const FALLBACK_COLORS: Record<ResourceType, number> = {
	wood: 0xd88b46,
	meat: 0xd85a6a,
	money: 0x4fc66b
};

function emptyCounts(): CarryCounts {
	return { wood: 0, meat: 0, money: 0 };
}

export class CarryInventory {
	private readonly counts = emptyCounts();
	private readonly limits: Readonly<CarryCounts>;

	constructor(
		limits: Readonly<CarryCounts> = DEFAULT_CARRY_LIMITS,
		private readonly onChange?: (counts: Readonly<CarryCounts>) => void
	) {
		for (const type of RESOURCE_ORDER) {
			if (!Number.isInteger(limits[type]) || limits[type] < 0) {
				throw new RangeError('Carry limits must be finite non-negative integers.');
			}
		}
		this.limits = { ...limits };
	}

	get snapshot(): Readonly<CarryCounts> {
		return { ...this.counts };
	}

	get total(): number {
		return RESOURCE_ORDER.reduce((sum, type) => sum + this.counts[type], 0);
	}

	add(type: ResourceType, requestedAmount: number): number {
		const amount = this.normalizeAmount(requestedAmount);
		const accepted = Math.min(amount, this.limits[type] - this.counts[type]);
		if (accepted > 0) {
			this.counts[type] += accepted;
			this.publishChange();
		}
		return accepted;
	}

	remove(type: ResourceType, requestedAmount: number): number {
		const amount = this.normalizeAmount(requestedAmount);
		const removed = Math.min(amount, this.counts[type]);
		if (removed > 0) {
			this.counts[type] -= removed;
			this.publishChange();
		}
		return removed;
	}

	clear(): void {
		if (this.total === 0) {
			return;
		}
		for (const type of RESOURCE_ORDER) {
			this.counts[type] = 0;
		}
		this.publishChange();
	}

	private normalizeAmount(requestedAmount: number): number {
		if (!Number.isFinite(requestedAmount)) {
			throw new RangeError('Carry amount must be finite.');
		}
		return Math.max(0, Math.floor(requestedAmount));
	}

	private publishChange(): void {
		this.onChange?.(this.snapshot);
	}
}

export class CarryStackSystem {
	readonly view: Phaser.GameObjects.Container;
	private readonly inventory: CarryInventory;
	private signature = '';

	constructor(
		private readonly scene: Phaser.Scene,
		parent: Phaser.GameObjects.Container,
		limits: Readonly<CarryCounts> = DEFAULT_CARRY_LIMITS
	) {
		this.view = scene.add.container(28, -77);
		parent.add(this.view);
		this.inventory = new CarryInventory(limits, () => this.refresh());
	}

	get snapshot(): Readonly<CarryCounts> {
		return this.inventory.snapshot;
	}

	get total(): number {
		return this.inventory.total;
	}

	add(type: ResourceType, amount: number): number {
		return this.inventory.add(type, amount);
	}

	remove(type: ResourceType, amount: number): number {
		return this.inventory.remove(type, amount);
	}

	clear(): void {
		this.inventory.clear();
	}

	refresh(): void {
		const counts = this.inventory.snapshot;
		const nextSignature = RESOURCE_ORDER.map((type) => `${type}:${counts[type]}`).join('|');
		if (nextSignature === this.signature) {
			return;
		}
		this.signature = nextSignature;
		this.view.removeAll(true);

		let visualIndex = 0;
		for (const type of RESOURCE_ORDER) {
			const visibleCount = Math.min(counts[type], 5);
			for (let index = 0; index < visibleCount; index += 1) {
				const item = this.createItem(type)
					.setPosition(0, -visualIndex * 8);
				this.view.add(item);
				visualIndex += 1;
			}
		}
	}

	private createItem(
		type: ResourceType
	): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
		const textureKey = TEXTURE_KEYS[type];
		if (textureKey && this.scene.textures.exists(textureKey)) {
			return this.scene.add.image(0, 0, textureKey)
				.setOrigin(0.5, 0.9)
				.setDisplaySize(type === 'wood' ? 29 : 22, type === 'wood' ? 38 : 22);
		}

		return this.scene.add.rectangle(0, 0, 25, 10, FALLBACK_COLORS[type])
			.setStrokeStyle(2, 0xffffff, 0.65);
	}
}
