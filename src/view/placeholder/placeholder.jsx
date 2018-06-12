// @flow
import React, { PureComponent } from 'react';
import { withBoxSpacing, getBoxSizingHeightAndWidth } from '../../state/box';
import type { Placeholder as PlaceholderType } from '../../types';

type Props = {|
  placeholder: PlaceholderType,
  innerRef: (ref: ?HTMLElement) => void,
|}

export default class Placeholder extends PureComponent<Props> {
  // eslint-disable-next-line react/sort-comp
  ref: ?HTMLElement = null

  show = () => {
    if (!this.ref) {
      return;
    }
    this.ref.style.display = this.props.placeholder.display;
  }

  hide = () => {
    if (!this.ref) {
      return;
    }
    this.ref.style.display = 'none';
  }

  setRef = (ref: ?HTMLElement) => {
    this.ref = ref;

    if (this.props.innerRef) {
      this.props.innerRef(this.ref);
    }
  }

  render() {
    const placeholder: PlaceholderType = this.props.placeholder;
    const { client, display, tagName, boxSizing } = placeholder;

    const { width, height } = getBoxSizingHeightAndWidth(client, boxSizing);

    const style = {
      display,
      boxSizing,
      width,
      height,
      ...withBoxSpacing(client),
      borderStyle: 'solid',
      borderColor: 'transparent',

      // Avoiding the collapsing or growing of this element when pushed by flex child siblings.
      // We have already taken a snapshot the current dimensions we do not want this element
      // to recalculate its dimensions
      // It is okay for these properties to be applied on elements that are not flex children
      flexShrink: '0',
      flexGrow: '0',
      // Just a little performance optimisation: avoiding the browser needing
      // to worry about pointer events for this element
      pointerEvents: 'none',
    };

    return React.createElement(tagName, {
      style,
      ref: this.setRef,
    });
  }
}
