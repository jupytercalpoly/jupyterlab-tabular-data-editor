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
  CellRenderer
  // CellEditor,
  // ICellEditor
} from '@lumino/datagrid';

import { Message } from '@lumino/messaging';
import { PanelLayout, Widget } from '@lumino/widgets';
import EditableDSVModel from './model';
import { RichMouseHandler } from './handler';
import { numberToCharacter } from './_helper';
import { toArray } from '@lumino/algorithm';
import { ISignal } from '@lumino/signaling';

import {
  SaveButton,
  UndoButton,
  CutButton,
  CopyButton,
  PasteButton,
  FilterButton
} from './toolbar';
import { ISearchMatch } from '@jupyterlab/documentsearch';
const CSV_CLASS = 'jp-CSVViewer';
const CSV_GRID_CLASS = 'jp-CSVViewer-grid';
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

  get row(): number {
    return this._row - 1;
  }
  get column(): number {
    return this._column;
  }

  get matches(): ISearchMatch[] {
    return this._matches;
  }

  get currentMatch(): ISearchMatch {
    return this._currentMatch;
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
          if (
            this._currentMatch.line === row &&
            this._currentMatch.column === column
          ) {
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
  find(query: RegExp, reverse = false): ISearchMatch[] | boolean {
    const model = this._grid.dataModel!;
    const rowCount = model.rowCount('body');
    const columnCount = model.columnCount('body');

    if (this._query !== query) {
      // reset search
      this._row = 0;
      this._column = -1;
      this._matches = [];
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

          // create ISearchMatch and push it to the matches array
          const match = {
            text: query.source,
            fragment: cellData,
            line: row,
            column: col,
            index: this._matches.length
          };
          this._matches.push(match);
        }
      }
      this._column = reverse ? columnCount - 1 : 0;
    }

    if (this._matches.length > 0) {
      this._currentMatch = this._matches[0];
    }
    return this._matches;
  }

  get query(): RegExp | null {
    return this._query;
  }

  highlightNext(reverse: boolean): ISearchMatch | undefined {
    if (this._matches.length === 0) {
      return undefined;
    }
    if (!this._currentMatch) {
      this._currentMatch = reverse
        ? this._matches[this.matches.length - 1]
        : this._matches[0];
    } else {
      let nextIndex = reverse
        ? this._currentMatch.index - 1
        : this._currentMatch.index + 1;

      // Cheap way to make this a circular buffer
      nextIndex = (nextIndex + this._matches.length) % this._matches.length;
      this._currentMatch = this._matches[nextIndex];
    }

    this._changed.emit(undefined);
    return this._currentMatch;
  }

  private _grid: DataGrid;
  private _query: RegExp | null;
  private _matches: ISearchMatch[] = [];
  private _row: number;
  private _column: number;
  private _currentMatch: ISearchMatch;
  private _changed = new Signal<GridSearchService, void>(this);
}

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
  get dataModel(): EditableDSVModel {
    return this._grid.dataModel as EditableDSVModel;
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

  /*
  Guess the row delimiter if it was not supplied. 
  This will be fooled if a different line delimiter possibility appears in the first row.
  */
  private _guessRowDelimeter(data: string): string {
    const i = data.slice(0, 5000).indexOf('\r');
    if (i === -1) {
      return '\n';
    } else if (data[i + 1] === '\n') {
      return '\r\n';
    } else {
      return '\r';
    }
  }

  /*
  Counts the occurrences of a substring from a given string
  */
  private _countOccurrences(
    string: string,
    substring: string,
    rowDelimiter: string
  ): number {
    let numCol = 0;
    let pos = 0;
    const l = substring.length;
    const firstRow = string.slice(0, string.indexOf(rowDelimiter));

    pos = firstRow.indexOf(substring, pos);
    while (pos !== -1) {
      numCol++;
      pos += l;
      pos = firstRow.indexOf(substring, pos);
    }
    // number of columns is the amount of columns + 1
    return numCol + 1;
  }

  /*
  Adds the a column header of alphabets to the top of the data (A..Z,AA..ZZ,AAA...)
  */
  private _buildColHeader(colDelimiter: string): string {
    const rawData = this._context.model.toString();
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    // when the model is first created, we don't know how many columns or what the row delimeter is
    const rowDelimiter = this._guessRowDelimeter(rawData);
    const numCol = this._countOccurrences(rawData, colDelimiter, rowDelimiter);

    // if only single alphabets fix the string
    if (numCol <= 26) {
      return (
        alphabet
          .slice(0, numCol)
          .split('')
          .join(colDelimiter) + rowDelimiter
      );
    }
    // otherwise compute the column header with multi-letters (AA..)
    else {
      // get all single letters
      let columnHeader = alphabet.split('').join(colDelimiter);
      // find the rest
      for (let i = 27; i < numCol; i++) {
        columnHeader += colDelimiter + numberToCharacter(i);
      }
      return columnHeader + rowDelimiter;
    }
  }

  /**
   * Create the model for the grid.
   */
  protected _updateGrid(): void {
    const delimiter = this.delimiter;
    const model = this._grid.dataModel as EditableDSVModel;
    let data: string;

    if (!model) {
      const header = this._buildColHeader(this.delimiter);
      data = header + this._context.model.toString();
      const dataModel = (this._grid.dataModel = new EditableDSVModel({
        data,
        delimiter
      }));
      this._grid.selectionModel = new BasicSelectionModel({ dataModel });
      dataModel.onChangedSignal.connect(this._updateModel, this);
      dataModel.cancelEditingSignal.connect(this._cancelEditing, this);
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

  private _updateModel(emitter: EditableDSVModel, data: string): void {
    this.context.model.fromString(data);
  }

  private _cancelEditing(emitter: EditableDSVModel): void {
    this._grid.editorController.cancel();
  }

  private _changeModel(emitter: EditableCSVViewer, type: string): void {
    switch (type) {
      case 'add-row': {
        this.dataModel.addRow(this._row);
        break;
      }
      case 'add-column': {
        this.dataModel.addColumn(this._column);
        break;
      }
      case 'remove-row': {
        this.dataModel.removeRow(this._row);
        break;
      }
      case 'remove-column': {
        this.dataModel.removeColumn(this._column);
        break;
      }
      case 'copy-cells': {
        this._grid.copyToClipboard();
        break;
      }
      case 'cut-cells': {
        this._grid.copyToClipboard();
        const { r1, c1, r2, c2 } = this.getSelectedRange();
        this.dataModel.cut({
          startRow: r1,
          startColumn: c1,
          endRow: r2,
          endColumn: c2
        });
        break;
      }
      case 'undo': {
        this.dataModel.undo();
        break;
      }
      case 'redo': {
        this.dataModel.redo();
        break;
      }
    }
  }

  protected getSelectedRange(): any {
    const selections = toArray(this._grid.selectionModel.selections());
    if (selections.length === 0) {
      return;
    }
    return selections[0];
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('paste', this._handlePaste.bind(this));
    // this._grid.node.addEventListener("paste", function(ev) {
    //   const data = ev.clipboardData.getData('text/plain');
    //   console.log(data)
    //   ev.preventDefault();
    //   ev.stopPropagation();
    // })
  }
  private _handlePaste(event: ClipboardEvent): void {
    const copiedText: string = event.clipboardData.getData('text/plain');
    // prevent default behavior
    event.preventDefault();
    event.stopPropagation();
    const { r1, c1 } = this.getSelectedRange();
    this.dataModel.paste({ row: r1, column: c1 }, copiedText);
  }

  private _onRightClick(
    emitter: RichMouseHandler,
    coords: Array<number>
  ): void {
    [this._row, this._column] = coords;
  }

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

  // Signals for basic editing functionality
  private _changeModelSignal: Signal<this, string> = new Signal<this, string>(
    this
  );
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

    const saveData = new SaveButton({ selected: content.delimiter });
    this.toolbar.addItem('save-data', saveData);

    const undoChange = new UndoButton({ selected: content.delimiter });
    this.toolbar.addItem('undo', undoChange);

    const cutData = new CutButton({ selected: content.delimiter });
    this.toolbar.addItem('cut-data', cutData);

    const copyData = new CopyButton({ selected: content.delimiter });
    this.toolbar.addItem('copy-data', copyData);

    const pasteData = new PasteButton({ selected: content.delimiter });
    this.toolbar.addItem('pastte-data', pasteData);

    const filterData = new FilterButton({ selected: content.delimiter });
    this.toolbar.addItem('filter-data', filterData);
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
