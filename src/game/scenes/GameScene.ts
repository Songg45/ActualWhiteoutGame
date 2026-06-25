import Phaser from 'phaser';
import { DEPTH_LAYERS, GAME_COLORS, SCENE_KEYS, WORLD_BOUNDS } from '../config';
import { Player } from '../entities/Player';
import { MapBuilder, type BuiltMap } from '../map/MapBuilder';
import { MapRuntime } from '../map/MapRuntime';
import { camp01Recipe } from '../map/recipes/camp01';
import { gameState } from '../state/GameState';
import { EconomySystem } from '../systems/EconomySystem';
import { MovementInputController } from '../systems/MovementInputController';
import { ProgressionSystem } from '../systems/ProgressionSystem';

export class GameScene extends Phaser.Scene {
	private backdrop?: Phaser.GameObjects.Graphics;
	private builtMap?: BuiltMap;
	private player?: Player;
	private interactionPrompt?: Phaser.GameObjects.Text;
	private movementInput?: MovementInputController;
	private economy?: EconomySystem;
	private progression?: ProgressionSystem;

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
			this.progression?.destroy();
			this.economy?.destroy();
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
