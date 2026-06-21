import Phaser from 'phaser';
import './styles.css';

class GameScene extends Phaser.Scene {
	constructor() {
		super('GameScene');
	}

	create() {
		const { width, height } = this.scale;

		this.add.rectangle(width / 2, height / 2, width, height, 0xdcefff);
		this.add.text(width / 2, height / 2 - 24, 'Actual Whiteout Game', {
			color: '#14324a',
			fontFamily: 'Arial, sans-serif',
			fontSize: '28px',
			fontStyle: 'bold'
		}).setOrigin(0.5);
		this.add.text(width / 2, height / 2 + 18, 'Tooling smoke test ready', {
			color: '#37566f',
			fontFamily: 'Arial, sans-serif',
			fontSize: '16px'
		}).setOrigin(0.5);
	}
}

new Phaser.Game({
	type: Phaser.AUTO,
	parent: 'game',
	backgroundColor: '#dcefff',
	scale: {
		mode: Phaser.Scale.RESIZE,
		autoCenter: Phaser.Scale.CENTER_BOTH,
		width: window.innerWidth,
		height: window.innerHeight
	},
	scene: [GameScene]
});

