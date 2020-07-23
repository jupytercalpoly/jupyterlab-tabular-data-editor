/* eslint-disable no-inner-declarations */
import { IDisposable } from '@lumino/disposable';
import {
  BasicMouseHandler,
  DataGrid,
  DataModel,
  ResizeHandle,
  SelectionModel
} from '@lumino/datagrid';
import { Drag } from '@lumino/dragdrop';
import { Signal } from '@lumino/signaling';
import EditableDSVModel from './model';
import { renderSelection, IBoundingRegion } from './selection';

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

  release(): void {
    if (this._moveData) {
      this._moveData.override.dispose();
      this._moveData = null;
    }
    super.release();
  }
  handleGrabbing(): void {
    const hit = this._grid.hitTest(this._event.clientX, this._event.clientY);
    const { region, row, column } = hit;

    // get row/column geometry
    // the real parameters for the shadow rectangle
    let r1: number;
    let r2: number;
    let c1: number;
    let c2: number;

    // get the left and top offsets of the grid viewport
    const { left, top } = this._grid.viewport.node.getBoundingClientRect();
    if (region === 'column-header') {
      r1 = top;
      r2 =
        top +
        Math.min(
          this._grid.pageHeight,
          this._grid.bodyHeight + this._grid.headerHeight
        );
      c1 =
        left + this._grid.headerWidth + this._grid.columnOffset('body', column);
      c2 = c1 + this._grid.columnSize('body', column);
    } else if (region === 'row-header') {
      r1 = top + this._grid.headerHeight + this._grid.rowOffset('body', row);
      r2 = r1 + this._grid.rowSize('body', row);
      c1 = left;
      c2 =
        left +
        Math.min(
          this._grid.pageWidth,
          this._grid.headerWidth + this._grid.bodyWidth
        );
    }
    // r1 = Math.floor(r1);
    // r2 = Math.floor(r2);
    // c1 = Math.floor(c1);
    // c2 = Math.floor(c2);

    // get the bounds for dragging

    let lwB: number;
    let uB: number;
    let rB: number;
    let lB: number;
    if (region === 'column-header') {
      lwB = uB = r1;
      lB = left + this._grid.headerWidth;
      rB =
        left +
        Math.min(
          this._grid.pageWidth - (c2 - c1),
          this._grid.headerWidth + this._grid.bodyWidth - (c2 - c1)
        );
    } else if (region === 'row-header') {
      lwB =
        top +
        Math.min(
          this._grid.pageHeight - (r2 - r1),
          this._grid.bodyHeight + this._grid.headerHeight - (r2 - r1)
        );
      uB = top + this._grid.headerHeight;
      lB = rB = c1;
    }
    const boundingRegion: IBoundingRegion = {
      upperBound: uB,
      lowerBound: lwB,
      leftBound: lB,
      rightBound: rB
    };
    renderSelection(
      r1,
      r2,
      c1,
      c2,
      this._event.clientX,
      this._event.clientY,
      boundingRegion
    );

    // if region is void, bail early
    if (region === 'void') {
      return;
    }
    const type = 'move';

    // Override the document cursor.
    const override = Drag.overrideCursor('grabbing');

    this._moveData = {
      type,
      region,
      row,
      column,
      override,
      localX: -1,
      localY: -1,
      timeout: -1
    };
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
      this.handleMove(grid, event);
    } else {
      super.onMouseMove(grid, event);
    }
    return;
  }

  /**
   *
   * @param grid
   * @param event
   */
  handleMove(grid: DataGrid, event: MouseEvent): void {
    // TODO: handle UI stuff.
    const model = grid.selectionModel;

    // Map the position to virtual coordinates.
    let { vx, vy } = grid.mapToVirtual(event.clientX, event.clientY);

    // Clamp the coordinates to the limits.
    vx = Math.max(0, Math.min(vx, grid.bodyWidth - 1));
    vy = Math.max(0, Math.min(vy, grid.bodyHeight - 1));

    // Set up the selection variables.
    let r1: number;
    let c1: number;
    let r2: number;
    let c2: number;
    const cursorRow = model.cursorRow;
    const cursorColumn = model.cursorColumn;
    const clear: SelectionModel.ClearMode = 'current';

    // Compute the selection based pressed region.
    if (this._moveData.region === 'row-header') {
      r1 = grid.rowAt('body', vy);
      r2 = grid.rowAt('body', vy);
      c1 = 0;
      c2 = Infinity;
    } else if (this._moveData.region === 'column-header') {
      r1 = 0;
      r2 = Infinity;
      c1 = grid.columnAt('body', vx);
      c2 = grid.columnAt('body', vx);
    } else {
      r1 = cursorRow;
      r2 = grid.rowAt('body', vy);
      c1 = cursorColumn;
      c2 = grid.columnAt('body', vx);
    }
    // Make the selection.
    model.select({ r1, c1, r2, c2, cursorRow, cursorColumn, clear });
  }

  /**
   *
   * @param grid
   * @param event
   */
  onMouseUp(grid: DataGrid, event: MouseEvent): void {
    if (this._moveData) {
      let { vx, vy } = grid.mapToVirtual(event.clientX, event.clientY);
      // Clamp the coordinates to the limits.
      vx = Math.max(0, Math.min(vx, grid.bodyWidth - 1));
      vy = Math.max(0, Math.min(vy, grid.bodyHeight - 1));
      const model = grid.dataModel as EditableDSVModel;
      if (this._moveData.region === 'column-header') {
        const startColumn = this._moveData.column;
        const endColumn = grid.columnAt('body', vx);
        model.moveColumn(startColumn, endColumn);
      } else if (this._moveData.region === 'row-header') {
        const startRow = this._moveData.row;
        const endRow = grid.rowAt('body', vy);
        model.moveRow(startRow, endRow);
      }
    }
    this.release();
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
  private _moveData: MoveData | null;
  private _rightClickSignal = new Signal<this, Array<number>>(this);
}

export type MoveData = {
  /**
   * The descriminated type for the data.
   */
  readonly type: 'move';

  /**
   * The row region which holds the section being resized.
   */
  readonly region: DataModel.CellRegion;

  readonly row: number;

  readonly column: number;

  readonly override: IDisposable;

  readonly localX: number;

  readonly localY: number;

  readonly timeout: number;
};

export declare namespace RichMouseHandler {
  export interface IOptions {
    grid: DataGrid;
  }
}

export type RowMoveData = {
  /**
   * The descriminated type for the data.
   */
  readonly type: 'move';

  /**
   * The row region which holds the section being resized.
   */
  readonly region: DataModel.CellRegion;

  readonly row: number;

  readonly column: number;

  readonly override: IDisposable;

  readonly localX: number;

  readonly localY: number;

  readonly timeout: number;
};

export declare namespace RichMouseHandler {
  export interface IOptions {
    grid: DataGrid;
  }
}
