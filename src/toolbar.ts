// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@lumino/widgets';

import {
  saveIcon,
  undoIcon,
  cutIcon,
  copyIcon,
  pasteIcon,
  filterListIcon
} from '@jupyterlab/ui-components';

import { ToolbarButton } from '@jupyterlab/apputils';

export class SaveButton extends Widget {
  constructor(options: CSVToolbar.IOptions) {
    super();
    const saveButton = new ToolbarButton({
      icon: saveIcon,
      onClick: (): void => {
        /*does something here*/
        console.log('FILE IS SAVED');
      },
      tooltip: 'Save',
      className: 'jp-toolbar-save'
    });
    return saveButton;
  }
}

export class UndoButton extends Widget {
  constructor(options: CSVToolbar.IOptions) {
    super();
    const undoButton = new ToolbarButton({
      icon: undoIcon,
      onClick: (): void => {
        /*does something here*/
        console.log('UNDO');
      },
      tooltip: 'Undo',
      className: 'jp-toolbar-undo'
    });
    return undoButton;
  }
}

export class CutButton extends Widget {
  constructor(options: CSVToolbar.IOptions) {
    super();
    const cutButton = new ToolbarButton({
      icon: cutIcon,
      onClick: (): void => {
        /*does something here*/
        console.log('CUT');
      },
      tooltip: 'Cut',
      className: 'jp-toolbar-cut'
    });
    return cutButton;
  }
}

export class CopyButton extends Widget {
  constructor(options: CSVToolbar.IOptions) {
    super();
    const copyButton = new ToolbarButton({
      icon: copyIcon,
      onClick: (): void => {
        /*does something here*/
        console.log('COPY');
      },
      tooltip: 'Copy',
      className: 'jp-toolbar-copy'
    });
    return copyButton;
  }
}

export class PasteButton extends Widget {
  constructor(options: CSVToolbar.IOptions) {
    super();
    const pasteButton = new ToolbarButton({
      icon: pasteIcon,
      onClick: (): void => {
        /*does something here*/
        console.log('PASTE');
      },
      tooltip: 'Paste',
      className: 'jp-toolbar-paste'
    });
    return pasteButton;
  }
}

export class FilterButton extends Widget {
  constructor(options: CSVToolbar.IOptions) {
    super();
    const filterButton = new ToolbarButton({
      icon: filterListIcon,
      onClick: (): void => {
        /*does something here*/
        console.log('FILTER DATA');
      },
      tooltip: 'Filter',
      className: 'jp-toolbar-filter'
    });
    return filterButton;
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
