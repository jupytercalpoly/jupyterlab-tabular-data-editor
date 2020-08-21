import { IDisposable } from '@lumino/disposable';
import {
  BasicMouseHandler,
  DataGrid,
  DataModel,
  ResizeHandle,
  CellEditor,
  ICellEditResponse,
  MutableDataModel
} from 'tde-datagrid';
import { Drag } from '@lumino/dragdrop';
import { Signal } from '@lumino/signaling';
import { renderSelection, IBoundingRegion, BoundedDrag } from './drag';
import { EditorModel } from './newmodel';
import { DSVEditor } from './widget';
import { HeaderCellEditor } from './headercelleditor';
// import { BasicKeyHandler } from 'tde-datagrid';

export class RichMouseHandler extends BasicMouseHandler {
  private _moveLine: BoundedDrag;
  private _currentHoverRegion: 'ghost-row' | 'ghost-column' | null;
  constructor(options: RichMouseHandler.IOptions) {
    super();
    this._grid = options.grid;
    this._cursor = null;
  }

  get hoverSignal(): Signal<this, 'ghost-row' | 'ghost-column' | null> {
    return this._ghostHoverSignal;
  }

  get mouseUpSignal(): Signal<this, DataGrid.HitTestResult> {
    return this._mouseUpSignal;
  }

  /**
   * Computes the bounding region for the grid (provides boundaries for the shadow/line when moving)
   * @param region The current region
   * @param shadowRegion The indexes for the rows/columns of the shadow region
   */
  computeGridBoundingRegion(
    region: DataModel.CellRegion | 'void',
    shadowRegion: RichMouseHandler.IRegion
  ): IBoundingRegion {
    // Unpack the parameters of the shadow region.
    const { topSide, bottomSide, leftSide, rightSide } = shadowRegion;

    // get the left and top offsets of the grid viewport
    const { left, top } = this._grid.viewport.node.getBoundingClientRect();

    // Set up bounding variables.
    let topBound: number;
    let bottomBound: number;
    let leftBound: number;
    let rightBound: number;

    if (region === 'column-header') {
      // No vertical movement. Fix to the top of the grid body.
      bottomBound = topBound = topSide;

      // Get the bounds for horizontal movement (measured from the left).
      const shadowWidth = Math.abs(leftSide - rightSide);
      const ghostColumnIndex = this._grid.dataModel.columnCount('body') - 1;
      leftBound = left + this._grid.headerWidth;
      rightBound =
        leftBound +
        Math.min(
          this._grid.pageWidth,
          this._grid.columnOffset('body', ghostColumnIndex)
        ) -
        shadowWidth;
    } else if (region === 'row-header') {
      // x-axis bounds are the same
      leftBound = rightBound = leftSide;

      // Get the vertical bounds (measured from the top).
      const shadowHeight = Math.abs(topSide - bottomSide);
      const ghostRowIndex = this._grid.dataModel.rowCount('body') - 1;
      topBound = top + this._grid.headerHeight;
      bottomBound =
        topBound +
        Math.min(
          this._grid.pageHeight,
          this._grid.rowOffset('body', ghostRowIndex)
        ) -
        shadowHeight;
    }
    return {
      topBound,
      bottomBound,
      leftBound,
      rightBound
    };
  }

  /**
   * @override
   * Returns the proper resize cursor type based on the region clicked
   * Calls cursorByRegion if no resize cursor is correct
   * @param area The current area "top" | "left" | "right" | "bottom" | "none"
   */
  cursorForHandle(area: ResizeHandle): string {
    // grab the current row/column
    const { region, row, column } = this._grid.hitTest(
      this._event.clientX,
      this._event.clientY
    );
    const model = this._grid.dataModel as EditorModel;

    // show the pointer cursor for the ghost row/column
    if (row === model.totalRows - 1 || column === model.totalColumns) {
      return (this._cursor = 'pointer');
    }

    const cursorMap = {
      top: 'ns-resize',
      left: 'ew-resize',
      right: 'ew-resize',
      bottom: 'ns-resize',
      none: this.cursorByRegion(region, row, column)
    };
    this._cursor = cursorMap[area];
    return this._cursor;
  }

  /**
   * Called from the cursorForHandle function to enable grab cursor by region
   * @param region The current region in the model
   * @param row The current row
   * @param column The current column
   */
  cursorByRegion(
    region: DataModel.CellRegion | 'void',
    row: number,
    column: number
  ): string {
    // display the grab cursor if the row/column is in the curent selection
    switch (region) {
      case 'row-header':
        return this._grid.selectionModel.isRowSelected(row)
          ? 'grab'
          : 'default';
      case 'column-header':
        return this._grid.selectionModel.isColumnSelected(column)
          ? 'grab'
          : 'default';
      default: {
        return 'default';
      }
    }
  }

  /**
   * @override
   * @param grid
   * @param event
   */
  onMouseHover(grid: DataGrid, event: MouseEvent): void {
    // See if we are on a ghost row or ghost column. If not, null
    const { row, column } = grid.hitTest(event.clientX, event.clientY);
    let hoverRegion: 'ghost-row' | 'ghost-column' | null = null;
    if (row === grid.dataModel.rowCount('body') - 1) {
      hoverRegion = 'ghost-row';
    } else if (column === grid.dataModel.columnCount('body') - 1) {
      hoverRegion = 'ghost-column';
    } else {
      hoverRegion = null;
    }
    if (this._currentHoverRegion !== hoverRegion) {
      this.hoverSignal.emit(hoverRegion);
    }
    this._currentHoverRegion = hoverRegion;
    this._event = event;
    super.onMouseHover(grid, event);
  }

  /**
   * @override
   * Handle the mouse down event for the data grid.
   * @param grid - The data grid of interest.
   * @param event - The mouse down event of interest.
   */
  onMouseDown(grid: DataGrid, event: MouseEvent): void {
    const model = grid.dataModel as EditorModel;

    // if the event was a left click and the hover region isn't null
    if (event.type === 'mousedown' && this._currentHoverRegion) {
      // Fetch the selection model.
      const selectionModel = grid.selectionModel;

      // Get the current selection.
      const selection = selectionModel.currentSelection();
      let update: DSVEditor.ModelChangedArgs;
      // add a row/column based on currentHoverRegion, get update object
      switch (this._currentHoverRegion) {
        case 'ghost-row': {
          update = model.addRows('body', model.rowCount('body') - 1);
          break;
        }
        case 'ghost-column': {
          update = model.addColumns('body', model.columnCount('body') - 1);
          break;
        }
      }
      update.selection = selection;
      model.onChangedSignal.emit(update);

      // Bail if there's no selection
      if (!selection) {
        return;
      }

      // Unpack the selection args.
      const { r1, r2, c1, c2 } = selection;
      // Remake the selection.
      selectionModel.select({
        r1,
        r2,
        c1,
        c2,
        cursorRow: c1,
        cursorColumn: c2,
        clear: 'all'
      });

      return;
    }
    super.onMouseDown(grid, event);
    if (this._cursor === 'grab') {
      this._cursor = 'grabbing';
      this.handleGrabbing();
    }
    return;
  }

  /**
   * @override
   */
  release(): void {
    if (this._moveData) {
      this._moveData.override.dispose();
      this._moveData = null;
    }
    super.release();
  }

  /**
   * Creates the shadow/line on the row/column that was grabbed
   */
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
    const shadowRegion = this.getRowOrColumnSection(
      region,
      this._selectionIndex
    );
    let { topSide, bottomSide, leftSide, rightSide } = shadowRegion;

    const boundingRegion = this.computeGridBoundingRegion(region, shadowRegion);
    renderSelection(
      topSide,
      bottomSide,
      leftSide,
      rightSide,
      this._event.clientX,
      this._event.clientY,
      boundingRegion,
      'shadow'
    );

    // set r1, r2, c1, c2 to the bounds for the dark line
    switch (region) {
      case 'column-header': {
        leftSide = leftSide - 1;
        rightSide = leftSide + 2;
        break;
      }
      case 'row-header': {
        topSide = topSide - 1;
        bottomSide = topSide + 2;
      }
    }

    // initialize the dark line
    this._moveLine = renderSelection(
      topSide,
      bottomSide,
      leftSide,
      rightSide,
      this._event.clientX,
      this._event.clientY
    );

    // Create the move data
    if (region === 'void') {
      return;
    }

    // Override the document cursor.
    const override = Drag.overrideCursor('grabbing');

    this._moveData = {
      type: 'move',
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

  getRowOrColumnSection(
    region: DataModel.CellRegion | 'void',
    index: number
  ): RichMouseHandler.IRegion {
    let topSide: number;
    let bottomSide: number;
    let leftSide: number;
    let rightSide: number;

    // get the left and top offsets of the grid viewport
    const { left, top } = this._grid.viewport.node.getBoundingClientRect();
    if (region === 'column-header') {
      // Get the index of the ghost row.
      const ghostRowIndex = this._grid.dataModel.rowCount('body') - 1;

      topSide = top + this._grid.headerHeight;
      // Add on to the topSide the distance to the ghost row, or the distance
      // to the bottom of the page if the full grid isn't in view.
      bottomSide =
        topSide +
        Math.min(
          this._grid.pageHeight,
          this._grid.rowOffset('body', ghostRowIndex)
        );
      leftSide =
        left +
        this._grid.headerWidth +
        this._grid.columnOffset('body', index) -
        this._grid.scrollX;
      rightSide = leftSide + this._grid.columnSize('body', index);
    } else if (region === 'row-header') {
      // Get the index of the ghost column.
      const ghostColumnIndex = this._grid.dataModel.columnCount('body') - 1;
      topSide =
        top +
        this._grid.headerHeight +
        this._grid.rowOffset('body', index) -
        this._grid.scrollY;
      bottomSide = topSide + this._grid.rowSize('body', index);
      leftSide = left + this._grid.headerWidth;
      // Add on to the leftSide the distance to the ghost column, or the distance
      // to the right of the page if the full grid isn't in view.
      rightSide =
        leftSide +
        Math.min(
          this._grid.pageWidth,
          this._grid.columnOffset('body', ghostColumnIndex)
        );
    }
    return { topSide, bottomSide, leftSide, rightSide };
  }

  /**
   * @override
   * Handle the mouse move event for the data grid.
   * @param grid - The data grid of interest.
   * @param event - The mouse move event of interest.
   */
  onMouseMove(grid: DataGrid, event: MouseEvent): void {
    // Fetch the press data.
    if (this._moveData) {
      this.updateLinePosition(event);
    } else {
      // model.ghostsRevealed = false;
      super.onMouseMove(grid, event);
      // model.ghostsRevealed = true;
    }
    return;
  }

  /**
   * Moves the line based on the position of the cursor and shadow
   * @param grid
   * @param event
   */
  updateLinePosition(event: MouseEvent): void {
    // find the region we originally clicked on.
    const { region, row, column } = this._moveData;

    // Get the body origin
    let { left, top } = this._grid.viewport.node.getBoundingClientRect();
    left += this._grid.headerWidth;
    top += this._grid.headerHeight;

    // Map the mouse loc to the virtual coordinates.
    const { vx, vy } = this._grid.mapToVirtual(event.clientX, event.clientY);

    // Fetch the current row and column.
    let currentColumn = this._grid.columnAt('body', vx);
    let currentRow = this._grid.rowAt('body', vy);

    // Bound the current row and current column to be within the non-ghost part of the grid.
    const maxRow = this._grid.dataModel.rowCount('body') - 2;
    const maxColumn = this._grid.dataModel.columnCount('body') - 2;
    if (currentRow > maxRow) {
      currentRow = maxRow;
    }
    if (currentColumn > maxColumn) {
      currentColumn = maxColumn;
    }

    switch (region) {
      case 'row-header': {
        const offset =
          row < currentRow
            ? this._grid.rowOffset('body', currentRow + 1)
            : this._grid.rowOffset('body', currentRow);
        this._moveLine.manualPositionUpdate(null, offset + top - 1.5);
        this._selectionIndex = currentRow;
        break;
      }
      case 'column-header': {
        const offset =
          column < currentColumn
            ? this._grid.columnOffset('body', currentColumn + 1)
            : this._grid.columnOffset('body', currentColumn);
        this._moveLine.manualPositionUpdate(offset + left - 1.5, null);
        this._selectionIndex = currentColumn;
        break;
      }
    }
  }

  /**
   * @override
   * @param grid
   * @param event
   */
  onMouseUp(grid: DataGrid, event: MouseEvent): void {
    this._event = event;
    const model = grid.dataModel as EditorModel;
    // emit the current mouse position to the Editor
    const hit = grid.hitTest(event.clientX, event.clientY);
    this._mouseUpSignal.emit(hit);
    // if move data exists, handle the move first
    if (this._moveData) {
      const selectionModel = this._grid.selectionModel;
      // we can assume there is a selection as it is necessary to move rows/columns
      const { r1, r2, c1, c2 } = selectionModel.currentSelection();
      let update: DSVEditor.ModelChangedArgs;
      if (this._moveData.region === 'column-header') {
        const startColumn = this._moveData.column;
        const endColumn = this._selectionIndex;
        update = model.moveColumns('body', startColumn, endColumn, 1);
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
        const endRow = this._selectionIndex;
        update = model.moveRows('body', startRow, endRow, 1);

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
      if (update) {
        // Add the selection to the update.
        update.selection = { r1, r2, c1, c2 };

        // Emit the update.
        model.onChangedSignal.emit(update);
      }
    }
    this.release();
    return;
  }

  /**
   * Handle the context menu event for the data grid.
   * @param grid - The data grid of interest.
   * @param event - The context menu event of interest.
   */
  onContextMenu(grid: DataGrid, event: MouseEvent): void {
    const { clientX, clientY } = event;
    const hit = grid.hitTest(clientX, clientY);
    this._mouseUpSignal.emit(hit);

    // if the right click is in the current selection, return
    if (
      this._grid.selectionModel.isRowSelected(hit.row) &&
      this._grid.selectionModel.isColumnSelected(hit.column)
    ) {
      return;
    }
    // otherwise select the respective row/column/cell
    this.onMouseDown(grid, event);
  }

  /**
   * Handles a double click event
   */
  onMouseDoubleClick(grid: DataGrid, event: MouseEvent): void {
    const { region, row, column } = grid.hitTest(event.clientX, event.clientY);

    // need to subtract by 3 (1 for the actual ghost row/column, 2 for the double click)
    const clickedGhostRow: boolean = row === grid.rowCount('body') - 3;
    const clickedGhostColumn: boolean = column === grid.columnCount('body') - 3;

    // Bail if the user tried to double clicked inside of a ghost row/column
    if (clickedGhostRow || clickedGhostColumn) {
      return;
    }

    if (region === 'column-header') {
      if (grid.editable) {
        const cell: CellEditor.CellConfig = {
          grid: grid,
          row: row,
          column: column
        };

        // Define a callback to handle entering data into the column header.
        const onCommit = (response: ICellEditResponse): void => {
          const cell = response.cell;
          if (!cell) {
            return;
          }
          const grid = cell.grid;
          const dataModel = grid.dataModel as MutableDataModel;
          dataModel.setData(
            'column-header',
            cell.row,
            cell.column,
            response.value
          );
          grid.viewport.node.focus();
          if (response.cursorMovement !== 'none') {
            grid.moveCursor(response.cursorMovement);
            grid.scrollToCursor();
          }
        };

        // Define the Header editor.
        const editor = new HeaderCellEditor();

        // Begin editing the cell.
        grid.editorController.edit(cell, { editor, onCommit });
      }
    }

    super.onMouseDoubleClick(grid, event);
  }

  private _grid: DataGrid;
  private _event: MouseEvent;
  private _cursor: string | null;
  private _moveData: MoveData | null;
  private _mouseUpSignal = new Signal<this, DataGrid.HitTestResult>(this);
  private _ghostHoverSignal = new Signal<
    this,
    'ghost-row' | 'ghost-column' | null
  >(this);
  private _selectionIndex: number; // The index of the row/column where the move line is present
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

  /**
   * The coordinates for a rectangular region.
   */
  export interface IRegion {
    topSide: number; // Measured from the top of the screen.
    bottomSide: number; // Measured from the top of the screen.
    leftSide: number; // Measured from the left of the screen.
    rightSide: number; // Measured from the left of the screen.
  }
}
