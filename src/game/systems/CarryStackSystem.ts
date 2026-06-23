import Phaser from 'phaser';

export type CarriedResourceType = 'wood' | 'meat' | 'money';
export type CarryCounts = Record<CarriedResourceType, number>;

export const DEFAULT_CARRY_LIMITS: Readonly<CarryCounts> = {
	wood: 12,
	meat: 12,
	money: 20
};

const RESOURCE_ORDER: readonly CarriedResourceType[] = ['wood', 'meat', 'money'];
const TEXTURE_KEYS: Partial<Record<CarriedResourceType, string>> = {
	wood: 'resource-wood-stack',
	meat: 'resource-meat'
};
const FALLBACK_COLORS: Record<CarriedResourceType, number> = {
	wood: 0xd88b46,
	meat: 0xd85a6a,
	money: 0x4fc66b
};

function emptyCounts(): CarryCounts {
	return { wood: 0, meat: 0, money: 0 };
}

export class CarryInventory {
	private readonly counts = emptyCounts();

	constructor(private readonly limits: Readonly<CarryCounts> = DEFAULT_CARRY_LIMITS) {}

	get snapshot(): Readonly<CarryCounts> {
		return { ...this.counts };
	}

	get total(): number {
		return RESOURCE_ORDER.reduce((sum, type) => sum + this.counts[type], 0);
	}

	add(type: CarriedResourceType, requestedAmount: number): number {
		const amount = Math.max(0, Math.floor(requestedAmount));
		const accepted = Math.min(amount, this.limits[type] - this.counts[type]);
		this.counts[type] += accepted;
		return accepted;
	}

	remove(type: CarriedResourceType, requestedAmount: number): number {
		const amount = Math.max(0, Math.floor(requestedAmount));
		const removed = Math.min(amount, this.counts[type]);
		this.counts[type] -= removed;
		return removed;
	}

	clear(): void {
		for (const type of RESOURCE_ORDER) {
			this.counts[type] = 0;
		}
	}
}

export class CarryStackSystem {
	readonly inventory: CarryInventory;
	readonly view: Phaser.GameObjects.Container;
	private signature = '';

	constructor(
		private readonly scene: Phaser.Scene,
		parent: Phaser.GameObjects.Container,
		limits: Readonly<CarryCounts> = DEFAULT_CARRY_LIMITS
	) {
		this.inventory = new CarryInventory(limits);
		this.view = scene.add.container(28, -77);
		parent.add(this.view);
	}

	add(type: CarriedResourceType, amount: number): number {
		const accepted = this.inventory.add(type, amount);
		this.refresh();
		return accepted;
	}

	remove(type: CarriedResourceType, amount: number): number {
		const removed = this.inventory.remove(type, amount);
		this.refresh();
		return removed;
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
		type: CarriedResourceType
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
