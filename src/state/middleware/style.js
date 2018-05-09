// @flow
import type { Action } from '../../types';
import type { StyleMarshal } from '../../view/style-marshal/style-marshal-types';

export default (marshal: StyleMarshal) =>
  () => (next: (Action) => mixed) => (action: Action): mixed => {
    // TODO: need to respond to actions and not state values
    if (action.type === 'INITIAL_PUBLISH') {
      marshal.dragging();
    }

    if (action.type === 'DROP_ANIMATE') {
      marshal.dropping(action.payload.result.reason);
    }

    if (action.type === 'CLEAN' || action.type === 'DROP_COMPLETE') {
      marshal.resting();
    }

    next(action);
  };

