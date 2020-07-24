// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@lumino/widgets';
import {
  saveIcon,
  pasteIcon
  /*filterListIcon*/
} from '@jupyterlab/ui-components';
import { ToolbarButton } from '@jupyterlab/apputils';

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
