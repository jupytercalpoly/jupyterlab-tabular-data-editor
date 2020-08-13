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
import { renderSelection, IBoundingRegion, BoundedDrag } from './selection';
import { EditorModel } from './newmodel';
import { DSVEditor } from './widget';
import HeaderCellEditor from './headercelleditor';

export class RichMouseHandler extends BasicMouseHandler {
  private _moveLine: BoundedDrag;
  private _lastHoverRegion: 'ghostRow' | 'ghostColumn' | 'other';
  constructor(options: RichMouseHandler.IOptions) {
    super();
    this._grid = options.grid;
    this._cursor = null;
  }

  get ghostHoverSignal(): Signal<this, 'ghostRow' | 'ghostColumn' | 'other'> {
    return this._ghostHoverSignal;
  }

  get resizeSignal(): Signal<this, null> {
    return this._resizeSignal;
  }

  get clickSignal(): Signal<this, DataGrid.HitTestResult> {
    return this._clickSignal;
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
      leftBound = left + this._grid.headerWidth;
      rightBound =
        leftBound +
        Math.min(this._grid.pageWidth, this._grid.bodyWidth) -
        shadowWidth;
    } else if (region === 'row-header') {
      // x-axis bounds are the same
      leftBound = rightBound = leftSide;

      // Get the vertical bounds (measured from the top).
      const shadowHeight = Math.abs(topSide - bottomSide);
      topBound = top + this._grid.headerHeight;
      bottomBound =
        topBound +
        Math.min(this._grid.pageHeight, this._grid.bodyHeight) -
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
   * @param region The current region
   */
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

  /**
   * Called from the cursorForHandle function to enable grab cursor by region
   */
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

  /**
   * @override
   * @param grid
   * @param event
   */
  onMouseHover(grid: DataGrid, event: MouseEvent): void {
    // See if we are on a ghost row or ghost column.
    const { row, column } = grid.hitTest(event.clientX, event.clientY);
    let hoverRegion: 'ghostRow' | 'ghostColumn' | 'other';
    if (row === grid.dataModel.rowCount('body') - 1) {
      hoverRegion = 'ghostRow';
    } else if (column === grid.dataModel.columnCount('body') - 1) {
      hoverRegion = 'ghostColumn';
    } else {
      hoverRegion = 'other';
    }
    if (this._lastHoverRegion !== hoverRegion) {
      this.ghostHoverSignal.emit(hoverRegion);
    }
    this._lastHoverRegion = hoverRegion;
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
    let update: DSVEditor.ModelChangedArgs;
    if (this._lastHoverRegion === 'ghostRow') {
      update = model.addRows('body', model.rowCount('body') - 1);
      model.onChangedSignal.emit(update);
      return;
    }
    if (this._lastHoverRegion === 'ghostColumn') {
      update = model.addColumns('body', model.columnCount('body') - 1);
      model.onChangedSignal.emit(update);
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
      topSide = top + this._grid.headerHeight;
      bottomSide =
        top +
        Math.min(
          this._grid.pageHeight + this._grid.headerHeight,
          this._grid.bodyHeight + this._grid.headerHeight
        );
      leftSide =
        left +
        this._grid.headerWidth +
        this._grid.columnOffset('body', index) -
        this._grid.scrollX;
      rightSide = leftSide + this._grid.columnSize('body', index);
    } else if (region === 'row-header') {
      topSide =
        top +
        this._grid.headerHeight +
        this._grid.rowOffset('body', index) -
        this._grid.scrollY;
      bottomSide = topSide + this._grid.rowSize('body', index);
      leftSide = left + this._grid.headerWidth;
      rightSide =
        left +
        Math.min(
          this._grid.pageWidth + this._grid.headerWidth,
          this._grid.headerWidth + this._grid.bodyWidth
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
    this._resizeSignal.emit(null);
    // Fetch the press data.
    if (this._moveData) {
      this.updateLinePosition(event);
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
  updateLinePosition(event: MouseEvent): void {
    // find the region we originally clicked on.
    const { region } = this._moveData;

    // Get boundaries of the previous row or column we were over.
    const previousSection = this.getRowOrColumnSection(
      region,
      this._selectionIndex
    );

    // Unpack the row and column bounds.
    const { topSide, bottomSide, leftSide, rightSide } = previousSection;
    const {
      topBound,
      bottomBound,
      leftBound,
      rightBound
    } = this.computeGridBoundingRegion(region, previousSection);

    // see if we have crossed the boundary to a neighboring row/column
    switch (region) {
      case 'column-header': {
        const columnWidth = Math.abs(leftSide - rightSide);
        // bail early if we are still within the bounds or outside of the grid viewport
        if (
          (leftSide < event.clientX && event.clientX < rightSide) ||
          (event.clientX < leftBound ||
            rightBound + columnWidth < event.clientX)
        ) {
          return;
        } else if (event.clientX < leftSide) {
          // we are at the previous column, get the new region
          this._selectionIndex--;
          const { leftSide, topSide } = this.getRowOrColumnSection(
            region,
            this._selectionIndex
          );
          this._moveLine.manualPositionUpdate(leftSide - 1, topSide);
        } else {
          // check to ensure selection index stays within the bounds of the grid's columns
          if (this._selectionIndex <= this._grid.columnCount('body') - 1) {
            this._selectionIndex++;
          }

          // we are at the next column, get the new region
          const { topSide, rightSide } = this.getRowOrColumnSection(
            region,
            this._selectionIndex
          );
          this._moveLine.manualPositionUpdate(rightSide - 1, topSide);
        }
        break;
      }
      case 'row-header': {
        const rowHeight = Math.abs(topSide - bottomSide);
        // bail early if we are still within the bounds or outside of the grid viewport
        if (
          (topSide < event.clientY && event.clientY < bottomSide) ||
          (event.clientY < topBound || bottomBound + rowHeight < event.clientY)
        ) {
          return;
        } else if (event.clientY < topSide) {
          // we are at the previous row, get the new region
          this._selectionIndex--;
          const { leftSide, topSide } = this.getRowOrColumnSection(
            region,
            this._selectionIndex
          );
          this._moveLine.manualPositionUpdate(leftSide, topSide - 1);
        } else {
          // check to ensure selection index stays within the bounds of the grid's rows
          if (this._selectionIndex <= this._grid.rowCount('body') - 1) {
            this._selectionIndex++;
          }

          // we are at the next column, get the new region
          const { bottomSide, leftSide } = this.getRowOrColumnSection(
            region,
            this._selectionIndex
          );
          this._moveLine.manualPositionUpdate(leftSide, bottomSide - 1);
        }
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
    // emit the current mouse position to the Editor
    this._event = event;
    const hit = grid.hitTest(event.clientX, event.clientY);
    this._clickSignal.emit(hit);
    // if move data exists, handle the move first
    if (this._moveData) {
      const model = grid.dataModel as EditorModel;
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
    this._clickSignal.emit(hit);

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
  private _clickSignal = new Signal<this, DataGrid.HitTestResult>(this);
  private _resizeSignal = new Signal<this, null>(this);
  private _ghostHoverSignal = new Signal<
    this,
    'ghostRow' | 'ghostColumn' | 'other'
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
