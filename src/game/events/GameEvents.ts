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
	'station:changed': {
		stationId: string;
		resource: Extract<ResourceType, 'wood' | 'meat'>;
		value: number;
		capacity: number;
		delta: number;
		ready: boolean;
	};
	'economy:transfer': {
		source: string;
		destination: string;
		resource: ResourceType;
		amount: number;
		reward?: number;
	};
}

type EventName = keyof GameEventMap;
type EventListener<TEvent extends EventName> = (payload: GameEventMap[TEvent]) => void;

interface EventSubscription<TEvent extends EventName = EventName> {
	listener: EventListener<TEvent>;
	context?: unknown;
	once: boolean;
}

export class GameEventBus {
	private readonly subscriptions = new Map<EventName, Set<EventSubscription>>();

	on<TEvent extends EventName>(
		event: TEvent,
		listener: EventListener<TEvent>,
		context?: unknown
	): () => void {
		return this.subscribe(event, listener, context, false);
	}

	once<TEvent extends EventName>(
		event: TEvent,
		listener: EventListener<TEvent>,
		context?: unknown
	): () => void {
		return this.subscribe(event, listener, context, true);
	}

	off<TEvent extends EventName>(
		event: TEvent,
		listener: EventListener<TEvent>,
		context?: unknown
	): void {
		const eventSubscriptions = this.subscriptions.get(event);

		if (!eventSubscriptions) {
			return;
		}

		for (const subscription of eventSubscriptions) {
			if (subscription.listener === listener && subscription.context === context) {
				eventSubscriptions.delete(subscription);
			}
		}

		if (eventSubscriptions.size === 0) {
			this.subscriptions.delete(event);
		}
	}

	emit<TEvent extends EventName>(event: TEvent, payload: GameEventMap[TEvent]): void {
		const eventSubscriptions = this.subscriptions.get(event);

		if (!eventSubscriptions) {
			return;
		}

		for (const subscription of [...eventSubscriptions]) {
			if (subscription.once) {
				eventSubscriptions.delete(subscription);
			}

			const listener = subscription.listener as EventListener<TEvent>;
			listener.call(subscription.context, payload);
		}

		if (eventSubscriptions.size === 0) {
			this.subscriptions.delete(event);
		}
	}

	clear(event?: EventName): void {
		if (event) {
			this.subscriptions.delete(event);
			return;
		}

		this.subscriptions.clear();
	}

	private subscribe<TEvent extends EventName>(
		event: TEvent,
		listener: EventListener<TEvent>,
		context: unknown,
		once: boolean
	): () => void {
		const subscription: EventSubscription<TEvent> = {
			listener,
			context,
			once
		};
		const eventSubscriptions = this.subscriptions.get(event) ?? new Set<EventSubscription>();
		eventSubscriptions.add(subscription as EventSubscription);
		this.subscriptions.set(event, eventSubscriptions);

		return () => {
			eventSubscriptions.delete(subscription as EventSubscription);
			if (eventSubscriptions.size === 0) {
				this.subscriptions.delete(event);
			}
		};
	}
}

export const gameEvents = new GameEventBus();
