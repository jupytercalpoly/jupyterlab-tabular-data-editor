import { ActivityMonitor } from '@jupyterlab/coreutils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { PromiseDelegate } from '@lumino/coreutils';
import {
  BasicKeyHandler,
  BasicMouseHandler,
  BasicSelectionModel,
  DataGrid,
  TextRenderer,
  CellRenderer
} from '@lumino/datagrid';
import { Message } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import { PanelLayout, Widget } from '@lumino/widgets';
import { CSVViewer, TextRenderConfig } from '@jupyterlab/csvviewer';
import { DSVModel } from './model';
import EditableDataModel from './editabledatamodel';

/**
 * The class name added to a CSV viewer.
 */
const CSV_CLASS = 'jp-CSVViewer';

/**
 * The class name added to a CSV viewer datagrid.
 */
const CSV_GRID_CLASS = 'jp-CSVViewer-grid';

/**
 * The timeout to wait for change activity to have ceased before rendering.
 */
const RENDER_TIMEOUT = 1000;

/**
 * Search service remembers the search state and the location of the last
 * match, for incremental searching.
 * Search service is also responsible of providing a cell renderer function
 * to set the background color of cells matching the search text.
 */
export class GridSearchService {
  constructor(grid: DataGrid) {
    this._grid = grid;
    this._query = null;
    this._row = 0;
    this._column = -1;
  }

  /**
   * A signal fired when the grid changes.
   */
  get changed(): ISignal<GridSearchService, void> {
    return this._changed;
  }

  /**
   * Returns a cellrenderer config function to render each cell background.
   * If cell match, background is matchBackgroundColor, if it's the current
   * match, background is currentMatchBackgroundColor.
   */
  cellBackgroundColorRendererFunc(
    config: TextRenderConfig
  ): CellRenderer.ConfigFunc<string> {
    return ({ value, row, column }) => {
      if (this._query) {
        if ((value as string).match(this._query)) {
          if (this._row === row && this._column === column) {
            return config.currentMatchBackgroundColor;
          }
          return config.matchBackgroundColor;
        }
      }
      return '';
    };
  }

  /**
   * Clear the search.
   */
  clear() {
    this._query = null;
    this._row = 0;
    this._column = -1;
    this._changed.emit(undefined);
  }

  /**
   * incrementally look for searchText.
   */
  find(query: RegExp, reverse = false): boolean {
    const model = this._grid.dataModel!;
    const rowCount = model.rowCount('body');
    const columnCount = model.columnCount('body');

    if (this._query !== query) {
      // reset search
      this._row = 0;
      this._column = -1;
    }
    this._query = query;

    // check if the match is in current viewport

    const minRow = this._grid.scrollY / this._grid.defaultSizes.rowHeight;
    const maxRow =
      (this._grid.scrollY + this._grid.pageHeight) /
      this._grid.defaultSizes.rowHeight;
    const minColumn =
      this._grid.scrollX / this._grid.defaultSizes.columnHeaderHeight;
    const maxColumn =
      (this._grid.scrollX + this._grid.pageWidth) /
      this._grid.defaultSizes.columnHeaderHeight;
    const isInViewport = (row: number, column: number) => {
      return (
        row >= minRow &&
        row <= maxRow &&
        column >= minColumn &&
        column <= maxColumn
      );
    };

    const increment = reverse ? -1 : 1;
    this._column += increment;
    for (
      let row = this._row;
      reverse ? row >= 0 : row < rowCount;
      row += increment
    ) {
      for (
        let col = this._column;
        reverse ? col >= 0 : col < columnCount;
        col += increment
      ) {
        const cellData = model.data('body', row, col) as string;
        if (cellData.match(query)) {
          // to update the background of matching cells.

          // TODO: we only really need to invalidate the previous and current
          // cell rects, not the entire grid.
          this._changed.emit(undefined);

          if (!isInViewport(row, col)) {
            this._grid.scrollToRow(row);
          }
          this._row = row;
          this._column = col;
          return true;
        }
      }
      this._column = reverse ? columnCount - 1 : 0;
    }
    // We've finished searching all the way to the limits of the grid. If this
    // is the first time through (looping is true), wrap the indices and search
    // again. Otherwise, give up.
    if (this._looping) {
      this._looping = false;
      this._row = reverse ? 0 : rowCount - 1;
      this._wrapRows(reverse);
      try {
        return this.find(query, reverse);
      } finally {
        this._looping = true;
      }
    }
    return false;
  }

  /**
   * Wrap indices if needed to just before the start or just after the end.
   */
  private _wrapRows(reverse = false) {
    const model = this._grid.dataModel!;
    const rowCount = model.rowCount('body');
    const columnCount = model.columnCount('body');

    if (reverse && this._row <= 0) {
      // if we are at the front, wrap to just past the end.
      this._row = rowCount - 1;
      this._column = columnCount;
    } else if (!reverse && this._row >= rowCount - 1) {
      // if we are at the end, wrap to just before the front.
      this._row = 0;
      this._column = -1;
    }
  }

  get query(): RegExp | null {
    return this._query;
  }

  private _grid: DataGrid;
  private _query: RegExp | null;
  private _row: number;
  private _column: number;
  private _looping = true;
  private _changed = new Signal<GridSearchService, void>(this);
}

export class EditableCSVViewer extends Widget {
  dataModel: EditableDataModel;
  /**
   * Construct a new CSV viewer.
   */
  constructor(options: CSVViewer.IOptions) {
    super();

    const context = (this._context = options.context);
    const layout = (this.layout = new PanelLayout());

    this.addClass(CSV_CLASS);
    this.dataModel = new EditableDataModel();


    this._grid = new DataGrid({
      defaultSizes: {
        rowHeight: 24,
        columnWidth: 144,
        rowHeaderWidth: 64,
        columnHeaderHeight: 36
      }
    });
    this._grid.addClass(CSV_GRID_CLASS);
    this._grid.headerVisibility = 'all';
    this._grid.keyHandler = new BasicKeyHandler();
    this._grid.mouseHandler = new BasicMouseHandler();
    this._grid.copyConfig = {
      separator: '\t',
      format: DataGrid.copyFormatGeneric,
      headers: 'all',
      warningThreshold: 1e6
    };

    layout.addWidget(this._grid);

    this._searchService = new GridSearchService(this._grid);
    this._searchService.changed.connect(this._updateRenderer, this);

    void this._context.ready.then(() => {
      this._updateGrid();
      this._revealed.resolve(undefined);
      // Throttle the rendering rate of the widget.
      this._monitor = new ActivityMonitor({
        signal: context.model.contentChanged,
        timeout: RENDER_TIMEOUT
      });
      this._monitor.activityStopped.connect(this._updateGrid, this);
    });
  }

  /**
   * The CSV widget's context.
   */
  get context(): DocumentRegistry.Context {
    return this._context;
  }

  /**
   * A promise that resolves when the csv viewer is ready to be revealed.
   */
  get revealed() {
    return this._revealed.promise;
  }

  /**
   * The delimiter for the file.
   */
  get delimiter(): string {
    return this._delimiter;
  }
  set delimiter(value: string) {
    if (value === this._delimiter) {
      return;
    }
    this._delimiter = value;
    this._updateGrid();
  }

  /**
   * The style used by the data grid.
   */
  get style(): DataGrid.Style {
    return this._grid.style;
  }
  set style(value: DataGrid.Style) {
    this._grid.style = value;
  }

  /**
   * The config used to create text renderer.
   */
  set rendererConfig(rendererConfig: TextRenderConfig) {
    this._baseRenderer = rendererConfig;
    this._updateRenderer();
  }

  /**
   * The search service
   */
  get searchService(): GridSearchService {
    return this._searchService;
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this._monitor) {
      this._monitor.dispose();
    }
    super.dispose();
  }

  /**
   * Go to line
   */
  goToLine(lineNumber: number) {
    this._grid.scrollToRow(lineNumber);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.tabIndex = -1;
    this.node.focus();
  }

  /**
   * Create the model for the grid.
   */
  private _updateGrid(): void {
    const data: string = this._context.model.toString();
    const delimiter = this._delimiter;
    const oldModel = this._grid.dataModel as DSVModel;
    const dataModel = (this._grid.dataModel = new DSVModel({
      data,
      delimiter
    }));
    this._grid.selectionModel = new BasicSelectionModel({ dataModel });
    if (oldModel) {
      oldModel.dispose();
    }
  }

  /**
   * Update the renderer for the grid.
   */
  private _updateRenderer(): void {
    if (this._baseRenderer === null) {
      return;
    }
    const rendererConfig = this._baseRenderer;
    const renderer = new TextRenderer({
      textColor: rendererConfig.textColor,
      horizontalAlignment: rendererConfig.horizontalAlignment,
      backgroundColor: this._searchService.cellBackgroundColorRendererFunc(
        rendererConfig
      )
    });
    this._grid.cellRenderers.update({
      body: renderer,
      'column-header': renderer,
      'corner-header': renderer,
      'row-header': renderer
    });
  }

  private _context: DocumentRegistry.Context;
  private _grid: DataGrid;
  private _searchService: GridSearchService;
  private _monitor: ActivityMonitor<
    DocumentRegistry.IModel,
    void
  > | null = null;
  private _delimiter = ',';
  private _revealed = new PromiseDelegate<void>();
  private _baseRenderer: TextRenderConfig | null = null;
}
