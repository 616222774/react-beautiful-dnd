// @flow
/* eslint-disable no-underscore-dangle */
import { applyMiddleware, createStore, compose } from 'redux';
import reducer from './reducer';
import lift from './middleware/lift';
import style from './middleware/style';
import drop from './middleware/drop';
import dropAnimationFinish from './middleware/drop-animation-finish';
import dimensionMarshalStopper from './middleware/dimension-marshal-stopper';
import type { DimensionMarshal } from './dimension-marshal/dimension-marshal-types';
import type { StyleMarshal } from '../view/style-marshal/style-marshal-types';
import type { Store, Hooks } from '../types';

// We are checking if window is available before using it.
// This is needed for universal apps that render the component server side.
// Details: https://github.com/zalmoxisus/redux-devtools-extension#12-advanced-store-setup
const composeEnhancers = typeof window === 'object'
  && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
  ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ : compose;

type Args = {|
  getDimensionMarshal: () => DimensionMarshal,
  styleMarshal: StyleMarshal,
  getHooks: () => Hooks,

|}

export default ({
  getDimensionMarshal,
  styleMarshal,
  getHooks,
}: Args): Store => createStore(
  reducer,
  composeEnhancers(
    applyMiddleware(
      // ## Application middleware
      // Style updates do not cause more actions. It is important to update styles
      // before hooks are called: specifically the onDragEnd hook. We need to clear
      // the transition styles off the elements before a reorder to prevent strange
      // post drag animations in firefox. Even though we clear the transition off
      // a Draggable - if it is done after a reorder firefox will still apply the
      // transition.
      style(styleMarshal),
      // Stop the dimension marshal collecting anything
      // when moving into a phase where collection is no longer needed.
      // We need to stop the marshal before hooks fire as hooks can cause
      // dimension registration changes in response to reordering
      dimensionMarshalStopper(getDimensionMarshal),
      // Fire application hooks in response to drag changes
      lift(getDimensionMarshal),
      // When a drop is pending and a bulk publish occurs, we need
      // pendingDrop,
      drop,
      // When a drop animation finishes - fire a drop complete
      dropAnimationFinish,

      // TODO: where should this go?
      // hooks(getHooks),

      // ## Debug middleware
      // > uncomment to use
      // debugging logger
      // require('./debug-middleware/log-middleware'),
      // debugging timer
      // require('./debug-middleware/timing-middleware').default,
      // average action timer
      // require('./debug-middleware/timing-average-middleware').default(20),
    ),
  ),
);
