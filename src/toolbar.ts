// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@lumino/widgets';

import {
  saveIcon,
  undoIcon,
  cutIcon,
  copyIcon,
  pasteIcon
  /*filterListIcon*/
} from '@jupyterlab/ui-components';

import { Signal } from '@lumino/signaling';

import { ToolbarButton } from '@jupyterlab/apputils';

export class SaveButton extends Widget {
  constructor(options: CSVToolbar.IOptions) {
    super();
    const saveButton = new ToolbarButton({
      icon: saveIcon,
      onClick: (): void => {
        this._saveButtonSignal.emit('save');
        console.log('FILE IS SAVED');
      },
      tooltip: 'Save',
      className: 'jp-toolbar-save'
    });
  }
  get saveButtonSignal(): Signal<this, string> {
    return this._saveButtonSignal;
  }
  private _saveButtonSignal: Signal<this, string> = new Signal<this, string>(
    this
  );
}

export class UndoButton extends Widget {
  constructor(options: CSVToolbar.IOptions) {
    super();
    const undoButton = new ToolbarButton({
      icon: undoIcon,
      onClick: (): void => {
        /*does something here*/
        this._undoButtonSignal.emit('undo');
        console.log('UNDO');
      },
      tooltip: 'Undo',
      className: 'jp-toolbar-undo'
    });
  }
  get undoButtonSignal(): Signal<this, string> {
    return this._undoButtonSignal;
  }
  private _undoButtonSignal: Signal<this, string> = new Signal<this, string>(
    this
  );
}

export class CutButton extends Widget {
  constructor(options: CSVToolbar.IOptions) {
    super();
    const cutButton = new ToolbarButton({
      icon: cutIcon,
      onClick: (): void => {
        /*does something here*/
        this._cutButtonSignal.emit('cut');
        console.log('CUT');
      },
      tooltip: 'Cut',
      className: 'jp-toolbar-cut'
    });
  }
  get cutButtonSignal(): Signal<this, string> {
    return this._cutButtonSignal;
  }
  private _cutButtonSignal: Signal<this, string> = new Signal<this, string>(
    this
  );
}

export class CopyButton extends Widget {
  constructor(options: CSVToolbar.IOptions) {
    super();
    const copyButton = new ToolbarButton({
      icon: copyIcon,
      onClick: (): void => {
        /*does something here*/
        this._copyButtonSignal.emit('copy');
        console.log('COPY');
      },
      tooltip: 'Copy',
      className: 'jp-toolbar-copy'
    });
  }

  get copyButtonSignal(): Signal<this, string> {
    return this._copyButtonSignal;
  }
  private _copyButtonSignal: Signal<this, string> = new Signal<this, string>(
    this
  );
}

export class PasteButton extends Widget {
  constructor(options: CSVToolbar.IOptions) {
    super();
    const pasteButton = new ToolbarButton({
      icon: pasteIcon,
      onClick: (): void => {
        /*does something here*/
        this._pasteButtonSignal.emit('paste');
        console.log('PASTE');
      },
      tooltip: 'Paste',
      className: 'jp-toolbar-paste'
    });
  }
  get pasteButtonSignal(): Signal<this, string> {
    return this._pasteButtonSignal;
  }
  private _pasteButtonSignal: Signal<this, string> = new Signal<this, string>(
    this
  );
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
