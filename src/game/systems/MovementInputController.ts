import Phaser from 'phaser';
import {
	combineMovementDirections,
	keyboardMovementDirection,
	type MovementDirection
} from './MovementSystem';
import { FloatingJoystick } from './FloatingJoystick';

type CursorKeys = ReturnType<Phaser.Input.Keyboard.KeyboardPlugin['createCursorKeys']>;

export class MovementInputController {
	readonly joystick = new FloatingJoystick();
	private readonly graphics: Phaser.GameObjects.Graphics;
	private readonly cursors?: CursorKeys;
	private readonly wasd?: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

	constructor(private readonly scene: Phaser.Scene) {
		this.graphics = scene.add.graphics()
			.setScrollFactor(0)
			.setDepth(250_000)
			.setVisible(false);
		this.cursors = scene.input.keyboard?.createCursorKeys();
		this.wasd = scene.input.keyboard?.addKeys('W,A,S,D') as typeof this.wasd;

		scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
		scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
		scene.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
		scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUp, this);
		scene.game.events.on(Phaser.Core.Events.BLUR, this.handleBlur, this);
	}

	get direction(): MovementDirection {
		const keyboard = keyboardMovementDirection({
			left: Boolean(this.cursors?.left.isDown || this.wasd?.A.isDown),
			right: Boolean(this.cursors?.right.isDown || this.wasd?.D.isDown),
			up: Boolean(this.cursors?.up.isDown || this.wasd?.W.isDown),
			down: Boolean(this.cursors?.down.isDown || this.wasd?.S.isDown)
		});
		return combineMovementDirections(keyboard, this.joystick.snapshot.direction);
	}

	destroy(): void {
		this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
		this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
		this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
		this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUp, this);
		this.scene.game.events.off(Phaser.Core.Events.BLUR, this.handleBlur, this);
		this.joystick.reset();
		this.graphics.destroy();
	}

	private handlePointerDown(pointer: Phaser.Input.Pointer): void {
		if (this.joystick.activate(
			pointer.id,
			{ x: pointer.x, y: pointer.y },
			{ width: this.scene.scale.width, height: this.scene.scale.height }
		)) {
			pointer.event?.preventDefault();
			this.drawJoystick();
		}
	}

	private handlePointerMove(pointer: Phaser.Input.Pointer): void {
		if (this.joystick.move(pointer.id, { x: pointer.x, y: pointer.y })) {
			pointer.event?.preventDefault();
			this.drawJoystick();
		}
	}

	private handlePointerUp(pointer: Phaser.Input.Pointer): void {
		if (this.joystick.release(pointer.id)) {
			pointer.event?.preventDefault();
			this.graphics.clear().setVisible(false);
		}
	}

	private handleBlur(): void {
		this.joystick.reset();
		this.graphics.clear().setVisible(false);
	}

	private drawJoystick(): void {
		const { anchor, knob } = this.joystick.snapshot;
		this.graphics
			.clear()
			.fillStyle(0x17384c, 0.2)
			.fillCircle(anchor.x, anchor.y, this.joystick.radius)
			.lineStyle(2, 0xffffff, 0.42)
			.strokeCircle(anchor.x, anchor.y, this.joystick.radius)
			.fillStyle(0xffffff, 0.48)
			.fillCircle(knob.x, knob.y, 23)
			.lineStyle(2, 0x17384c, 0.28)
			.strokeCircle(knob.x, knob.y, 23)
			.setVisible(true);
	}
}
