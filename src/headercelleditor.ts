import {
  TextCellEditor,
  CellEditor,
  DataGrid,
  TextRenderer,
  CellRenderer,
  GraphicsContext
} from '@lumino/datagrid';

export class HeaderCellEditor extends TextCellEditor {
  /**
   * Edit a cell.
   */
  /**
   * Compute cell rectangle and return with other cell properties.
   */
  protected getCellInfo(cell: CellEditor.CellConfig): ICellInfo {
    const { grid, row, column } = cell;
    const data = grid.dataModel.data('column-header', row, column);

    const columnX =
      grid.headerWidth - grid.scrollX + grid.columnOffset('body', column);
    const rowY = 0;
    const width = grid.columnSize('body', column);
    const height = grid.headerHeight;

    return {
      grid: grid,
      row: row,
      column: column,
      data: data,
      x: columnX,
      y: rowY,
      width: width,
      height: height
    };
  }

  /**
   * Reposition cell editor by moving viewport occluder and cell editor container.
   */
  protected updatePosition(): void {
    const grid = this.cell.grid;
    const cellInfo = this.getCellInfo(this.cell);
    const headerHeight = grid.headerHeight;
    const headerWidth = grid.headerWidth;

    this.viewportOccluder.style.top = '0' + 'px';
    this.viewportOccluder.style.left = headerWidth + 'px';
    this.viewportOccluder.style.width = grid.viewportWidth - headerWidth + 'px';
    this.viewportOccluder.style.height =
      grid.viewportHeight - headerHeight + 'px';
    this.viewportOccluder.style.position = 'absolute';

    this.editorContainer.style.left = cellInfo.x - 1 - headerWidth + 'px';
    this.editorContainer.style.top = cellInfo.y + 'px';
    this.editorContainer.style.width = cellInfo.width + 1 + 'px';
    this.editorContainer.style.height = headerHeight + 1 + 'px';
    this.editorContainer.style.visibility = 'visible';
    this.editorContainer.style.position = 'absolute';
  }
}

export class HeaderTextRenderer extends TextRenderer {
  constructor(options: HeaderTextRenderer.IOptions) {
    super(options);
    this._headerIndent = options.indent;
    this._dataDetection = options.dataDetection;
  }
  paint(gc: GraphicsContext, config: CellRenderer.CellConfig): void {
    if (this._dataDetection) {
      let x = config.x;
      x += this._headerIndent;
      super.paint(gc, { ...config, x });
      return;
    }
    super.paint(gc, config);
  }
  private _headerIndent: number;
  private _dataDetection: boolean;
}

/**
 * A type alias for cell properties.
 */
export type ICellInfo = {
  grid: DataGrid;
  row: number;
  column: number;
  data: any;
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * HeaderRenderer statics.
 */
export namespace HeaderTextRenderer {
  export interface IOptions extends TextRenderer.IOptions {
    indent: number;
    dataDetection: boolean;
  }
}
