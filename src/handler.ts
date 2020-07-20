/* eslint-disable no-inner-declarations */
import { IDisposable } from '@lumino/disposable';
import {
  BasicMouseHandler,
  DataGrid,
  DataModel,
  ResizeHandle
} from 'tde-datagrid';
import { Drag } from '@lumino/dragdrop';
import { Signal } from '@lumino/signaling';
import EditableDSVModel from './model';

export class RichMouseHandler extends BasicMouseHandler {
  constructor(options: RichMouseHandler.IOptions) {
    super();
    this._grid = options.grid;
    this._cursor = null;
  }

  get rightClickSignal(): Signal<this, Array<number>> {
    return this._rightClickSignal;
  }

  cursorForHandle(region: ResizeHandle): string {
    const cursorMap = {
      top: 'ns-resize',
      left: 'ew-resize',
      right: 'ew-resize',
      bottom: 'ns-resize',
      none: this.cursorByRegion()
    };
    this._cursor = cursorMap[region];
    return this._cursor;
  }

  cursorByRegion(): string {
    const hit = this._grid.hitTest(this._event.clientX, this._event.clientY);
    switch (hit.region) {
      case 'row-header': {
        return 'grab';
      }
      case 'column-header': {
        return 'grab';
      }
      default: {
        return 'default';
      }
    }
  }

  onMouseHover(grid: DataGrid, event: MouseEvent): void {
    this._event = event;
    super.onMouseHover(grid, event);
  }

  /**
   * Handle the mouse down event for the data grid.
   *
   * @param grid - The data grid of interest.
   *
   * @param event - The mouse down event of interest.
   */
  onMouseDown(grid: DataGrid, event: MouseEvent): void {
    this._event = event;
    super.onMouseDown(grid, event);
    if (this._cursor === 'grab') {
      this._cursor = 'grabbing';
      this.handleGrabbing();
    }
    return;
  }

  handleGrabbing(): void {
    const hit = this._grid.hitTest(this._event.clientX, this._event.clientY);
    const { region, row } = hit;
    // Set up the resize data type.
    const type: 'row-move' = 'row-move';

    // Determine the row region.
    const rgn: DataModel.RowRegion =
      region === 'row-header' ? 'body' : 'column-header';

    // Determine the section index.
    const index = row; //handle === 'top' ? row - 1 : row;

    // Fetch the section size.
    const size = this._grid.rowSize(rgn, index);

    // Override the document cursor.
    const override = Drag.overrideCursor('grabbing');

    // Create the temporary press data.
    const clientY = this._event.clientY;
    this._moveData = { type, region: rgn, index, size, clientY, override };
    console.log(this._moveData);
    return;
  }

  /**
   * Handle the mouse move event for the data grid.
   *
   * @param grid - The data grid of interest.
   *
   * @param event - The mouse move event of interest.
   */
  onMouseMove(grid: DataGrid, event: MouseEvent): void {
    // Fetch the press data.
    if (this._moveData) {
      const model = grid.dataModel as EditableDSVModel;
      model.moveRow(this._moveData.index);
      this._moveData = null;
    }
    super.onMouseMove(grid, event);
    return;
  }

  /**
   * Handle the context menu event for the data grid.
   *
   * @param grid - The data grid of interest.
   *
   * @param event - The context menu event of interest.
   */
  onContextMenu(grid: DataGrid, event: MouseEvent): void {
    const { clientX, clientY } = event;
    const hit = grid.hitTest(clientX, clientY);
    const { row, column } = hit;
    this._rightClickSignal.emit([row, column]);
  }
  private _grid: DataGrid;
  private _event: MouseEvent;
  private _cursor: string | null;
  private _moveData: RowMoveData | null;
  private _rightClickSignal = new Signal<this, Array<number>>(this);
}

export type RowMoveData = {
  /**
   * The descriminated type for the data.
   */
  readonly type: 'row-move';

  /**
   * The row region which holds the section being resized.
   */
  readonly region: DataModel.RowRegion;

  /**
   * The index of the section being moved.
   */
  readonly index: number;

  /**
   * The original size of the section.
   */
  readonly size: number;

  /**
   * The original client Y position of the mouse.
   */
  readonly clientY: number;

  /**
   * The disposable to clear the cursor override.
   */
  readonly override: IDisposable;
};

export declare namespace RichMouseHandler {
  export interface IOptions {
    grid: DataGrid;
  }
}
