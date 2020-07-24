// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@lumino/widgets';
import { CommandRegistry } from '@lumino/commands';
import {
  saveIcon,
  cutIcon,
  copyIcon,
  pasteIcon
  /*filterListIcon*/
} from '@jupyterlab/ui-components';
import { ToolbarButton, CommandToolbarButton } from '@jupyterlab/apputils';

export class SaveButton extends Widget {
  constructor(options: CSVToolbar.IOptions) {
    //, commands: CommandRegistry) {
    super();
    //let id = 'docmanager:save';
    // const saveButton = new CommandToolbarButton({ commands, id });
    const saveButton = new ToolbarButton({
      icon: saveIcon,
      onClick: (): void => {
        console.log('FILE IS SAVED');
      },
      tooltip: 'Save',
      className: 'jp-toolbar-save'
    });
    return saveButton;
  }
}

export class UndoButton extends Widget {
  constructor(commands: CommandRegistry) {
    super();
    const id = 'tde:undo';
    const undoButton = new CommandToolbarButton({ commands, id });
    return undoButton;
  }
}

export class CutButton extends Widget {
  constructor(options: CSVToolbar.IOptions) {
    super();
    const cutButton = new ToolbarButton({
      icon: cutIcon,
      onClick: (): void => {
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
        // this._pasteButtonSignal.emit('paste');
        console.log('PASTE');
      },
      tooltip: 'Paste',
      className: 'jp-toolbar-paste'
    });
    return pasteButton;
  }
}

/* POSSIBLE FUTURE FEATURE
export class FilterButton extends Widget {
  constructor(options: CSVToolbar.IOptions) {
    super();
    const filterButton = new ToolbarButton({
      icon: filterListIcon,
      onClick: (): void => {
        console.log('FILTER DATA');
      },
      tooltip: 'Filter',
      className: 'jp-toolbar-filter'
    });
    return filterButton;
  }
}
*/

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
