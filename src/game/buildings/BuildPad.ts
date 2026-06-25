import Phaser from 'phaser';
import { worldDepthFromBaseY } from '../config';
import type { GameEventBus } from '../events/GameEvents';
import { gridToScreen, type GridPoint, type ScreenPoint } from '../map/IsoMath';
import { ResourceStore } from '../resources/ResourceStore';
import {
	RESOURCE_TYPES,
	emptyResourceBalances,
	normalizeResourceCost,
	type ResourceCost
} from '../resources/ResourceTypes';
import type { ResourceBalances, ResourceType } from '../state/GameState';
import type { SpendResult } from '../systems/EconomySystem';
import type { CarryPort } from '../objects/DropZone';
import type { BuildingDefinition, BuildPadState, CompletedBuilding } from './BuildingTypes';

export interface BuildPadSnapshot {
	padId: string;
	buildingId: string;
	state: BuildPadState;
	funded: Readonly<ResourceBalances>;
	remaining: Readonly<ResourceBalances>;
	cost: Readonly<ResourceBalances>;
	progress: number;
	constructingElapsedMs: number;
	constructionMs: number;
}

export interface BuildPadFundingResult {
	accepted: Readonly<ResourceBalances>;
	startedConstruction: boolean;
	completed: boolean;
}

export interface BuildPadDirectSpendResult extends BuildPadFundingResult {
	spend: SpendResult | null;
}

function zeroBalances(): ResourceBalances {
	return emptyResourceBalances();
}

function addAccepted(
	target: ResourceBalances,
	resource: ResourceType,
	amount: number
): void {
	if (amount > 0) {
		target[resource] += amount;
	}
}

export class BuildPadModel {
	private readonly fundedStore: ResourceStore;
	private locked: boolean;
	private constructingElapsedMs = 0;
	private destroyed = false;

	constructor(
		readonly definition: BuildingDefinition,
		locked = true
	) {
		this.fundedStore = new ResourceStore({}, normalizeResourceCost(definition.cost));
		this.locked = locked;
	}

	get snapshot(): BuildPadSnapshot {
		const cost = normalizeResourceCost(this.definition.cost);
		const funded = this.fundedStore.snapshot;
		const remaining = zeroBalances();
		let fundedTotal = 0;
		let costTotal = 0;
		for (const resource of RESOURCE_TYPES) {
			remaining[resource] = Math.max(0, cost[resource] - funded[resource]);
			fundedTotal += funded[resource];
			costTotal += cost[resource];
		}
		return {
			padId: this.definition.padId,
			buildingId: this.definition.id,
			state: this.state,
			funded,
			remaining,
			cost,
			progress: costTotal === 0 ? 1 : fundedTotal / costTotal,
			constructingElapsedMs: this.constructingElapsedMs,
			constructionMs: this.definition.constructionMs
		};
	}

	get state(): BuildPadState {
		if (this.destroyed) {
			return 'complete';
		}
		if (this.locked) {
			return 'locked';
		}
		if (this.constructingElapsedMs >= this.definition.constructionMs) {
			return 'complete';
		}
		if (this.constructingElapsedMs > 0 || this.isFullyFunded()) {
			return 'constructing';
		}
		return this.hasAnyFunding() ? 'partially-funded' : 'available';
	}

	setLocked(locked: boolean): boolean {
		if (this.state === 'complete' || this.state === 'constructing') {
			return false;
		}
		const changed = this.locked !== locked;
		this.locked = locked;
		return changed;
	}

	fundFromCarry(player: CarryPort, maxUnits = 3): BuildPadFundingResult {
		this.assertFundingAmount(maxUnits);
		const accepted = zeroBalances();
		if (!this.canAcceptFunding()) {
			return { accepted, startedConstruction: false, completed: false };
		}

		let remainingTick = maxUnits;
		for (const resource of RESOURCE_TYPES) {
			if (remainingTick <= 0) {
				break;
			}
			const room = this.fundedStore.availableCapacity(resource);
			const requested = Math.min(player.carrySnapshot[resource], room, remainingTick);
			if (requested <= 0) {
				continue;
			}
			const removed = player.removeCarry(resource, requested);
			const deposited = this.fundedStore.add(resource, removed);
			const rejected = removed - deposited;
			if (rejected > 0) {
				player.addCarry(resource, rejected);
			}
			addAccepted(accepted, resource, deposited);
			remainingTick -= deposited;
		}

		const startedConstruction = this.startConstructionIfFunded();
		return { accepted, startedConstruction, completed: this.state === 'complete' };
	}

	fundFromStorage(spend: (cost: ResourceCost) => SpendResult): BuildPadDirectSpendResult {
		const accepted = zeroBalances();
		if (!this.canAcceptFunding()) {
			return { accepted, startedConstruction: false, completed: false, spend: null };
		}
		const remaining = this.snapshot.remaining;
		const spendResult = spend(remaining);
		if (!spendResult.ok) {
			return {
				accepted,
				startedConstruction: false,
				completed: false,
				spend: spendResult
			};
		}
		for (const resource of RESOURCE_TYPES) {
			const deposited = this.fundedStore.add(resource, remaining[resource]);
			addAccepted(accepted, resource, deposited);
		}
		const startedConstruction = this.startConstructionIfFunded();
		return {
			accepted,
			startedConstruction,
			completed: this.state === 'complete',
			spend: spendResult
		};
	}

	update(deltaMs: number): CompletedBuilding | null {
		if (!Number.isFinite(deltaMs) || deltaMs < 0) {
			throw new RangeError('Build pad delta must be a non-negative finite number.');
		}
		if (this.destroyed || this.state !== 'constructing') {
			return null;
		}
		this.constructingElapsedMs = Math.min(
			this.definition.constructionMs,
			this.constructingElapsedMs + deltaMs
		);
		if (this.constructingElapsedMs < this.definition.constructionMs) {
			return null;
		}
		return {
			id: this.definition.id,
			padId: this.definition.padId,
			label: this.definition.label,
			grid: { x: 0, y: 0 },
			completedAtMs: this.constructingElapsedMs
		};
	}

	destroy(): void {
		this.destroyed = true;
		this.constructingElapsedMs = 0;
	}

	private canAcceptFunding(): boolean {
		return !this.destroyed && (this.state === 'available' || this.state === 'partially-funded');
	}

	private hasAnyFunding(): boolean {
		return RESOURCE_TYPES.some((resource) => this.fundedStore.get(resource) > 0);
	}

	private isFullyFunded(): boolean {
		return RESOURCE_TYPES.every((resource) => this.fundedStore.availableCapacity(resource) === 0);
	}

	private startConstructionIfFunded(): boolean {
		if (!this.locked && this.constructingElapsedMs === 0 && this.isFullyFunded()) {
			this.constructingElapsedMs = Number.EPSILON;
			return true;
		}
		return false;
	}

	private assertFundingAmount(amount: number): void {
		if (!Number.isSafeInteger(amount) || amount < 0) {
			throw new RangeError('Build pad funding amount must be a non-negative integer.');
		}
	}
}

export class BuildPad extends Phaser.GameObjects.Container {
	readonly model: BuildPadModel;
	private readonly padGraphics: Phaser.GameObjects.Graphics;
	private readonly labelText: Phaser.GameObjects.Text;
	private readonly costText: Phaser.GameObjects.Text;
	private readonly stateText: Phaser.GameObjects.Text;
	private readonly progressBar: Phaser.GameObjects.Rectangle;
	private readonly completeObjects: Phaser.GameObjects.GameObject[] = [];
	private completed = false;

	constructor(
		scene: Phaser.Scene,
		readonly definition: BuildingDefinition,
		readonly grid: GridPoint,
		origin: ScreenPoint,
		locked: boolean,
		private readonly events: GameEventBus
	) {
		const point = gridToScreen(grid, origin);
		super(scene, point.x, point.y);
		scene.add.existing(this);
		this.setDepth(worldDepthFromBaseY(point.y));
		this.model = new BuildPadModel(definition, locked);
		this.padGraphics = scene.add.graphics();
		this.labelText = scene.add.text(0, -58, definition.label, {
			color: '#17384c',
			backgroundColor: 'rgba(255,255,255,0.94)',
			fontFamily: 'Arial, sans-serif',
			fontSize: '13px',
			fontStyle: 'bold',
			padding: { x: 6, y: 3 }
		}).setOrigin(0.5);
		this.costText = scene.add.text(0, -37, '', {
			color: '#ffffff',
			backgroundColor: '#315565',
			fontFamily: 'Arial, sans-serif',
			fontSize: '12px',
			fontStyle: 'bold',
			padding: { x: 5, y: 2 }
		}).setOrigin(0.5);
		const barBack = scene.add.rectangle(0, -16, 86, 7, 0x17384c, 0.35)
			.setOrigin(0.5);
		this.progressBar = scene.add.rectangle(-43, -16, 0, 7, 0xffd166, 0.95)
			.setOrigin(0, 0.5);
		this.stateText = scene.add.text(0, 23, '', {
			color: '#17384c',
			backgroundColor: 'rgba(244,251,255,0.9)',
			fontFamily: 'Arial, sans-serif',
			fontSize: '12px',
			fontStyle: 'bold',
			padding: { x: 6, y: 3 }
		}).setOrigin(0.5, 0);
		this.add([this.padGraphics, this.labelText, this.costText, barBack, this.progressBar, this.stateText]);
		this.refresh();
	}

	fundFromCarry(player: CarryPort, maxUnits: number): BuildPadFundingResult {
		const result = this.model.fundFromCarry(player, maxUnits);
		this.emitFunding(result.accepted, 'carry');
		this.refresh();
		return result;
	}

	fundFromStorage(spend: (cost: ResourceCost) => SpendResult): BuildPadDirectSpendResult {
		const result = this.model.fundFromStorage(spend);
		this.emitFunding(result.accepted, 'storage');
		this.refresh();
		return result;
	}

	setLocked(locked: boolean): boolean {
		const changed = this.model.setLocked(locked);
		if (changed) {
			this.refresh();
		}
		return changed;
	}

	update(deltaMs: number): CompletedBuilding | null {
		const completed = this.model.update(deltaMs);
		if (!completed) {
			this.refresh();
			return null;
		}
		const withGrid = { ...completed, grid: { ...this.grid } };
		if (!this.completed) {
			this.completed = true;
			this.createCompletedVisual();
		}
		this.refresh();
		return withGrid;
	}

	override destroy(fromScene?: boolean): void {
		this.model.destroy();
		super.destroy(fromScene);
	}

	private emitFunding(accepted: Readonly<ResourceBalances>, source: string): void {
		for (const resource of RESOURCE_TYPES) {
			if (accepted[resource] > 0) {
				this.events.emit('economy:transfer', {
					source,
					destination: this.definition.padId,
					resource,
					amount: accepted[resource]
				});
			}
		}
	}

	private refresh(): void {
		const snapshot = this.model.snapshot;
		this.progressBar.setSize(86 * snapshot.progress, 7);
		this.costText.setText(this.formatCost(snapshot));
		this.stateText.setText(this.formatState(snapshot));
		this.drawPad(snapshot.state);
		const hiddenByCompletion = snapshot.state === 'complete';
		this.costText.setVisible(!hiddenByCompletion);
		this.progressBar.setVisible(!hiddenByCompletion);
	}

	private formatCost(snapshot: BuildPadSnapshot): string {
		return RESOURCE_TYPES
			.filter((resource) => snapshot.cost[resource] > 0)
			.map((resource) => {
				const prefix = resource === 'money' ? '$' : resource[0].toUpperCase();
				return `${prefix} ${snapshot.funded[resource]}/${snapshot.cost[resource]}`;
			})
			.join('  ');
	}

	private formatState(snapshot: BuildPadSnapshot): string {
		if (snapshot.state === 'locked') {
			return 'Locked';
		}
		if (snapshot.state === 'constructing') {
			const remaining = Math.ceil(
				(snapshot.constructionMs - snapshot.constructingElapsedMs) / 1000
			);
			return `Building ${Math.max(1, remaining)}s`;
		}
		if (snapshot.state === 'complete') {
			return 'Done';
		}
		return snapshot.state === 'partially-funded' ? 'Add supplies' : 'Ready';
	}

	private drawPad(state: BuildPadState): void {
		const alpha = state === 'locked' ? 0.36 : 0.78;
		const color = state === 'complete'
			? 0x2f9e62
			: state === 'constructing'
				? 0xe8b44f
				: this.definition.placeholderColor;
		this.padGraphics.clear()
			.fillStyle(0x17384c, 0.18)
			.fillEllipse(0, 4, 106, 42)
			.fillStyle(color, alpha)
			.fillEllipse(0, 0, 96, 40)
			.lineStyle(4, state === 'locked' ? 0x8aa3ad : 0xf5fbff, 0.95)
			.strokeEllipse(0, 0, 96, 40);
		if (state === 'complete') {
			this.padGraphics
				.lineStyle(5, 0xffffff, 0.95)
				.beginPath()
				.moveTo(-19, -3)
				.lineTo(-6, 11)
				.lineTo(24, -16)
				.strokePath();
		}
	}

	private createCompletedVisual(): void {
		if (this.definition.completedAssetKey && this.scene.textures.exists(this.definition.completedAssetKey)) {
			const image = this.scene.add.image(0, -20, this.definition.completedAssetKey)
				.setOrigin(0.5, 0.88)
				.setDisplaySize(112, 112);
			this.completeObjects.push(image);
			this.add(image);
			return;
		}
		const structure = this.scene.add.graphics()
			.fillStyle(this.definition.placeholderColor, 1)
			.fillRoundedRect(-27, -62, 54, 56, 6)
			.lineStyle(4, 0xffffff, 0.82)
			.strokeRoundedRect(-27, -62, 54, 56, 6);
		this.completeObjects.push(structure);
		this.add(structure);
	}
}
