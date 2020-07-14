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

  release() {
    if (this._moveData) {
      this._moveData.override.dispose();
      this._moveData = null;
    }
    super.release();
  }
  handleGrabbing(): void {
    const hit = this._grid.hitTest(this._event.clientX, this._event.clientY);
    const { region, row, column } = hit;
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
        console.log(vx);
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

/**
 * The namespace for the module implementation details.
 */
namespace Private {
  /**
   * A type alias for the row resize data.
   */
  export type RowResizeData = {
    /**
     * The descriminated type for the data.
     */
    readonly type: 'row-resize';

    /**
     * The row region which holds the section being resized.
     */
    readonly region: DataModel.RowRegion;

    /**
     * The index of the section being resized.
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

  /**
   * A type alias for the column resize data.
   */
  export type ColumnResizeData = {
    /**
     * The descriminated type for the data.
     */
    readonly type: 'column-resize';

    /**
     * The column region which holds the section being resized.
     */
    readonly region: DataModel.ColumnRegion;

    /**
     * The index of the section being resized.
     */
    readonly index: number;

    /**
     * The original size of the section.
     */
    readonly size: number;

    /**
     * The original client X position of the mouse.
     */
    readonly clientX: number;

    /**
     * The disposable to clear the cursor override.
     */
    readonly override: IDisposable;
  };

  /**
   * A type alias for the column resize data.
   */
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

  /**
   * A type alias for the select data.
   */
  export type SelectData = {
    /**
     * The descriminated type for the data.
     */
    readonly type: 'select';

    /**
     * The original region for the mouse press.
     */
    readonly region: DataModel.CellRegion;

    /**
     * The original row that was selected.
     */
    readonly row: number;

    /**
     * The original column that was selected.
     */
    readonly column: number;

    /**
     * The disposable to clear the cursor override.
     */
    readonly override: IDisposable;

    /**
     * The current local X position of the mouse.
     */
    localX: number;

    /**
     * The current local Y position of the mouse.
     */
    localY: number;

    /**
     * The timeout delay for the autoselect loop.
     */
    timeout: number;
  };

  /**
   * A type alias for the resize handler press data.
   */
  export type PressData =
    | RowResizeData
    | ColumnResizeData
    | RowMoveData
    | SelectData;

  /**
   * A type alias for the resize handle types.
   */
  export type ResizeHandle =
    | 'top'
    | 'left'
    | 'right'
    | 'bottom'
    | 'grab'
    | 'none';

  /**
   * Get the resize handle for a grid hit test.
   */
  export function resizeHandleForHitTest(
    hit: DataGrid.HitTestResult
  ): ResizeHandle {
    // Fetch the row and column.
    const r = hit.row;
    const c = hit.column;

    // Fetch the leading and trailing sizes.
    const lw = hit.x;
    const lh = hit.y;
    const tw = hit.width - hit.x;
    const th = hit.height - hit.y;

    // Set up the result variable.
    let result: ResizeHandle;

    // Dispatch based on hit test region.
    switch (hit.region) {
      case 'corner-header':
        if (c > 0 && lw <= 5) {
          result = 'left';
        } else if (tw <= 6) {
          result = 'right';
        } else if (r > 0 && lh <= 5) {
          result = 'top';
        } else if (th <= 6) {
          result = 'bottom';
        } else {
          result = 'none';
        }
        break;
      case 'column-header':
        if (c > 0 && lw <= 5) {
          result = 'left';
        } else if (tw <= 6) {
          result = 'right';
        } else if (r > 0 && lh <= 5) {
          result = 'top';
        } else if (th <= 6) {
          result = 'bottom';
        } else {
          result = 'grab';
        }
        break;
      case 'row-header':
        if (c > 0 && lw <= 5) {
          result = 'left';
        } else if (tw <= 6) {
          result = 'right';
        } else if (r > 0 && lh <= 5) {
          result = 'top';
        } else if (th <= 6) {
          result = 'bottom';
        } else {
          result = 'grab';
        }
        break;
      case 'body':
        result = 'none';
        break;
      case 'void':
        result = 'none';
        break;
      default:
        throw 'unreachable';
    }

    // Return the result.
    return result;
  }

  /**
   * Convert a resize handle into a cursor.
   */
  export function cursorForHandle(handle: ResizeHandle): string {
    return cursorMap[handle];
  }

  /**
   * A timer callback for the autoselect loop.
   *
   * @param grid - The datagrid of interest.
   *
   * @param data - The select data of interest.
   */
  export function autoselect(grid: DataGrid, data: SelectData): void {
    // Bail early if the timeout has been reset.
    if (data.timeout < 0) {
      return;
    }

    // Fetch the selection model.
    const model = grid.selectionModel;

    // Bail early if the selection model has been removed.
    if (!model) {
      return;
    }

    // Fetch the current selection.
    let cs = model.currentSelection();

    // Bail early if there is no current selection.
    if (!cs) {
      return;
    }

    // Fetch local X and Y coordinates of the mouse.
    const lx = data.localX;
    const ly = data.localY;

    // Set up the selection variables.
    const r1 = cs.r1;
    const c1 = cs.c1;
    let r2 = cs.r2;
    let c2 = cs.c2;
    const cursorRow = model.cursorRow;
    const cursorColumn = model.cursorColumn;
    const clear: SelectionModel.ClearMode = 'current';

    // Fetch the grid geometry.
    const hw = grid.headerWidth;
    const hh = grid.headerHeight;
    const vpw = grid.viewportWidth;
    const vph = grid.viewportHeight;

    // Fetch the selection mode.
    const mode = model.selectionMode;

    // Update the selection based on the hit region.
    if (data.region === 'row-header' || mode === 'row') {
      r2 += ly <= hh ? -1 : ly >= vph ? 1 : 0;
    } else if (data.region === 'column-header' || mode === 'column') {
      c2 += lx <= hw ? -1 : lx >= vpw ? 1 : 0;
    } else {
      r2 += ly <= hh ? -1 : ly >= vph ? 1 : 0;
      c2 += lx <= hw ? -1 : lx >= vpw ? 1 : 0;
    }

    // Update the current selection.
    model.select({ r1, c1, r2, c2, cursorRow, cursorColumn, clear });

    // Re-fetch the current selection.
    cs = model.currentSelection();

    // Bail if there is no selection.
    if (!cs) {
      return;
    }

    // Scroll the grid based on the hit region.
    if (data.region === 'row-header' || mode === 'row') {
      grid.scrollToRow(cs.r2);
    } else if (data.region === 'column-header' || mode === 'column') {
      grid.scrollToColumn(cs.c2);
    } else if (mode === 'cell') {
      grid.scrollToCell(cs.r2, cs.c2);
    }

    // Schedule the next call with the current timeout.
    setTimeout(() => {
      autoselect(grid, data);
    }, data.timeout);
  }

  /**
   * Compute the scroll timeout for the given delta distance.
   *
   * @param delta - The delta pixels from the origin.
   *
   * @returns The scaled timeout in milliseconds.
   */
  export function computeTimeout(delta: number): number {
    return 5 + 120 * (1 - Math.min(128, Math.abs(delta)) / 128);
  }

  /**
   * A mapping of resize handle to cursor.
   */
  const cursorMap = {
    top: 'ns-resize',
    left: 'ew-resize',
    right: 'ew-resize',
    bottom: 'ns-resize',
    grab: 'grab',
    none: 'default'
  };
}
