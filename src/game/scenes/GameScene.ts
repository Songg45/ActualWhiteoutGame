import Phaser from 'phaser';
import { DEPTH_LAYERS, GAME_COLORS, SCENE_KEYS, WORLD_BOUNDS } from '../config';
import { Player } from '../entities/Player';
import { MapBuilder, type BuiltMap } from '../map/MapBuilder';
import { createMapData } from '../map/MapData';

export class GameScene extends Phaser.Scene {
	private backdrop?: Phaser.GameObjects.Graphics;
	private builtMap?: BuiltMap;
	private player?: Player;
	private interactionPrompt?: Phaser.GameObjects.Text;

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
		this.createWorld();
		this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
		this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutWorld, this);
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
			this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutWorld, this);
			this.player?.destroy();
			this.builtMap?.destroy();
		});
	}

	update(time: number, delta: number): void {
		this.player?.update(time, delta);
		this.layoutInteractionPrompt();
	}

	private createWorld(): void {
		this.backdrop = this.add.graphics().setDepth(DEPTH_LAYERS.ground);
		this.backdrop
			.fillStyle(GAME_COLORS.snowShadow)
			.fillRect(WORLD_BOUNDS.x, WORLD_BOUNDS.y, WORLD_BOUNDS.width, WORLD_BOUNDS.height)
			.fillStyle(0xffffff, 0.2)
			.fillEllipse(WORLD_BOUNDS.width / 2, 530, 1680, 900);

		this.builtMap = new MapBuilder(
			this,
			createMapData(),
			{ x: WORLD_BOUNDS.width / 2, y: 130 }
		).build();
		this.player = new Player(this, this.builtMap, {
			spawnGrid: { x: 7, y: 8 },
			onInteractionChange: (interactable) => {
				if (!this.interactionPrompt) {
					return;
				}
				this.interactionPrompt
					.setText(interactable ? `Near ${interactable.marker?.label ?? interactable.id}` : '')
					.setVisible(Boolean(interactable));
			}
		});
		this.player.addCarry('wood', 3);
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

	private handlePointerDown(pointer: Phaser.Input.Pointer): void {
		this.player?.moveToWorld(new Phaser.Math.Vector2(pointer.worldX, pointer.worldY));
	}

	private layoutInteractionPrompt(): void {
		if (!this.player || !this.interactionPrompt?.visible) {
			return;
		}
		this.interactionPrompt.setPosition(this.player.x, this.player.y - 105);
	}
}
