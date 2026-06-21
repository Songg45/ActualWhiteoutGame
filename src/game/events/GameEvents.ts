import Phaser from 'phaser';
import type { GameStateSnapshot, ResourceType } from '../state/GameState';

export interface GameEventMap {
	'state:changed': GameStateSnapshot;
	'resource:changed': {
		resource: ResourceType;
		value: number;
		delta: number;
	};
	'building:unlocked': {
		buildingId: string;
	};
	'wave:changed': {
		wave: number;
	};
}

type EventName = keyof GameEventMap;
type EventListener<TEvent extends EventName> = (payload: GameEventMap[TEvent]) => void;

export class GameEventBus {
	private readonly emitter = new Phaser.Events.EventEmitter();

	on<TEvent extends EventName>(
		event: TEvent,
		listener: EventListener<TEvent>,
		context?: unknown
	): () => void {
		this.emitter.on(event, listener, context);
		return () => this.off(event, listener, context);
	}

	once<TEvent extends EventName>(
		event: TEvent,
		listener: EventListener<TEvent>,
		context?: unknown
	): () => void {
		this.emitter.once(event, listener, context);
		return () => this.off(event, listener, context);
	}

	off<TEvent extends EventName>(
		event: TEvent,
		listener: EventListener<TEvent>,
		context?: unknown
	): void {
		this.emitter.off(event, listener, context);
	}

	emit<TEvent extends EventName>(event: TEvent, payload: GameEventMap[TEvent]): void {
		this.emitter.emit(event, payload);
	}

	clear(event?: EventName): void {
		if (event) {
			this.emitter.removeAllListeners(event);
			return;
		}

		this.emitter.removeAllListeners();
	}
}

export const gameEvents = new GameEventBus();
