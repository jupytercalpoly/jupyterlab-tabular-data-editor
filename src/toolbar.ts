// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@lumino/widgets';

import { Styling } from '@jupyterlab/apputils';

import {
  saveIcon,
  cutIcon,
  copyIcon,
  pasteIcon,
  undoIcon,
  filterListIcon
} from '@jupyterlab/ui-components';

/**
 * The class name added to a csv toolbar widget.
 */
const SAVE_CLASS = 'jp-save';

const SAVE_BUTTON_CLASS = 'jp-save-button';

/**
 * A button for saving
 */
export class SaveButton extends Widget {
  /**
   * Construct a new csv table widget.
   */
  constructor(options: CSVToolbar.IOptions) {
    super({ node: Private.createNode(options.selected) });
    this.addClass(SAVE_CLASS);
  }
}

/**
 * A namespace for `CSVToolbar` statics.
 */
export namespace CSVToolbar {
  /**
   * The instantiation options for a CSV toolbar.
   */
  export interface IOptions {
    /**
     * The initially selected delimiter.
     */
    selected: string;
  }
}

/**
 * A namespace for private toolbar methods.
 */
namespace Private {
  /**
   * Create the node for the save button.
   */
  export function createNode(selected: string): HTMLElement {
    const div = document.createElement('div');
    const select = document.createElement('select');

    const node = Styling.wrapSelect(select);
    node.classList.add(SAVE_BUTTON_CLASS);
    /*
    div.appendChild(node);
    */
    div.appendChild(
      saveIcon.element({
        tag: 'span',
        margin: 'auto 7px auto 16px',
        width: '18px'
      })
    );

    div.appendChild(
      undoIcon.element({
        tag: 'span',
        margin: 'auto 7px',
        width: '18px'
      })
    );

    div.appendChild(
      cutIcon.element({
        tag: 'span',
        margin: 'auto 7px',
        width: '18px'
      })
    );

    div.appendChild(
      copyIcon.element({
        tag: 'span',
        margin: 'auto 7px',
        width: '18px'
      })
    );

    div.appendChild(
      pasteIcon.element({
        tag: 'span',
        margin: 'auto 7px',
        width: '18px'
      })
    );

    div.appendChild(
      filterListIcon.element({
        tag: 'span',
        margin: 'auto 7px',
        width: '18px'
      })
    );

    return div;
  }
}
