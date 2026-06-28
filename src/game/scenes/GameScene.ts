import Phaser from 'phaser';
import { DEPTH_LAYERS, GAME_COLORS, SCENE_KEYS, WORLD_BOUNDS } from '../config';
import { Enemy } from '../entities/Enemy';
import { NPC } from '../entities/NPC';
import { Player } from '../entities/Player';
import { MapBuilder, type BuiltMap } from '../map/MapBuilder';
import { gridToScreen, type GridPoint } from '../map/IsoMath';
import { MapRuntime } from '../map/MapRuntime';
import { camp01Recipe } from '../map/recipes/camp01';
import { gameState } from '../state/GameState';
import type { DamageSource } from '../combat/CombatTypes';
import {
	applyCombatDamage,
	findNearestTarget,
	type DamageResult
} from '../systems/CombatSystem';
import { CustomerSalesSystem } from '../systems/CustomerSalesSystem';
import { DefenseSystem } from '../systems/DefenseSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { FurnaceCookingSystem } from '../systems/FurnaceCookingSystem';
import {
	advanceEnemyPath,
	createEnemyPathState,
	pruneInactiveEnemies,
	type EnemyPathState
} from '../systems/EnemyMovementSystem';
import { grantDeathRewards, type AppliedDeathReward } from '../systems/EnemyRewardSystem';
import { mobileAttackButtonLayout } from '../systems/MobileAttackButton';
import { MovementInputController } from '../systems/MovementInputController';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { WaveSystem, type WaveSpawnPlan } from '../systems/WaveSystem';

interface ActiveEnemy {
	readonly enemy: Enemy;
	readonly path: readonly GridPoint[];
	pathState: EnemyPathState;
	reachedObjective: boolean;
	isDead(): boolean;
}

const PLAYER_ATTACK_DAMAGE = 18;
const PLAYER_ATTACK_RANGE = 260;
const PLAYER_ATTACK_COOLDOWN_MS = 450;
const CUSTOMER_SPAWN_INTERVAL_MS = 5_500;
const CUSTOMER_SERVICE_INTERVAL_MS = 1_250;
const CUSTOMER_QUEUE_CAPACITY = 4;

export class GameScene extends Phaser.Scene {
	private backdrop?: Phaser.GameObjects.Graphics;
	private builtMap?: BuiltMap;
	private player?: Player;
	private interactionPrompt?: Phaser.GameObjects.Text;
	private movementInput?: MovementInputController;
	private economy?: EconomySystem;
	private progression?: ProgressionSystem;
	private defenseSystem?: DefenseSystem;
	private furnaceCooking?: FurnaceCookingSystem;
	private furnaceStatusLabel?: Phaser.GameObjects.Text;
	private customerSales?: CustomerSalesSystem;
	private waveSystem?: WaveSystem;
	private activeWave?: WaveSpawnPlan;
	private activeWaveStartedAt = 0;
	private nextSpawnIndex = 0;
	private activeEnemies: ActiveEnemy[] = [];
	private firstWaveTimer?: Phaser.Time.TimerEvent;
	private devWaveKey?: Phaser.Input.Keyboard.Key;
	private attackKey?: Phaser.Input.Keyboard.Key;
	private attackButtonGraphic?: Phaser.GameObjects.Graphics;
	private attackButtonLabel?: Phaser.GameObjects.Text;
	private attackButtonHitArea?: Phaser.GameObjects.Zone;
	private lastPlayerAttackAt = Number.NEGATIVE_INFINITY;
	private customerSpawnGrid?: GridPoint;
	private customerServiceGrid?: GridPoint;
	private customerExitGrid?: GridPoint;
	private nextCustomerId = 1;
	private nextCustomerSpawnAt = 0;
	private nextCustomerServiceAt = 0;
	private readonly customerNpcs = new Map<string, NPC>();

	constructor() {
		super(SCENE_KEYS.game);
	}

	create(): void {
		this.cameras.main.setBounds(
			WORLD_BOUNDS.x,
			WORLD_BOUNDS.y,
			WORLD_BOUNDS.width,
			WORLD_BOUNDS.height
		);
		this.cameras.main.setBackgroundColor(GAME_COLORS.snowShadow);
		gameState.reset();
		this.createWorld();
		this.movementInput = new MovementInputController(this);
		this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutWorld, this);
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutWorld, this);
			this.movementInput?.destroy();
			this.defenseSystem?.destroy();
			this.furnaceCooking?.destroy();
			this.furnaceStatusLabel?.destroy();
			this.customerSales?.queue.clear();
			this.progression?.destroy();
			this.economy?.destroy();
			this.firstWaveTimer?.remove(false);
			this.devWaveKey?.destroy();
			this.attackKey?.destroy();
			this.attackButtonGraphic?.destroy();
			this.attackButtonLabel?.destroy();
			this.attackButtonHitArea?.destroy();
			for (const active of this.activeEnemies) {
				active.enemy.destroy();
			}
			this.activeEnemies = [];
			for (const npc of this.customerNpcs.values()) {
				npc.destroy();
			}
			this.customerNpcs.clear();
			this.player?.destroy();
			this.builtMap?.destroy();
			this.backdrop?.destroy();
		});
	}

	update(time: number, delta: number): void {
		this.player?.setMovementDirection(this.movementInput?.direction ?? { x: 0, y: 0 });
		this.player?.update(time, delta);
		this.economy?.update(delta);
		this.progression?.update(delta);
		this.updateFurnaceCooking(delta);
		this.updateCustomers(time, delta);
		this.updateEnemyWaves(time, delta);
		this.defenseSystem?.update(time);
		this.layoutInteractionPrompt();
	}

	private createWorld(): void {
		this.backdrop = this.add.graphics().setDepth(DEPTH_LAYERS.ground);
		this.backdrop
			.fillStyle(GAME_COLORS.snowShadow)
			.fillRect(WORLD_BOUNDS.x, WORLD_BOUNDS.y, WORLD_BOUNDS.width, WORLD_BOUNDS.height)
			.fillStyle(0xffffff, 0.2)
			.fillEllipse(WORLD_BOUNDS.width / 2, 530, 1680, 900);

		const mapRuntime = new MapRuntime(camp01Recipe);
		this.builtMap = new MapBuilder(
			this,
			mapRuntime.data,
			{ x: WORLD_BOUNDS.width / 2, y: 130 },
			mapRuntime
		).build();
		this.player = new Player(this, this.builtMap, {
			spawnGrid: { x: 7, y: 8 },
			onInteractionChange: (interactable) => {
				if (!this.interactionPrompt) {
					return;
				}
				const prompt = interactable ? this.getInteractionPrompt(interactable.id) : '';
				this.interactionPrompt
					.setText(prompt)
					.setVisible(prompt.length > 0);
			}
		});
		this.economy = new EconomySystem(
			this,
			this.player,
			this.builtMap,
			{
				atPlayer: (text, color) => {
					if (this.player) {
						this.createFloatingText(this.player.x, this.player.y - 110, text, color);
					}
				},
				atWorld: (x, y, text, color) => this.createFloatingText(x, y, text, color)
			}
		);
		this.progression = new ProgressionSystem(
			this,
			this.player,
			this.builtMap,
			this.economy,
			{
				atPlayer: (text, color) => {
					if (this.player) {
						this.createFloatingText(this.player.x, this.player.y - 110, text, color);
					}
				},
				atWorld: (x, y, text, color) => this.createFloatingText(x, y, text, color)
			}
		);
		this.waveSystem = new WaveSystem(mapRuntime);
		this.defenseSystem = new DefenseSystem(
			this,
			this.progression,
			this.builtMap.origin,
			{
				getCombatTargets: () => this.getCombatTargets(),
				applyDamageToEnemy: (enemyId, amount) => this.applyDamageToEnemy(enemyId, amount, 'defense')
			}
		);
		this.createFurnaceCooking(mapRuntime);
		this.createCustomerSales(mapRuntime);
		this.firstWaveTimer = this.time.delayedCall(30_000, () => this.startNextWave(this.time.now));
		this.devWaveKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.B);
		this.devWaveKey?.on(Phaser.Input.Keyboard.Events.DOWN, () => {
			if (!this.activeWave) {
				this.startNextWave(this.time.now);
			}
		});
		this.attackKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
		this.attackKey?.on(Phaser.Input.Keyboard.Events.DOWN, () => {
			this.tryPlayerAttack(this.time.now);
		});
		this.createMobileAttackButton();
		this.interactionPrompt = this.add.text(0, 0, '', {
			color: '#17384c',
			backgroundColor: 'rgba(255,255,255,0.9)',
			fontFamily: 'Arial, sans-serif',
			fontSize: '14px',
			fontStyle: 'bold',
			padding: { x: 8, y: 4 }
		})
			.setOrigin(0.5, 1)
			.setDepth(DEPTH_LAYERS.ui)
			.setVisible(false);
		this.layoutWorld();
	}

	private layoutWorld(): void {
		if (!this.builtMap) {
			return;
		}

		const width = this.scale.width;
		const height = this.scale.height;
		const portrait = height > width;
		const targetWidth = portrait ? 580 : this.builtMap.bounds.width;
		const targetHeight = portrait ? 870 : this.builtMap.bounds.height;
		const zoom = Phaser.Math.Clamp(
			Math.min(width / targetWidth, height / targetHeight) * 0.96,
			0.28,
			1
		);
		this.cameras.main.setZoom(zoom);
		this.layoutMobileAttackButton();
		if (this.player) {
			this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
		} else {
			this.cameras.main.centerOn(
				this.builtMap.bounds.x + this.builtMap.bounds.width / 2,
				this.builtMap.bounds.y + this.builtMap.bounds.height / 2
			);
		}
	}

	private layoutInteractionPrompt(): void {
		if (!this.player || !this.interactionPrompt?.visible) {
			return;
		}
		this.interactionPrompt.setPosition(this.player.x, this.player.y - 105);
	}

	private getInteractionPrompt(id: string): string {
		if (id === 'camp-storage') {
			return 'Auto-storing carried supplies';
		}
		if (id === 'reward-exchange') {
			return 'Auto-exchanging: wood $2, meat $3';
		}
		if (id === 'wood-station' || id === 'meat-station') {
			return 'Auto-collecting while nearby';
		}
		if (id.endsWith('-pad')) {
			return '';
		}
		return `Near ${id}`;
	}

	private createMobileAttackButton(): void {
		this.attackButtonGraphic = this.add.graphics()
			.setScrollFactor(0)
			.setDepth(DEPTH_LAYERS.ui + 10);
		this.attackButtonLabel = this.add.text(0, 0, 'ATK', {
			color: '#17384c',
			fontFamily: 'Arial, sans-serif',
			fontSize: '13px',
			fontStyle: 'bold'
		})
			.setOrigin(0.5)
			.setScrollFactor(0)
			.setDepth(DEPTH_LAYERS.ui + 11);
		this.attackButtonHitArea = this.add.zone(0, 0, 76, 76)
			.setScrollFactor(0)
			.setDepth(DEPTH_LAYERS.ui + 12)
			.setInteractive({ useHandCursor: true });
		this.attackButtonHitArea.on(Phaser.Input.Events.POINTER_DOWN, (
			pointer: Phaser.Input.Pointer,
			_localX: number,
			_localY: number,
			event: Phaser.Types.Input.EventData
		) => {
			pointer.event?.preventDefault();
			event.stopPropagation();
			this.tryPlayerAttack(this.time.now);
		});
		this.layoutMobileAttackButton();
	}

	private createCustomerSales(mapRuntime: MapRuntime): void {
		if (!this.furnaceCooking) {
			throw new Error('Customer sales require a prepared-food inventory.');
		}
		const spawn = mapRuntime.requireAnchor('npc-spawn').grid;
		const service = mapRuntime.getAnchor('exchange')?.grid
			?? mapRuntime.requireAnchor('food').grid;
		const slotGrids = Array.from({ length: CUSTOMER_QUEUE_CAPACITY }, (_, index) => ({
			x: service.x - 0.85 - index * 0.68,
			y: service.y + 0.6 + index * 0.38
		}));
		this.customerSpawnGrid = spawn;
		this.customerServiceGrid = service;
		this.customerExitGrid = {
			x: spawn.x + 0.6,
			y: spawn.y + 1.2
		};
		this.customerSales = new CustomerSalesSystem(gameState, this.furnaceCooking, slotGrids, {
			capacity: CUSTOMER_QUEUE_CAPACITY,
			foodPerSale: 1,
			moneyPerSale: 6
		});
		this.nextCustomerSpawnAt = this.time.now + 900;
		this.nextCustomerServiceAt = this.time.now + 1_800;
	}

	private createFurnaceCooking(mapRuntime: MapRuntime): void {
		this.furnaceCooking = new FurnaceCookingSystem(gameState, {
			capacity: 8,
			meatPerBatch: 1,
			foodPerBatch: 1,
			cookIntervalMs: 2_400,
			enabled: false
		});
		if (!this.builtMap) {
			return;
		}
		const furnace = gridToScreen(mapRuntime.requireAnchor('furnace').grid, this.builtMap.origin);
		this.furnaceStatusLabel = this.add.text(furnace.x, furnace.y - 92, 'Cooked 0/8', {
			color: '#17384c',
			backgroundColor: 'rgba(255,255,255,0.9)',
			fontFamily: 'Arial, sans-serif',
			fontSize: '13px',
			fontStyle: 'bold',
			padding: { x: 7, y: 4 }
		})
			.setOrigin(0.5)
			.setDepth(DEPTH_LAYERS.ui - 1);
	}

	private updateFurnaceCooking(deltaMs: number): void {
		if (!this.furnaceCooking) {
			return;
		}
		const furnaceBuilt = (this.progression?.getCompletedBuildings('furnace').length ?? 0) > 0;
		this.furnaceCooking.setEnabled(furnaceBuilt);
		const produced = this.furnaceCooking.update(deltaMs);
		const snapshot = this.furnaceCooking.snapshot;
		this.furnaceStatusLabel
			?.setText(furnaceBuilt
				? `Cooked ${snapshot.preparedFood}/${snapshot.capacity}`
				: 'Build furnace')
			.setVisible(true);
		if (produced > 0 && this.furnaceStatusLabel) {
			this.createFloatingText(
				this.furnaceStatusLabel.x,
				this.furnaceStatusLabel.y - 16,
				`Cooked +${produced}`,
				'#23814d'
			);
		}
	}

	private updateCustomers(time: number, delta: number): void {
		for (const npc of this.customerNpcs.values()) {
			npc.update(time, delta);
			if (npc.npcState === 'leaving' && this.customerExitGrid && this.builtMap) {
				const exit = gridToScreen(this.customerExitGrid, this.builtMap.origin);
				if (Phaser.Math.Distance.Between(npc.x, npc.y, exit.x, exit.y) < 4) {
					this.customerNpcs.delete(npc.id);
					npc.destroy();
				}
			}
		}
		this.spawnCustomerIfDue(time);
		this.serveCustomerIfDue(time);
	}

	private spawnCustomerIfDue(time: number): void {
		if (
			!this.customerSales
			|| !this.customerSpawnGrid
			|| !this.customerServiceGrid
			|| !this.builtMap
			|| time < this.nextCustomerSpawnAt
			|| this.customerSales.queue.isFull
		) {
			return;
		}
		const id = `customer-${this.nextCustomerId}`;
		const queued = this.customerSales.enqueueCustomer(
			id,
			this.customerSpawnGrid,
			this.customerServiceGrid,
			time
		);
		this.nextCustomerSpawnAt = time + CUSTOMER_SPAWN_INTERVAL_MS;
		if (!queued) {
			return;
		}
		this.nextCustomerId += 1;
		const spawn = gridToScreen(queued.spawnGrid, this.builtMap.origin);
		const slot = gridToScreen(queued.slotGrid, this.builtMap.origin);
		const npc = new NPC(this, {
			id: queued.id,
			spawn,
			speed: 78
		});
		npc.setTarget(slot, 'walking');
		this.customerNpcs.set(queued.id, npc);
	}

	private serveCustomerIfDue(time: number): void {
		if (!this.customerSales || !this.builtMap || time < this.nextCustomerServiceAt) {
			return;
		}
		this.nextCustomerServiceAt = time + CUSTOMER_SERVICE_INTERVAL_MS;
		const head = this.customerSales.queue.peek();
		if (!head) {
			return;
		}
		const headNpc = this.customerNpcs.get(head.id);
		if (headNpc?.npcState !== 'waiting') {
			return;
		}
		const result = this.customerSales.tryServeNext();
		if (result.status === 'insufficient-food') {
			this.createFloatingText(headNpc.x, headNpc.y - 92, 'Needs cooked food', '#8f2d2d');
			return;
		}
		if (result.status !== 'served' || !result.customer) {
			return;
		}
		const servedNpc = this.customerNpcs.get(result.customer.id);
		if (servedNpc) {
			this.createFloatingText(
				servedNpc.x,
				servedNpc.y - 96,
				`Served +$${result.paidMoney}`,
				'#23814d'
			);
			const exit = gridToScreen(this.customerExitGrid ?? result.customer.spawnGrid, this.builtMap.origin);
			servedNpc.setNpcState('served');
			servedNpc.setTarget(exit, 'leaving');
		}
		this.syncCustomerQueueTargets();
	}

	private syncCustomerQueueTargets(): void {
		if (!this.customerSales || !this.builtMap) {
			return;
		}
		for (const customer of this.customerSales.queue.snapshot.customers) {
			const npc = this.customerNpcs.get(customer.id);
			if (!npc || npc.npcState === 'leaving') {
				continue;
			}
			npc.setTarget(gridToScreen(customer.slotGrid, this.builtMap.origin), 'walking');
		}
	}

	private layoutMobileAttackButton(): void {
		if (!this.attackButtonGraphic || !this.attackButtonLabel || !this.attackButtonHitArea) {
			return;
		}
		const layout = mobileAttackButtonLayout({
			width: this.scale.width,
			height: this.scale.height
		});
		this.attackButtonGraphic
			.clear()
			.fillStyle(GAME_COLORS.warmth, 0.9)
			.fillCircle(layout.x, layout.y, layout.radius)
			.lineStyle(3, 0x17384c, 0.35)
			.strokeCircle(layout.x, layout.y, layout.radius)
			.lineStyle(5, 0xffffff, 0.76)
			.lineBetween(layout.x - 11, layout.y + 12, layout.x + 13, layout.y - 15)
			.lineStyle(4, 0x17384c, 0.55)
			.lineBetween(layout.x - 15, layout.y - 1, layout.x - 1, layout.y + 13);
		this.attackButtonLabel.setPosition(layout.x, layout.y + 18);
		this.attackButtonHitArea
			.setPosition(layout.x, layout.y)
			.setSize(layout.radius * 2 + 8, layout.radius * 2 + 8);
	}

	getCombatTargets(): readonly Enemy[] {
		return this.activeEnemies
			.filter((active) => !active.reachedObjective && !active.enemy.isDead())
			.map((active) => active.enemy);
	}

	applyDamageToEnemy(
		enemyId: string,
		amount: number,
		source: DamageSource = 'defense'
	): DamageResult | undefined {
		const active = this.activeEnemies.find((candidate) => candidate.enemy.id === enemyId);
		if (!active || active.reachedObjective) {
			return undefined;
		}
		const result = applyCombatDamage(active.enemy, amount, source);
		if (result.killed) {
			this.grantEnemyRewards(active.enemy);
		}
		return result;
	}

	private startNextWave(time: number): void {
		if (!this.waveSystem) {
			return;
		}
		const wave = gameState.snapshot.wave + 1;
		this.activeWave = this.waveSystem.createSpawnPlan(wave);
		this.activeWaveStartedAt = time;
		this.nextSpawnIndex = 0;
		gameState.setWave(wave);
	}

	private updateEnemyWaves(time: number, delta: number): void {
		this.spawnDueEnemies(time);
		this.moveActiveEnemies(delta);
		this.cleanupInactiveEnemies();
	}

	private spawnDueEnemies(time: number): void {
		if (!this.activeWave || !this.builtMap) {
			return;
		}
		while (
			this.nextSpawnIndex < this.activeWave.entries.length
			&& time - this.activeWaveStartedAt >= this.activeWave.entries[this.nextSpawnIndex].delayMs
		) {
			const entry = this.activeWave.entries[this.nextSpawnIndex];
			const enemy = new Enemy(this, {
				definition: entry.enemy,
				spawnGrid: entry.spawnGrid,
				origin: this.builtMap.origin,
				textureKey: 'enemy-bear-gray'
			});
			const active: ActiveEnemy = {
				enemy,
				path: entry.path,
				pathState: createEnemyPathState(entry.path, this.builtMap.origin),
				reachedObjective: false,
				isDead: () => enemy.isDead()
			};
			this.activeEnemies.push(active);
			this.nextSpawnIndex += 1;
		}
		if (this.nextSpawnIndex >= this.activeWave.entries.length) {
			this.activeWave = undefined;
		}
	}

	private moveActiveEnemies(delta: number): void {
		if (!this.builtMap) {
			return;
		}
		for (const active of this.activeEnemies) {
			if (active.enemy.isDead() || active.reachedObjective) {
				continue;
			}
			active.pathState = advanceEnemyPath(
				active.pathState,
				active.path,
				this.builtMap.origin,
				active.enemy.model.speed,
				delta
			);
			active.enemy.setBasePosition(active.pathState.position);
			if (active.pathState.complete) {
				active.reachedObjective = true;
			}
		}
	}

	private cleanupInactiveEnemies(): void {
		const remaining = pruneInactiveEnemies(this.activeEnemies);
		if (remaining.length === this.activeEnemies.length) {
			return;
		}
		const remainingSet = new Set(remaining);
		for (const active of this.activeEnemies) {
			if (!remainingSet.has(active)) {
				active.enemy.destroy();
			}
		}
		this.activeEnemies = remaining;
	}

	private tryPlayerAttack(time: number): void {
		if (!this.player || time - this.lastPlayerAttackAt < PLAYER_ATTACK_COOLDOWN_MS) {
			return;
		}
		const target = findNearestTarget(this.getCombatTargets(), this.player, PLAYER_ATTACK_RANGE);
		if (!target) {
			return;
		}
		this.lastPlayerAttackAt = time;
		const result = this.applyDamageToEnemy(target.id, PLAYER_ATTACK_DAMAGE, 'player');
		if (result && result.applied > 0) {
			this.createFloatingText(target.x, target.y - 82, `-${result.applied}`, '#8f2d2d');
		}
	}

	private grantEnemyRewards(enemy: Enemy): void {
		for (const reward of grantDeathRewards(gameState, enemy.model.rewards)) {
			this.showEnemyReward(enemy, reward);
		}
	}

	private showEnemyReward(enemy: Enemy, reward: AppliedDeathReward): void {
		const label = reward.resource === 'meat'
			? `Food +${reward.applied}`
			: reward.resource === 'money'
				? `+$${reward.applied}`
				: `+${reward.applied} ${reward.resource}`;
		this.createFloatingText(enemy.x, enemy.y - 112, label, '#23814d');
		if (reward.resource === 'meat' && this.textures.exists('resource-meat')) {
			const foodIcon = this.add.image(enemy.x + 18, enemy.y - 58, 'resource-meat')
				.setDisplaySize(34, 34)
				.setDepth(DEPTH_LAYERS.effects);
			this.tweens.add({
				targets: foodIcon,
				x: foodIcon.x + 18,
				y: foodIcon.y - 38,
				alpha: 0,
				scaleX: 1.25,
				scaleY: 1.25,
				duration: 900,
				ease: 'Cubic.easeOut',
				onComplete: () => foodIcon.destroy()
			});
		}
	}

	private createFloatingText(x: number, y: number, text: string, color: string): void {
		const feedback = this.add.text(x, y, text, {
			color,
			backgroundColor: 'rgba(255,255,255,0.92)',
			fontFamily: 'Arial, sans-serif',
			fontSize: '14px',
			fontStyle: 'bold',
			padding: { x: 7, y: 4 }
		})
			.setOrigin(0.5)
			.setDepth(DEPTH_LAYERS.effects);
		this.tweens.add({
			targets: feedback,
			y: y - 34,
			alpha: 0,
			duration: 850,
			ease: 'Cubic.easeOut',
			onComplete: () => feedback.destroy()
		});
	}
}
