import { CommandToolbarButton } from '@jupyterlab/apputils';
import { ActivityMonitor } from '@jupyterlab/coreutils';
import {
  ABCWidgetFactory,
  DocumentRegistry,
  IDocumentWidget,
  DocumentWidget
} from '@jupyterlab/docregistry';
import { PromiseDelegate } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';
import { TextRenderConfig } from 'tde-csvviewer';
import {
  BasicKeyHandler,
  BasicSelectionModel,
  DataGrid,
  TextRenderer,
  SelectionModel,
  DataModel
} from 'tde-datagrid';
import { Message } from '@lumino/messaging';
import { PanelLayout, Widget } from '@lumino/widgets';
import { EditorModel } from './model';
import { RichMouseHandler } from './handler';
import { toArray } from '@lumino/algorithm';
import { CommandRegistry } from '@lumino/commands';
import { CommandIDs } from './index';
import { VirtualDOM, h } from '@lumino/virtualdom';
import { GridSearchService } from './searchservice';
import { Litestore } from './litestore';
import { Fields } from '@lumino/datastore';

const CSV_CLASS = 'jp-CSVViewer';
const CSV_GRID_CLASS = 'jp-CSVViewer-grid';
const COLUMN_HEADER_CLASS = 'jp-column-header';
const ROW_HEADER_CLASS = 'jp-row-header';
const BACKGROUND_CLASS = 'jp-background';
const RENDER_TIMEOUT = 1000;

export class EditableCSVViewer extends Widget {
  private _background: HTMLElement;
  private _region: any;
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
        rowHeight: 28,
        columnWidth: 144,
        rowHeaderWidth: 64,
        columnHeaderHeight: 32
      },
      headerVisibility: 'none'
    });

    this._grid.addClass(CSV_GRID_CLASS);
    this._grid.headerVisibility = 'all';
    this._grid.keyHandler = new BasicKeyHandler();
    this._grid.copyConfig = {
      separator: '\t',
      format: DataGrid.copyFormatGeneric,
      headers: 'none',
      warningThreshold: 1e6
    };
    const handler = new RichMouseHandler({ grid: this._grid });
    this._grid.mouseHandler = handler;
    handler.rightClickSignal.connect(this._onRightClick, this);
    handler.resizeSignal.connect(this._onResize, this);
    layout.addWidget(this._grid);

    // init search service to search for matches with the data grid
    this._searchService = new GridSearchService(this._grid);
    this._searchService.changed.connect(this._updateRenderer, this);

    // add the background column and row header elements
    this._background = VirtualDOM.realize(
      h.div({
        className: BACKGROUND_CLASS,
        style: {
          position: 'absolute',
          zIndex: '1'
        }
      })
    );

    this._rowHeader = VirtualDOM.realize(
      h.div({
        className: ROW_HEADER_CLASS,
        style: {
          position: 'absolute',
          zIndex: '2'
        }
      })
    );
    this._columnHeader = VirtualDOM.realize(
      h.div({
        className: COLUMN_HEADER_CLASS,
        style: {
          position: 'absolute',
          zIndex: '2'
        }
      })
    );
    // append the column and row headers to the viewport
    this._grid.viewport.node.appendChild(this._rowHeader);
    this._grid.viewport.node.appendChild(this._columnHeader);
    this._grid.viewport.node.appendChild(this._background);

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
    this.changeModelSignal.connect(this._changeModel, this);
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
  get revealed(): Promise<void> {
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

  get coords(): Array<number | null> {
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
  get dataModel(): EditorModel {
    return this._grid.dataModel as EditorModel;
  }

  get litestore(): Litestore {
    return this._litestore;
  }

  get changeModelSignal(): Signal<this, string> {
    return this._changeModelSignal;
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
   * Guess the row delimiter if it was not supplied.
   * This will be fooled if a different line delimiter possibility appears in the first row.
   */
  // private _guessRowDelimeter(data: string): string {
  //   const i = data.slice(0, 5000).indexOf('\r');
  //   if (i === -1) {
  //     return '\n';
  //   } else if (data[i + 1] === '\n') {
  //     return '\r\n';
  //   } else {
  //     return '\r';
  //   }
  // }

  // /**
  //  * Counts the occurrences of a substring from a given string
  //  */
  // private _countOccurrences(
  //   string: string,
  //   substring: string,
  //   rowDelimiter: string
  // ): number {
  //   let numCol = 0;
  //   let pos = 0;
  //   const l = substring.length;
  //   const firstRow = string.slice(0, string.indexOf(rowDelimiter));

  //   pos = firstRow.indexOf(substring, pos);
  //   while (pos !== -1) {
  //     numCol++;
  //     pos += l;
  //     pos = firstRow.indexOf(substring, pos);
  //   }
  //   // number of columns is the amount of columns + 1
  //   return numCol + 1;
  // }

  // /**
  //  * Adds the a column header of alphabets to the top of the data (A..Z,AA..ZZ,AAA...)
  //  * @param colDelimiter The delimiter used to separated columns (commas, tabs, spaces)
  //  */
  // protected _buildColHeader(colDelimiter: string): string {
  //   const rawData = this._context.model.toString();
  //   const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  //   // when the model is first created, we don't know how many columns or what the row delimeter is
  //   const rowDelimiter = this._guessRowDelimeter(rawData);
  //   const numCol = this._countOccurrences(rawData, colDelimiter, rowDelimiter);

  //   // if only single alphabets fix the string
  //   if (numCol <= 26) {
  //     return (
  //       alphabet
  //         .slice(0, numCol)
  //         .split('')
  //         .join(colDelimiter) + rowDelimiter
  //     );
  //   }
  //   // otherwise compute the column header with multi-letters (AA..)
  //   else {
  //     // get all single letters
  //     let columnHeader = alphabet.split('').join(colDelimiter);
  //     // find the rest
  //     for (let i = 27; i < numCol; i++) {
  //       columnHeader += colDelimiter + numberToCharacter(i);
  //     }
  //     return columnHeader + rowDelimiter;
  //   }
  // }

  /**
   * Create the model for the grid.
   */
  protected _updateGrid(): void {
    const delimiter = this.delimiter;
    const model = this._grid.dataModel as EditorModel;
    let data: string;

    if (!model) {
      data = this._context.model.toString();
      const dataModel = (this._grid.dataModel = new EditorModel({
        data,
        delimiter
      }));
      this._grid.selectionModel = new BasicSelectionModel({ dataModel });

      // create litestore
      this._litestore = new Litestore({
        id: 0,
        schemas: [EditableCSVViewer.DATAMODEL_SCHEMA]
      });

      // set inital status of litestore
      this._litestore.beginTransaction();
      this.updateLitestore('initial update');
      this._litestore.endTransaction();
    }
    // update the position of the background row and column headers
    this._background.style.width = `${this._grid.viewportWidth}px`;
    this._background.style.height = `${this._grid.viewportHeight}px`;
    this._columnHeader.style.left = `${this._grid.headerWidth}px`;
    this._columnHeader.style.height = `${this._grid.headerHeight}px`;
    this._columnHeader.style.width = `${this._grid.viewportWidth}px`;
    this._rowHeader.style.top = `${this._grid.headerHeight}px`;
    this._rowHeader.style.width = `${this._grid.headerWidth}px`;
    this._rowHeader.style.height = `${this._grid.viewportHeight}px`;
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

  /**
   * Saves the file
   */
  private _save(): void {
    this.context.save();
  }

  /**
   * Handles all changes to the data model
   * @param emitter
   * @param type
   */
  private _changeModel(emitter: EditableCSVViewer, type: string): void {
    const selectionModel = this._grid.selectionModel;
    const selection = selectionModel.currentSelection();
    let r1, r2, c1, c2: number;

    // grab selection if it exists
    if (selection) {
      r1 = selection.r1;
      r2 = selection.r2;
      c1 = selection.c1;
      c2 = selection.c2;
    }

    switch (type) {
      case 'insert-row-above': {
        this.dataModel.addRows(this._region, this._row);
        break;
      }
      case 'insert-row-below': {
        this.dataModel.addRows(this._region, this._row + 1);

        if (!selection) {
          break;
        }
        this.dataModel.addRow(this._row + 1, type);
        // move the selection down a row to account for the new row being inserted
        selectionModel.select({
          r1: r1 + 1,
          r2: r2 + 1,
          c1,
          c2,
          cursorRow: r1,
          cursorColumn: c1,
          clear: 'all'
        });
        break;
      }
      case 'insert-column-left': {
        this.dataModel.addColumns(this._region, this._column);
        break;
      }
      case 'insert-column-right': {
        this.dataModel.addColumns(this._region, this._column + 1);

        if (!selection) {
          break;
        }
        this.dataModel.addColumn(this._column + 1, type);

        // move the selection down a row to account for the new column being inserted
        selectionModel.select({
          r1,
          r2,
          c1: c1 + 1,
          c2: c2 + 1,
          cursorRow: r1,
          cursorColumn: c1,
          clear: 'all'
        });
        break;
      }
      case 'remove-row': {
        this.dataModel.removeRows(this._region, this._row);
        break;
      }
      case 'remove-column': {
        this.dataModel.removeColumns(this._region, this._column);
        break;
      }
      case 'cut-cells': {
        this._grid.copyToClipboard();
        const { r1, c1, r2, c2 } = this.getSelectedRange();
        const rowSpan = r2 - r1 + 1;
        const columnSpan = c2 - c1 + 1;
        this.dataModel.cut('body', r1, c1, rowSpan, columnSpan);
        break;
      }
      case 'copy-cells': {
        this._grid.copyToClipboard();
        const { r1, c1, r2, c2 } = this.getSelectedRange();
        const rowSpan = r2 - r1 + 1;
        const columnSpan = c2 - c1 + 1;
        this.dataModel.copy('body', r1, c1, rowSpan, columnSpan);
        break;
      }
      case 'paste-cells': {
        // we will determine the location based on the current selection
        const { r1, c1 } = this.getSelectedRange();
        this.dataModel.paste('body', r1, c1);
        break;
      }
      case 'clear-contents': {
        // need to create a transaction since we are making multiple calls to setData()
        this._litestore.beginTransaction();
        const change = this.dataModel.clearContents(
          this._region,
          this._row,
          this._column,
          this.getSelectedRange()
        );
        this.updateLitestore(type, change);
        this._litestore.endTransaction();
        break;
      }
      case 'undo': {
        // check to see if an undo exists (one undo will exist because that's the initial transaction)
        if (this._litestore.transactionStore.undoStack.length === 1) {
          return;
        }

        const { change, selection } = this._litestore.getRecord({
          schema: EditableCSVViewer.DATAMODEL_SCHEMA,
          record: EditableCSVViewer.RECORD_ID
        });

        // undo first and then get the model data
        this._litestore.undo();
        const { modelData } = this._litestore.getRecord({
          schema: EditableCSVViewer.DATAMODEL_SCHEMA,
          record: EditableCSVViewer.RECORD_ID
        });

        // reselect previous selection
        const { r1, r2, c1, c2 } = selection;
        this._grid.selectionModel.select({
          r1,
          r2,
          c1,
          c2,
          cursorRow: r1,
          cursorColumn: c1,
          clear: 'all'
        });
        // undo changes in the model
        this.dataModel.undo(modelData, change);
        break;
      }
      case 'redo': {
        // check to see if an redo exists (one redo will exist because that's the initial transaction)
        if (this._litestore.transactionStore.redoStack.length === 0) {
          return;
        }
        this._litestore.redo();
        const { change } = this._litestore.getRecord({
          schema: EditableCSVViewer.DATAMODEL_SCHEMA,
          record: EditableCSVViewer.RECORD_ID
        });

        let { r1, r2, c1, c2 } = selection;
        // handle special cases for selection
        if (type === 'insert-row-below') {
          r1 += 1;
          r2 += 1;
        } else if (type === 'insert-column-right') {
          c1 += 1;
          c2 += 1;
        } else if (change.type === 'rows-moved') {
          r1 = change.destination;
          r2 = change.destination;
        } else if (change.type === 'columns-moved') {
          c1 = change.destination;
          c2 = change.destination;
        }

        // reselect the cell that was edited
        if (change.type === 'cells-changed') {
          const { row, column } = change;
          this.selectSingleCell(row, column);
        }
        this.dataModel.redo(change);
        break;
      }
      case 'save':
        this._save();
        break;
    }
  }

  /**
   * Updates the current transaction with the raw data, header, and changeArgs
   * Requires Litestore.beginTransaction() to be called before and Litestore.endTransaction to be called after
   * @param change The change args for the Datagrid (may be null)
   */
  public updateLitestore(type: string, change?: DataModel.ChangedArgs): void {
    const model = this.dataModel.dsvModel;
    const selection = this._grid.selectionModel.currentSelection();

    this._litestore.updateRecord(
      {
        schema: EditableCSVViewer.DATAMODEL_SCHEMA,
        record: EditableCSVViewer.RECORD_ID
      },
      {
        modelData: model.rawData,
        modelHeader: model.header,
        change: change,
        selection: selection,
        type: type
      }
    );
  }

  /**
   * Selects a certain cell using the selection model
   * @param row The row being selected
   * @param column The column being selected
   */
  public selectSingleCell(row: number, column: number): void {
    const select: SelectionModel.SelectArgs = {
      r1: row,
      r2: row,
      c1: column,
      c2: column,
      cursorRow: row,
      cursorColumn: column,
      clear: 'all'
    };
    this._grid.selectionModel.select(select);
  }

  protected getSelectedRange(): SelectionModel.Selection {
    const selections = toArray(this._grid.selectionModel.selections());
    if (selections.length === 0) {
      return;
    }
    return selections[0];
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('paste', this._handlePaste.bind(this));
  }
  private _handlePaste(event: ClipboardEvent): void {
    const copiedText: string = event.clipboardData.getData('text/plain');
    // prevent default behavior
    event.preventDefault();
    event.stopPropagation();
    const { r1, c1 } = this.getSelectedRange();
    this.dataModel.paste(this._region, r1, c1, copiedText);
  }

  private _onRightClick(
    emitter: RichMouseHandler,
    hit: DataGrid.HitTestResult
  ): void {
    if (hit.region !== 'void') {
      this._region = hit.region;
    }
    this._row = hit.row;
    this._column = hit.column;
  }

  private _onResize(emitter: RichMouseHandler): void {
    this._background.style.width = `${this._grid.viewportWidth}px`;
    this._background.style.height = `${this._grid.viewportHeight}px`;
    this._columnHeader.style.left = `${this._grid.headerWidth}px`;
    this._columnHeader.style.height = `${this._grid.headerHeight}px`;
    this._columnHeader.style.width = `${this._grid.viewportWidth}px`;
    this._rowHeader.style.top = `${this._grid.headerHeight}px`;
    this._rowHeader.style.width = `${this._grid.headerWidth}px`;
    this._rowHeader.style.height = `${this._grid.viewportHeight}px`;
  }

  private _region: DataModel.CellRegion;
  private _row: number;
  private _column: number;
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
  private _litestore: Litestore;

  // Signals for basic editing functionality
  private _changeModelSignal: Signal<this, string> = new Signal<this, string>(
    this
  );
  private _columnHeader: HTMLElement;
  private _rowHeader: HTMLElement;
}

export namespace EditableCSVViewer {
  /**
   * The arguments emitted to the Editable CSVViewer when the datamodel changes
   */
  export type ModelChangedArgs = {
    data: string;
    change: DataModel.ChangedArgs;
    useLitestore: boolean;
    type: string;
  };

  export const SCHEMA_ID = 'datamodel';
  export const RECORD_ID = 'datamodel';
  export const DATAMODEL_SCHEMA = {
    id: SCHEMA_ID,
    fields: {
      modelData: Fields.String(),
      modelHeader: Fields.Register<string[]>({ value: [] }),
      change: Fields.Register<DataModel.ChangedArgs>({
        value: null
      }),
      selection: Fields.Register<SelectionModel.Selection>({
        value: null
      }),
      type: Fields.String()
    }
  };
}

export class EditableCSVDocumentWidget extends DocumentWidget<
  EditableCSVViewer
> {
  constructor(options: EditableCSVDocumentWidget.IOptions) {
    let { content, reveal } = options;
    const { context, commandRegistry, ...other } = options;
    content = content || new EditableCSVViewer({ context });
    reveal = Promise.all([reveal, content.revealed]);
    super({ context, content, reveal, ...other });

    // add commands to the toolbar
    const commands = commandRegistry;
    const {
      save,
      undo,
      redo,
      cutToolbar,
      copyToolbar,
      pasteToolbar
    } = CommandIDs;

    this.toolbar.addItem(
      'save',
      new CommandToolbarButton({ commands, id: save })
    );
    this.toolbar.addItem(
      'undo',
      new CommandToolbarButton({ commands, id: undo })
    );
    this.toolbar.addItem(
      'redo',
      new CommandToolbarButton({ commands, id: redo })
    );
    this.toolbar.addItem(
      'cut',
      new CommandToolbarButton({ commands, id: cutToolbar })
    );
    this.toolbar.addItem(
      'copy',
      new CommandToolbarButton({ commands, id: copyToolbar })
    );
    this.toolbar.addItem(
      'paste',
      new CommandToolbarButton({ commands, id: pasteToolbar })
    );

    /* possible feature
    const filterData = new FilterButton({ selected: content.delimiter });
    this.toolbar.addItem('filter-data', filterData);
    */
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
    commandRegistry: CommandRegistry;
  }
}

export class EditableCSVViewerFactory extends ABCWidgetFactory<
  IDocumentWidget<EditableCSVViewer>
> {
  constructor(
    options: DocumentRegistry.IWidgetFactoryOptions<IDocumentWidget>,
    commandRegistry: CommandRegistry
  ) {
    super(options);
    this._commandReigstry = commandRegistry;
  }

  createNewWidget(
    context: DocumentRegistry.Context
  ): IDocumentWidget<EditableCSVViewer> {
    const commandRegistry = this._commandReigstry;
    return new EditableCSVDocumentWidget({ context, commandRegistry });
  }

  private _commandReigstry: CommandRegistry;
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
