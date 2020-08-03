import { IDisposable } from '@lumino/disposable';
import {
  BasicMouseHandler,
  DataGrid,
  DataModel,
  ResizeHandle
} from 'tde-datagrid';
import { Drag } from '@lumino/dragdrop';
import { Signal } from '@lumino/signaling';
import { renderSelection, IBoundingRegion, BoundedDrag } from './selection';
import { EditableDSVModel } from './model';

export class RichMouseHandler extends BasicMouseHandler {
  private _moveLine: BoundedDrag;
  constructor(options: RichMouseHandler.IOptions) {
    super();
    this._grid = options.grid;
    this._cursor = null;
  }

  get resizeSignal(): Signal<this, null> {
    return this._resizeSignal;
  }

  get rightClickSignal(): Signal<this, DataGrid.HitTestResult> {
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
    // display the grab cursor if the row/column is in the curent selection
    switch (hit.region) {
      case 'row-header':
        return this._grid.selectionModel.isRowSelected(hit.row)
          ? 'grab'
          : 'default';
      case 'column-header':
        return this._grid.selectionModel.isColumnSelected(hit.column)
          ? 'grab'
          : 'default';
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
    switch (region) {
      case 'column-header': {
        this._selectionIndex = column;
        break;
      }
      case 'row-header': {
        this._selectionIndex = row;
        break;
      }
    }

    // get the rectangular region of the row/column our mouse clicked on
    let [r1, r2, c1, c2] = this.getShadowRegion(region, row, column);

    // get the left and top offsets of the grid viewport
    const { left, top } = this._grid.viewport.node.getBoundingClientRect();

    // get the bounds for dragging

    let lowerBound: number;
    let upperBound: number;
    let rightBound: number;
    let leftBound: number;
    if (region === 'column-header') {
      lowerBound = upperBound = r1;
      leftBound = left + this._grid.headerWidth;
      rightBound =
        left + this._grid.headerWidth + this._grid.pageWidth - (c2 - c1);
    } else if (region === 'row-header') {
      lowerBound =
        top +
        Math.min(
          this._grid.pageHeight - (r2 - r1),
          this._grid.bodyHeight + this._grid.headerHeight - (r2 - r1)
        );
      upperBound = top + this._grid.headerHeight;
      leftBound = rightBound = c1;
    }
    const boundingRegion: IBoundingRegion = {
      upperBound: upperBound,
      lowerBound: lowerBound,
      leftBound: leftBound,
      rightBound: rightBound
    };
    renderSelection(
      r1,
      r2,
      c1,
      c2,
      this._event.clientX,
      this._event.clientY,
      boundingRegion,
      'shadow'
    );

    // set r1, r2, c1, c2 to the bounds for the dark line
    switch (region) {
      case 'column-header': {
        c1 = c1 - 1;
        c2 = c1 + 2;
        break;
      }
      case 'row-header': {
        r1 = r1 - 1;
        r2 = r1 + 2;
      }
    }

    // initialize the dark line
    this._moveLine = renderSelection(
      r1,
      r2,
      c1,
      c2,
      this._event.clientX,
      this._event.clientY
    );

    // Create the move data
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

  getShadowRegion(
    region: DataModel.CellRegion | 'void',
    row: number,
    column: number
  ): Array<number> {
    let r1: number;
    let r2: number;
    let c1: number;
    let c2: number;

    // get the left and top offsets of the grid viewport
    const { left, top } = this._grid.viewport.node.getBoundingClientRect();
    if (region === 'column-header') {
      r1 = top + this._grid.headerHeight;
      r2 =
        top +
        Math.min(
          this._grid.pageHeight + this._grid.headerHeight,
          this._grid.bodyHeight + this._grid.headerHeight
        );
      c1 =
        left +
        this._grid.headerWidth +
        this._grid.columnOffset('body', column) -
        this._grid.scrollX;
      c2 = c1 + this._grid.columnSize('body', column);
    } else if (region === 'row-header') {
      r1 =
        top +
        this._grid.headerHeight +
        this._grid.rowOffset('body', row) -
        this._grid.scrollY;
      r2 = r1 + this._grid.rowSize('body', row);
      c1 = left + this._grid.headerWidth;
      c2 =
        left +
        Math.min(
          this._grid.pageWidth + this._grid.headerWidth,
          this._grid.headerWidth + this._grid.bodyWidth
        );
    }
    return [r1, r2, c1, c2];
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
      this.updateLinePos(grid, event);
    } else {
      super.onMouseMove(grid, event);
    }
    return;
  }

  /**
   * Moves the line based on the position of the cursor and shadow
   * @param grid
   * @param event
   */
  updateLinePos(grid: DataGrid, event: MouseEvent): void {
    // find the region we originall clicked on.
    const { region } = this._moveData;

    // initialize the variables for the the rectangular column/row region
    let [r1, r2, c1, c2] = this.getShadowRegion(
      region,
      this._selectionIndex,
      this._selectionIndex
    );

    // see if we have crossed the boundary to a neighboring row/column
    switch (region) {
      case 'column-header': {
        // bail early if we are still within the bounds
        if (c1 < event.clientX && event.clientX < c2) {
          return;
        } else if (event.clientX < c1) {
          // we are at the previous column, get the new region
          this._selectionIndex--;
          [r1, r2, c1, c2] = this.getShadowRegion(
            region,
            this._selectionIndex,
            this._selectionIndex
          );
          this._moveLine.manualPositionUpdate(c1 - 1, r1);
        } else {
          this._selectionIndex++;
          // we are at the next column, get the new region
          [r1, r2, c1, c2] = this.getShadowRegion(
            region,
            this._selectionIndex,
            this._selectionIndex
          );
          this._moveLine.manualPositionUpdate(c2 - 1, r1);
        }
        break;
      }
      case 'row-header': {
        // bail early if we are still within the bounds
        if (r1 < event.clientY && event.clientY < r2) {
          return;
        } else if (event.clientY < r1) {
          // we are at the previous row, get the new region
          this._selectionIndex--;
          [r1, r2, c1, c2] = this.getShadowRegion(
            region,
            this._selectionIndex,
            this._selectionIndex
          );
          this._moveLine.manualPositionUpdate(c1, r1 - 1);
        } else {
          // we are at the next column, get the new region
          this._selectionIndex++;
          [r1, r2, c1, c2] = this.getShadowRegion(
            region,
            this._selectionIndex,
            this._selectionIndex
          );
          this._moveLine.manualPositionUpdate(c1, r2 - 1);
        }
        break;
      }
    }
  }

  /**
   *
   * @param grid
   * @param event
   */
  onMouseUp(grid: DataGrid, event: MouseEvent): void {
    // if move data exists, handle the move first
    if (this._moveData) {
      let { vx, vy } = grid.mapToVirtual(event.clientX, event.clientY);
      // Clamp the coordinates to the limits.
      vx = Math.max(0, Math.min(vx, grid.bodyWidth - 1));
      vy = Math.max(0, Math.min(vy, grid.bodyHeight - 1));

      const model = grid.dataModel as EditableDSVModel;
      const selectionModel = this._grid.selectionModel;

      // we can assume there is a selection as it is necessary to move rows/columns
      const { r1, r2, c1, c2 } = selectionModel.currentSelection();

      if (this._moveData.region === 'column-header') {
        const startColumn = this._moveData.column;
        const endColumn = grid.columnAt('body', vx);
        model.moveColumn(startColumn, endColumn);
        // select the row that was just moved
        selectionModel.select({
          r1,
          r2,
          c1: endColumn,
          c2: endColumn,
          cursorRow: r1,
          cursorColumn: c1,
          clear: 'all'
        });
      } else if (this._moveData.region === 'row-header') {
        const startRow = this._moveData.row;
        const endRow = grid.rowAt('body', vy);
        model.moveRow(startRow, endRow);

        // select the row that was just moved
        selectionModel.select({
          r1: endRow,
          r2: endRow,
          c1,
          c2,
          cursorRow: r1,
          cursorColumn: c1,
          clear: 'all'
        });
      }

      if (this.pressData) {
        if (
          this.pressData.type === 'column-resize' ||
          this.pressData.type === 'row-resize'
        ) {
          this._resizeSignal.emit(null);
        }
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
    this._rightClickSignal.emit(hit);
  }
  private _grid: DataGrid;
  private _event: MouseEvent;
  private _cursor: string | null;
  private _moveData: MoveData | null;
  private _rightClickSignal = new Signal<this, DataGrid.HitTestResult>(this);
  private _resizeSignal = new Signal<this, null>(this);
  private _selectionIndex: number;
}

export type MoveData = {
  /**
   * The descriminated type for the data.
   */
  readonly type: 'move';

  /**
   * The region which holds the section being moved.
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

export declare namespace RichMouseHandler {
  export interface IOptions {
    grid: DataGrid;
  }
}
