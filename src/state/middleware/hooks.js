// @flow
import invariant from 'tiny-invariant';
import messagePreset from './util/message-preset';
import * as timings from '../../debug/timings';
import type {
  Store,
  State,
  DropResult,
  Action,
  Hooks,
  HookProvided,
  Critical,
  DraggableLocation,
  DragStart,
  Announce,
  DragUpdate,
  OnDragStartHook,
  OnDragUpdateHook,
  OnDragEndHook,
} from '../../types';

type AnyHookFn = OnDragStartHook | OnDragUpdateHook | OnDragEndHook;
type AnyHookData = DragStart | DragUpdate | DropResult;

const withTimings = (key: string, fn: Function) => {
  timings.start(key);
  fn();
  timings.finish(key);
};

const areLocationsEqual = (current: ?DraggableLocation, next: ?DraggableLocation) => {
  // if both are null - we are equal
  if (current == null && next == null) {
    return true;
  }

  // if one is null - then they are not equal
  if (current == null || next == null) {
    return false;
  }

  // compare their actual values
  return current.droppableId === next.droppableId &&
    current.index === next.index;
};

const getExpiringAnnounce = (announce: Announce) => {
  let wasCalled: boolean = false;
  let isExpired: boolean = false;

  // not allowing async announcements
  setTimeout(() => {
    isExpired = true;
  });

  const result = (message: string): void => {
    if (wasCalled) {
      console.warn('Announcement already made. Not making a second announcement');
      return;
    }

    if (isExpired) {
      console.warn(`
        Announcements cannot be made asynchronously.
        Default message has already been announced.
      `);
      return;
    }

    wasCalled = true;
    announce(message);
  };

  // getter for isExpired
  // using this technique so that a consumer cannot
  // set the isExpired or wasCalled flags
  result.wasCalled = (): boolean => wasCalled;

  return result;
};

const getDragStart = (critical: Critical): DragStart => ({
  draggableId: critical.draggable.id,
  type: critical.droppable.type,
  source: {
    droppableId: critical.droppable.id,
    index: critical.draggable.index,
  },
});

export default (getHooks: () => Hooks, announce: Announce) => {
  const execute = (
    hook: ?AnyHookFn,
    data: AnyHookData,
    getDefaultMessage: (data: any) => string,
  ) => {
    if (!hook) {
      announce(getDefaultMessage(data));
      return;
    }

    const willExpire: Announce = getExpiringAnnounce(announce);
    const provided: HookProvided = {
      announce: willExpire,
    };

    // Casting because we are not validating which data type is going into which hook
    hook((data: any), provided);

    if (!willExpire.wasCalled()) {
      announce(getDefaultMessage(data));
    }
  };

  const publisher = (() => {
    let lastLocation: ?DraggableLocation = null;
    let lastCritical: ?Critical = null;
    let isDragStartPublished: boolean = false;

    const start = (critical: Critical) => {
      invariant(!isDragStartPublished, 'Cannot fire onDragStart as a drag start has already been published');
      const data: DragStart = getDragStart(critical);
      isDragStartPublished = true;
      lastCritical = critical;
      lastLocation = data.source;
      withTimings('onDragStart', () => execute(getHooks().onDragStart, data, messagePreset.onDragStart));
    };

    // Passing in the critical location again as it can change during a drag
    const move = (critical: Critical, location: ?DraggableLocation) => {
      invariant(isDragStartPublished, 'Cannot fire onDragMove when onDragStart has not been called');

      // No change to publish
      if (areLocationsEqual(lastLocation, location)) {
        return;
      }

      const data: DragUpdate = {
        ...getDragStart(critical),
        destination: location,
      };
      lastLocation = location;
      lastCritical = critical;

      withTimings('onDragUpdate', () => execute(getHooks().onDragUpdate, data, messagePreset.onDragUpdate));
    };

    const drop = (result: DropResult) => {
      invariant(isDragStartPublished, 'Cannot fire onDragEnd when there is no matching onDragStart');
      lastLocation = null;
      lastCritical = null;
      withTimings('onDragEnd', () => execute(getHooks().onDragEnd, result, messagePreset.onDragEnd));
    };

    // A non user initiated cancel
    const abort = () => {
      invariant(isDragStartPublished && lastCritical, 'Cannot cancel when onDragStart not fired');

      const result: DropResult = {
        ...getDragStart(lastCritical),
        destination: null,
        reason: 'CANCEL',
      };
      drop(result);
    };

    return {
      start,
      move,
      drop,
      abort,
      isDragStartPublished,
    };
  })();

  return (store: Store) => (next: (Action) => mixed) => (action: Action): mixed => {
    if (action.type === 'INITIAL_PUBLISH') {
      const critical: Critical = action.payload.critical;
      publisher.start(critical);
      next(action);
      return;
    }

    // Drag end
    if (action.type === 'DROP_COMPLETE') {
      const result: DropResult = action.payload;
      publisher.drop(result);
      next(action);
      return;
    }

    // Drag state resetting - need to check if
    // we should fire a onDragEnd hook
    if (action.type === 'CLEAN') {
      // Unmatched drag start call - need to cancel
      if (publisher.isDragStartPublished) {
        publisher.abort();
      }

      next(action);
      return;
    }

    // ## Perform drag updates

    // No drag updates required
    if (!publisher.isDragStartPublished) {
      next(action);
      return;
    }

    // Calling next() first so that we reduce the impact of the action
    next(action);

    const state: State = store.getState();
    if (state.phase === 'DRAGGING') {
      publisher.move(state.critical, state.impact.destination);
    }
  };
};
