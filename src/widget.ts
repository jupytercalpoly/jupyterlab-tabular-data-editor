import { ActivityMonitor } from '@jupyterlab/coreutils';

import {
  ABCWidgetFactory,
  DocumentRegistry,
  IDocumentWidget,
  DocumentWidget
} from '@jupyterlab/docregistry';

import { PromiseDelegate } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';
import { GridSearchService, TextRenderConfig } from 'tde-csvviewer';

import {
  BasicKeyHandler,
  // BasicMouseHandler,
  BasicSelectionModel,
  DataGrid,
  TextRenderer
  // CellEditor,
  // ICellEditor
} from '@lumino/datagrid';

import { Message } from '@lumino/messaging';
import { PanelLayout, Widget } from '@lumino/widgets';
import EditableDSVModel from './model';
import RichMouseHandler from './handler';

const CSV_CLASS = 'jp-CSVViewer';
const CSV_GRID_CLASS = 'jp-CSVViewer-grid';
const RENDER_TIMEOUT = 1000;

export class EditableCSVViewer extends Widget {
  /**
   * Construct a new CSV viewer.
   */
  constructor(options: EditableCSVViewer.IOptions) {
    super();

    const context = (this._context = options.context);
    const layout = (this.layout = new PanelLayout());

    this.addClass(CSV_CLASS);
    this._grid = new DataGrid({
      defaultSizes: {
        rowHeight: 24,
        columnWidth: 144,
        rowHeaderWidth: 64,
        columnHeaderHeight: 36
      },
      headerVisibility: 'none'
    });

    this._grid.addClass(CSV_GRID_CLASS);
    this._grid.headerVisibility = 'all';
    this._grid.keyHandler = new BasicKeyHandler();
    this._grid.copyConfig = {
      separator: '\t',
      format: DataGrid.copyFormatGeneric,
      headers: 'all',
      warningThreshold: 1e6
    };
    const handler = new RichMouseHandler();
    this._grid.mouseHandler = handler;
    handler.rightClickSignal.connect(this._onRightClick, this);

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
    this._grid.editingEnabled = true;
    this.addRowSignal.connect(this._addRow, this);
    this.addColSignal.connect(this._addCol, this);
    this.removeRowSignal.connect(this._removeRow, this);
    this.removeColSignal.connect(this._removeCol, this);
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

  get coords(): Array<number> {
    return [this._row, this._column];
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
   * The DataModel used to render the DataGrid
   */
  get dataModel(): EditableDSVModel {
    return this._grid.dataModel as EditableDSVModel;
  }

  get addRowSignal(): Signal<this, void> {
    return this._addRowSignal;
  }
  get addColSignal(): Signal<this, void> {
    return this._addColSignal;
  }

  get removeRowSignal(): Signal<this, void> {
    return this._removeRowSignal;
  }

  get removeColSignal(): Signal<this, void> {
    return this._removeColSignal;
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
  goToLine(lineNumber: number): void {
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
  protected _updateGrid(): void {
    const data = this._context.model.toString();
    const delimiter = ',';
    const oldModel = this._grid.dataModel as EditableDSVModel;
    const dataModel = (this._grid.dataModel = new EditableDSVModel({
      data,
      delimiter
    }));
    this._grid.selectionModel = new BasicSelectionModel({ dataModel });
    if (oldModel && oldModel.dsvModel) {
      oldModel.dsvModel.dispose();
    }
    dataModel.onChangedSignal.connect(this._updateModel, this);
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

  private _updateModel(this: EditableCSVViewer): void {
    const dataModel = this._grid.dataModel as EditableDSVModel;
    this.context.model.fromString(dataModel.dsvModel.rawData);
  }

  private _addRow(this: EditableCSVViewer): void {
    this.dataModel.addRow(this._row);
  }

  private _addCol(this: EditableCSVViewer): void {
    this.dataModel.addColumn(this._column);
  }

  private _removeRow(this: EditableCSVViewer): void {
    this.dataModel.removeRow(this._row);
  }

  private _removeCol(this: EditableCSVViewer): void {
    this.dataModel.removeCol(this._column);
  }

  private _onRightClick(
    emitter: RichMouseHandler,
    coords: Array<number>
  ): void {
    [this._row, this._column] = coords;
  }

  private _row: number | null;
  private _column: number | null;
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

  // Signals for basic editing functionality
  private _addRowSignal: Signal<this, void> = new Signal<this, void>(this);
  private _addColSignal: Signal<this, void> = new Signal<this, void>(this);
  private _removeRowSignal: Signal<this, void> = new Signal<this, void>(this);
  private _removeColSignal: Signal<this, void> = new Signal<this, void>(this);
}

// Override the CSVViewer's _updateGrid method to set the datagrid's model to an EditableDataModel

export class EditableCSVDocumentWidget extends DocumentWidget<
  EditableCSVViewer
> {
  constructor(options: EditableCSVDocumentWidget.IOptions) {
    let { content, reveal } = options;
    const { context, ...other } = options;
    content = content || new EditableCSVViewer({ context });
    reveal = Promise.all([reveal, content.revealed]);
    super({ context, content, reveal, ...other });
  }

  /**
   * Set URI fragment identifier for rows
   */
  setFragment(fragment: string): void {
    const parseFragments = fragment.split('=');

    // TODO: expand to allow columns and cells to be selected
    // reference: https://tools.ietf.org/html/rfc7111#section-3
    if (parseFragments[0] !== '#row') {
      return;
    }

    // multiple rows, separated by semi-colons can be provided, we will just
    // go to the top one
    let topRow = parseFragments[1].split(';')[0];

    // a range of rows can be provided, we will take the first value
    topRow = topRow.split('-')[0];

    // go to that row
    void this.context.ready.then(() => {
      this.content.goToLine(Number(topRow));
    });
  }
}
export declare namespace EditableCSVDocumentWidget {
  interface IOptions
    extends DocumentWidget.IOptionsOptionalContent<EditableCSVViewer> {
    delimiter?: string;
  }
}

export class EditableCSVViewerFactory extends ABCWidgetFactory<
  IDocumentWidget<EditableCSVViewer>
> {
  createNewWidget(
    context: DocumentRegistry.Context
  ): IDocumentWidget<EditableCSVViewer> {
    return new EditableCSVDocumentWidget({ context });
  }
}
export namespace EditableCSVViewer {
  /**
   * Instantiation options for CSV widgets.
   */
  export interface IOptions {
    /**
     * The document context for the CSV being rendered by the widget.
     */
    context: DocumentRegistry.Context;
  }
}
