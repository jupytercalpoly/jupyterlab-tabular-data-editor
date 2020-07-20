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
  get rightClickSignal(): Signal<this, Array<number>> {
    return this._rightClickSignal;
  }
  onMouseHover(grid: DataGrid, event: MouseEvent): void {
    this._event = event;
    super.onMouseHover(grid, event);
  }

  cursorByRegion(): string {
    const hit = this._grid.hitTest(this._event.clientX, this._event.clientY);
    switch (hit.region) {
      case 'row-header' || 'column-header': {
        return 'grab';
      }
      default: {
        return 'none';
      }
    }
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
    // Unpack the event.
    if (this._cursor === 'grab') {
      this.handleGrabbing();
      return;
    }
    super.onMouseDown(grid, event);
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
    this.moveData = { type, region: rgn, index, size, clientY, override };
    console.log(this.moveData);
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
    if (this.moveData) {
      const model = grid.dataModel as EditableDSVModel;
      model.moveRow(this.moveData.index);
      this.moveData = null;
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
  protected moveData: RowMoveData | null;
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
