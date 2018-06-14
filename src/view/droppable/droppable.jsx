// @flow
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import type { Props, Provided, StateSnapshot } from './droppable-types';
import type { DroppableId, TypeId } from '../../types';
import DroppableDimensionPublisher from '../droppable-dimension-publisher/';
import Placeholder from '../placeholder/';
import {
  droppableIdKey,
  droppableTypeKey,
  styleContextKey,
} from '../context-keys';

type Context = {
  [string]: DroppableId | TypeId,
}

export default class Droppable extends Component<Props> {
  /* eslint-disable react/sort-comp */
  styleContext: string
  ref: ?HTMLElement = null
  placeholderRef: ?Placeholder = null

  // Need to declare childContextTypes without flow
  static contextTypes = {
    [styleContextKey]: PropTypes.string.isRequired,
  }

  constructor(props: Props, context: Object) {
    super(props, context);

    this.styleContext = context[styleContextKey];
  }

  // Need to declare childContextTypes without flow
  // https://github.com/brigand/babel-plugin-flow-react-proptypes/issues/22
  static childContextTypes = {
    [droppableIdKey]: PropTypes.string.isRequired,
    [droppableTypeKey]: PropTypes.string.isRequired,
  }

  getChildContext(): Context {
    const value: Context = {
      [droppableIdKey]: this.props.droppableId,
      [droppableTypeKey]: this.props.type,
    };
    return value;
  }

  setPlaceholderRef = (placeholder: ?Placeholder) => {
    this.placeholderRef = placeholder;
  }

  getPlaceholderRef = (): ?Placeholder => this.placeholderRef;

  componentDidMount() {
    if (!this.ref) {
      console.error(`
        Droppable has not been provided with a ref.
        Please use the DroppableProvided > innerRef function
      `);
    }
  }

  /* eslint-enable */

  // React calls ref callback twice for every render
  // https://github.com/facebook/react/pull/8333/files
  setRef = (ref: ?HTMLElement) => {
    // TODO: need to clear this.state.ref on unmount
    if (ref === null) {
      return;
    }

    if (ref === this.ref) {
      return;
    }

    this.ref = ref;
  }

  getDroppableRef = (): ?HTMLElement => this.ref;

  getPlaceholder() {
    if (!this.props.placeholder) {
      return null;
    }

    return (
      <Placeholder
        ref={this.setPlaceholderRef}
        placeholder={this.props.placeholder}
      />
    );
  }

  render() {
    const {
      children,
      direction,
      droppableId,
      ignoreContainerClipping,
      isDraggingOver,
      isDropDisabled,
      draggingOverWith,
      type,
    } = this.props;
    const provided: Provided = {
      innerRef: this.setRef,
      placeholder: this.getPlaceholder(),
      droppableProps: {
        'data-react-beautiful-dnd-droppable': this.styleContext,
      },
    };
    const snapshot: StateSnapshot = {
      isDraggingOver,
      draggingOverWith,
    };

    return (
      <DroppableDimensionPublisher
        droppableId={droppableId}
        type={type}
        direction={direction}
        getPlaceholder={this.getPlaceholderRef}
        ignoreContainerClipping={ignoreContainerClipping}
        isDropDisabled={isDropDisabled}
        getDroppableRef={this.getDroppableRef}
      >
        {children(provided, snapshot)}
      </DroppableDimensionPublisher>
    );
  }
}
