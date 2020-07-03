import { ActivityMonitor } from '@jupyterlab/coreutils';

import {
  ABCWidgetFactory,
  DocumentRegistry,
  IDocumentWidget,
  DocumentWidget
} from '@jupyterlab/docregistry';

import { PromiseDelegate } from '@lumino/coreutils';
import { GridSearchService, TextRenderConfig } from 'tde-csvviewer';

import {
  BasicKeyHandler,
  BasicMouseHandler,
  BasicSelectionModel,
  DataGrid,
  TextRenderer,
  CellEditor,
  ICellEditor
} from '@lumino/datagrid';

import { Message } from '@lumino/messaging';

import { PanelLayout, Widget } from '@lumino/widgets';
import CSVTextCellEditor from './editor';
import EditableDSVModel from './model';

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
      this._grid.editorController!.setEditor(
        'string',
        (config: CellEditor.CellConfig): ICellEditor => {
          return new CSVTextCellEditor();
        }
      );
      this._revealed.resolve(undefined);
      // Throttle the rendering rate of the widget.
      this._monitor = new ActivityMonitor({
        signal: context.model.contentChanged,
        timeout: RENDER_TIMEOUT
      });
      this._monitor.activityStopped.connect(this._updateGrid, this);
      console.log('editable boolean', this._grid.editable);
    });
    this._grid.editingEnabled = true;
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
  protected _updateGrid() {
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

// Override the CSVViewer's _updateGrid method to set the datagrid's model to an EditableDataModel

export class EditableCSVDocumentWidget extends DocumentWidget<
  EditableCSVViewer
> {
  constructor(options: EditableCSVDocumentWidget.IOptions) {
    let { context, content, reveal } = options;
    content = content || new EditableCSVViewer({ context });
    reveal = Promise.all([reveal, content.revealed]);
    super(Object.assign({ context, content, reveal }));
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
