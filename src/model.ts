import { MutableDataModel, DataModel, SelectionModel } from 'tde-datagrid';
import { DSVModel } from 'tde-csvviewer';
import { Signal } from '@lumino/signaling';
import { numberToCharacter } from './_helper';
import { DSVEditor } from './widget';

export class EditableDSVModel extends MutableDataModel {
  private _clipBoardArr: any;
  constructor(options: DSVModel.IOptions) {
    super();
    this._dsvModel = new DSVModel(options);

    // propagate changes in the dsvModel up to the grid
    this.dsvModel.changed.connect(this._passMessage, this);
  }

  get dsvModel(): DSVModel {
    return this._dsvModel;
  }

  get cancelEditingSignal(): Signal<this, null> {
    return this._cancelEditingSignal;
  }

  get onChangedSignal(): Signal<this, DSVEditor.ModelChangedArgs> {
    return this._onChangeSignal;
  }

  get colHeaderLength(): number {
    const model = this._dsvModel;
    return (model.header.join(model.delimiter) + model.rowDelimiter).length;
  }

  private _silenceDsvModel(): void {
    this._transmitting = false;
    window.setTimeout(() => (this._transmitting = true), 1000);
  }

  private _passMessage(
    emitter: DSVModel,
    message: DataModel.ChangedArgs
  ): void {
    if (this._transmitting) {
      this.emitChanged(message);
    }
  }

  rowCount(region: DataModel.RowRegion = 'body'): number {
    return this._dsvModel.rowCount(region);
  }

  columnCount(region: DataModel.ColumnRegion = 'body'): number {
    return this._dsvModel.columnCount(region);
  }

  metadata(
    region: DataModel.CellRegion,
    row: number,
    column: number
  ): DataModel.Metadata {
    return { type: 'string' };
  }

  data(region: DataModel.CellRegion, row: number, column: number): any {
    return this._dsvModel.data(region, row, column);
  }
  // TODO: Do we need to handle cases for column-headers/row-headers?
  // Could we make some assumptions that would lead to a faster update?
  // Ex. We know that a row-header is close to row 0.
  // calling setData with value = null performs an inversion if the last operation was a setData operation.
  setData(
    region: DataModel.CellRegion,
    row: number,
    column: number,
    value: any,
    useLitestore = true
  ): boolean {
    const model = this.dsvModel;
    this.sliceOut(model, { row: row, column: column }, true);
    this.insertAt(value, model, { row: row, column: column });
    const change: DataModel.ChangedArgs = {
      type: 'cells-changed',
      region: 'body',
      row: row,
      column: column,
      rowSpan: 1,
      columnSpan: 1
    };
    this.handleEmits(change, 'cells-changed', useLitestore);
    return true;
  }

  /**
   * Adds a row to the body of the model
   * @param row The index of the row to be inserted (0-indexed)
   */
  addRow(row: number, type: string): void {
    const model = this.dsvModel;
    const newRow = this.blankRow(model, row);
    this.insertAt(newRow, model, { row: row });
    const change: DataModel.ChangedArgs = {
      type: 'rows-inserted',
      region: 'body',
      index: row,
      span: 1
    };
    this.handleEmits(change, type);
  }

  /**
   * Adds a column to the body of the model
   * @param column The index of the column to be inserted (0-indexed)
   */
  addColumn(column: number, type: string): void {
    const model = this.dsvModel;
    const data = this.dsvModel.rawData;
    // initalize an array to hold each row
    const mapArray: Array<string | 0> = new Array(this.rowCount()).fill(0);
    // initialize a callback for the map method
    let mapper: (elem: any, index: number) => string;
    if (column < this.columnCount()) {
      // we are inserting in a "normal place".
      mapper = (elem: any, index: number): string => {
        return (
          data.slice(
            model.getOffsetIndex(index + 1, 0),
            model.getOffsetIndex(index + 1, column)
          ) +
          model.delimiter +
          data.slice(
            model.getOffsetIndex(index + 1, column),
            this.rowEnd(index)
          )
        );
      };
    } else {
      // we are inserting at the end
      mapper = (elem: any, index: number): string => {
        return (
          data.slice(model.getOffsetIndex(index + 1, 0), this.rowEnd(index)) +
          model.delimiter
        );
      };
    }

    const prevNumCol = this.columnCount();
    const nextLetter = numberToCharacter(prevNumCol + 1);

    let headerLength = this.colHeaderLength;

    // replace the raw data
    model.rawData =
      model.rawData.slice(0, headerLength - 1) +
      model.delimiter +
      nextLetter +
      model.rowDelimiter +
      mapArray.map(mapper).join(model.rowDelimiter);

    headerLength += model.delimiter.length + nextLetter.length;
    // need to push the letter to the header here so that it updates
    model.header.push(nextLetter);

    const change: DataModel.ChangedArgs = {
      type: 'columns-inserted',
      region: 'body',
      index: column,
      span: 1
    };
    this.handleEmits(change, type);
  }

  /**
   * Removes a row from the body of the model
   * @param row The index of the row removed (0-indexed)
   */
  removeRow(row: number, type: string): void {
    const model = this.dsvModel;
    this.sliceOut(model, { row: row });

    const change: DataModel.ChangedArgs = {
      type: 'rows-removed',
      region: 'body',
      index: row,
      span: 1
    };
    this.handleEmits(change, type);
  }

  /**
   * Removes a column from the body of the model
   * @param column The index of the column removed (0-indexed)
   */
  removeColumn(column: number, type: string): void {
    const model = this.dsvModel;
    const data = this.dsvModel.rawData;
    // initialize the replacement array
    const mapArray: Array<string | 0> = new Array(this.rowCount()).fill(0);
    // initialize a callback for the map method
    let mapper: (elem: any, index: number) => string;
    if (column < this.columnCount() - 1) {
      // removing in a normal place
      mapper = (elem: any, index: number): string => {
        return (
          data.slice(
            model.getOffsetIndex(index + 1, 0),
            model.getOffsetIndex(index + 1, column)
          ) +
          data.slice(
            model.getOffsetIndex(index + 1, column + 1),
            this.rowEnd(index)
          )
        );
      };
    } else {
      // removing at the end
      mapper = (elem: any, index: number): string => {
        return data.slice(
          model.getOffsetIndex(index + 1, 0),
          model.getOffsetIndex(index + 1, column) - model.delimiter.length
        );
      };
    }
    // update rawData and header (header handles immediate update, rawData handles parseAsync)
    // slice out the last letter in the column header
    let headerLength = this.colHeaderLength;
    const headerIndex = model.rawData.lastIndexOf(
      model.delimiter,
      headerLength - 1
    );

    model.rawData =
      model.rawData.slice(0, headerIndex) +
      model.rowDelimiter +
      mapArray.map(mapper).join(model.rowDelimiter);

    // need to remove the last letter from the header
    const removedLetter = model.header.pop();
    headerLength -= removedLetter.length + model.rowDelimiter.length;

    const change: DataModel.ChangedArgs = {
      type: 'columns-removed',
      region: 'body',
      index: column,
      span: 1
    };
    this.handleEmits(change, type);
  }

  /**
   * Copies the current selection and potential removes it (cut)
   * @param selection The current selction
   * @param type 'cut-cells' or 'copy-cells'
   */
  cutAndCopy(
    selection: ICellSelection,
    type: 'cut-cells' | 'copy-cells' = 'cut-cells'
  ): void {
    const keepingValue = type === 'copy-cells' ? true : false;
    const model = this.dsvModel;
    const { startRow, startColumn, endRow, endColumn } = selection;
    const numRows = endRow - startRow + 1;
    const numColumns = endColumn - startColumn + 1;
    this._clipBoardArr = new Array(numRows)
      .fill(0)
      .map(() => new Array(numColumns).fill(0));

    let row: number;
    let column: number;
    for (let i = numRows - 1; i >= 0; i--) {
      row = startRow + i;
      for (let j = numColumns - 1; j >= 0; j--) {
        column = startColumn + j;
        this._clipBoardArr[i][j] = this.sliceOut(
          model,
          { row: row, column: column },
          true,
          keepingValue
        );
      }
    }
    const change: DataModel.ChangedArgs = {
      type: 'cells-changed',
      region: 'body',
      row: startRow,
      column: startColumn,
      rowSpan: numRows,
      columnSpan: numColumns
    };
    this.handleEmits(change, type, !keepingValue);
  }

  /**
   * Pastes the current data from the clipboard
   * @param startCoord The start coordinates of the paste
   * @param data The data being pasted
   */
  paste(
    startCoord: ICoordinates,
    type: string,
    data: string | null = null
  ): void {
    let clipboardArray = this._clipBoardArr;
    const model = this.dsvModel;

    // stop the UI from auto-selecting the cell after paste
    this._cancelEditingSignal.emit(null);

    // see if we have stored it in our local array
    if (this._clipBoardArr) {
      clipboardArray = this._clipBoardArr;
      // Otherwise, if we have data, get it into an array
    } else if (data !== null) {
      // convert the copied data to an array
      clipboardArray = data.split('\n').map(elem => elem.split('\t'));
    } else {
      // we have no data, so bail
      return;
    }
    // get the rows we will be adding
    const rowSpan = Math.min(
      clipboardArray.length,
      this.rowCount() - startCoord.row
    );
    const columnSpan = Math.min(
      clipboardArray[0].length,
      this.columnCount() - startCoord.column
    );
    let row: number;
    let column: number;
    for (let i = rowSpan - 1; i >= 0; i--) {
      row = startCoord.row + i;
      for (let j = columnSpan - 1; j >= 0; j--) {
        column = startCoord.column + j;
        this.sliceOut(model, { row: row, column: column }, true);
        this.insertAt(clipboardArray[i][j], model, {
          row: row,
          column: column
        });
      }
    }

    const change: DataModel.ChangedArgs = {
      type: 'cells-changed',
      region: 'body',
      row: startCoord.row,
      column: startCoord.column,
      rowSpan: rowSpan,
      columnSpan: columnSpan
    };
    this.handleEmits(change, type);
  }

  /**
   * Utilizes the litestore to undo the last change
   * @param data The previous data as a result of the undo
   * @param change The arguments of the last change
   */
  undo(data: string, change: DataModel.ChangedArgs): void {
    const model = this._dsvModel;
    let undoChange: DataModel.ChangedArgs;

    if (!change) {
      return;
    }

    // update model with data from the transaction
    model.rawData = data;

    switch (change.type) {
      case 'cells-changed':
        undoChange = {
          type: 'cells-changed',
          region: 'body',
          row: change.row,
          column: change.column,
          rowSpan: change.rowSpan,
          columnSpan: change.columnSpan
        };
        break;
      case 'rows-inserted':
        undoChange = {
          type: 'rows-removed',
          region: 'body',
          index: change.index,
          span: change.span
        };
        break;
      case 'columns-inserted':
        // need to remove a letter from the header
        model.header.pop();

        undoChange = {
          type: 'columns-removed',
          region: 'body',
          index: change.index,
          span: change.span
        };
        break;
      case 'rows-removed':
        undoChange = {
          type: 'rows-inserted',
          region: 'body',
          index: change.index,
          span: change.span
        };
        break;
      case 'columns-removed':
        // add the next letter into the header
        model.header.push(numberToCharacter(model.header.length + 1));

        undoChange = {
          type: 'columns-inserted',
          region: 'body',
          index: change.index,
          span: change.span
        };
        break;
      case 'rows-moved':
        undoChange = {
          type: 'rows-moved',
          region: 'body',
          index: change.destination,
          destination: change.index,
          span: change.span
        };
        break;
      case 'columns-moved':
        undoChange = {
          type: 'columns-moved',
          region: 'body',
          index: change.destination,
          destination: change.index,
          span: change.span
        };
        break;
    }
    // don't use litestore for undo
    this.handleEmits(undoChange, '', false);
  }

  /**
   * Utilizes the litestore to redo the last undo
   * @param change The arguments of the change to be redone
   */
  redo(data: string, change: DataModel.ChangedArgs): void {
    const model = this._dsvModel;

    if (!change) {
      return;
    }

    // need to update model header when making a change to columns
    if (change.type === 'columns-inserted') {
      model.header.push(numberToCharacter(model.header.length + 1));
    } else if (change.type === 'columns-removed') {
      model.header.pop();
    }

    model.rawData = data;
    // don't use litestore for redo
    this.handleEmits(change, '', false);
  }

  /**
   * Swaps the data between two rows
   * @param startRow The index of the row to be moved (0-indexed)
   * @param endRow The index of the other row to be moved (0-indexed)
   */
  moveRow(startRow: number, endRow: number): void {
    // Bail early if there is nothing to move
    if (startRow === endRow) {
      return;
    }
    const model = this._dsvModel;
    let rowValues: string;
    // We need to order the operations so as not to disrupt getOffsetIndex
    if (startRow < endRow) {
      // we are moving a row down, insert below before deleting above

      // get values from sliceOut without removing them
      rowValues = this.sliceOut(model, { row: startRow }, false, true);

      // see if the destination is the row end
      if (endRow === this.rowCount() - 1) {
        // rowValues should then start with rowDelimeter and not have trailing one
        rowValues =
          model.rowDelimiter +
          rowValues.slice(0, rowValues.length - model.rowDelimiter.length);
      }
      // insert row Values at target row
      this.insertAt(rowValues, model, { row: endRow + 1 });
      // now we are safe to remove the row
      this.sliceOut(model, { row: startRow });
    } else {
      // we are moving a row up, slice below before adding above
      rowValues = this.sliceOut(model, { row: startRow });

      // see if we are moving the end row up
      if (startRow === this.rowCount() - 1) {
        // need to remove begining row delimeter and add trailing row delimeter
        rowValues =
          rowValues.slice(model.rowDelimiter.length) + model.rowDelimiter;
      }

      // now we can insert the values in the target row
      this.insertAt(rowValues, model, { row: endRow });
    }

    // emit the changes to the UI
    const change: DataModel.ChangedArgs = {
      type: 'rows-moved',
      region: 'body',
      index: startRow,
      span: 1,
      destination: endRow
    };
    this.handleEmits(change, 'rows-moved');
  }

  /**
   * Swaps the data between two columns
   * @param startColumn The index of the column to be moved (0-indexed)
   * @param endColumn The index of the other column to be moved (0-indexed)
   */
  moveColumn(startColumn: number, endColumn: number): void {
    // bail early if we aren't moving anywhere
    if (startColumn === endColumn) {
      return;
    }
    const model = this.dsvModel;
    // initialize an array to map from.
    const mapArray: Array<string | 0> = new Array(this.rowCount()).fill(0);
    // intialize the callback we will use to map the array to the row values
    const data = this.dsvModel.rawData;
    let mapper: (elem: any, index: number) => string;
    // 3 cases:
    //   1. start normal, destination normal
    //      A: This breaks into two cases depending
    //         on whether start < destination
    //   2. start on end, destination normal
    //   3. start normal, destination on end
    if (
      startColumn < this.columnCount() - 1 &&
      endColumn < this.columnCount() - 1
    ) {
      // both remove point and insertion point are normal. Need to determine which
      // is first
      if (startColumn < endColumn) {
        // define the callback function to handle this case
        mapper = (elem: any, index: number): string => {
          return (
            data.slice(
              model.getOffsetIndex(index + 1, 0),
              model.getOffsetIndex(index + 1, startColumn)
            ) +
            data.slice(
              model.getOffsetIndex(index + 1, startColumn + 1),
              model.getOffsetIndex(index + 1, endColumn + 1)
            ) +
            data.slice(
              model.getOffsetIndex(index + 1, startColumn),
              model.getOffsetIndex(index + 1, startColumn + 1)
            ) +
            data.slice(
              model.getOffsetIndex(index + 1, endColumn + 1),
              this.rowEnd(index)
            )
          );
        };
      } else {
        // startColumn after end

        // define mapper for this case
        mapper = (elem: any, index: number): string => {
          return (
            data.slice(
              model.getOffsetIndex(index + 1, 0),
              model.getOffsetIndex(index + 1, endColumn)
            ) +
            data.slice(
              model.getOffsetIndex(index + 1, startColumn),
              model.getOffsetIndex(index + 1, startColumn + 1)
            ) +
            data.slice(
              model.getOffsetIndex(index + 1, endColumn),
              model.getOffsetIndex(index + 1, startColumn)
            ) +
            data.slice(
              model.getOffsetIndex(index + 1, startColumn + 1),
              this.rowEnd(index)
            )
          );
        };
      }
    } else if (endColumn === this.columnCount() - 1) {
      // destination is the end column. Set up mapper to handle
      // this case
      mapper = (elem: any, index: number): string => {
        return (
          data.slice(
            model.getOffsetIndex(index + 1, 0),
            model.getOffsetIndex(index + 1, startColumn)
          ) +
          data.slice(
            model.getOffsetIndex(index + 1, startColumn + 1),
            this.rowEnd(index)
          ) +
          model.delimiter +
          data.slice(
            model.getOffsetIndex(index + 1, startColumn),
            model.getOffsetIndex(index + 1, startColumn + 1) -
              model.delimiter.length
          )
        );
      };
    } else {
      // startColumn is at the end. Define mapper to handle this case
      mapper = (elem: any, index: number): string => {
        return (
          data.slice(
            model.getOffsetIndex(index + 1, 0),
            model.getOffsetIndex(index + 1, endColumn)
          ) +
          data.slice(
            model.getOffsetIndex(index + 1, startColumn),
            this.rowEnd(index)
          ) +
          model.delimiter +
          data.slice(
            model.getOffsetIndex(index + 1, endColumn),
            model.getOffsetIndex(index + 1, startColumn) -
              model.delimiter.length
          )
        );
      };
    }
    model.rawData =
      model.rawData.slice(0, this.colHeaderLength) +
      mapArray.map(mapper).join(model.rowDelimiter);
    // emit the changes to the UI
    const change: DataModel.ChangedArgs = {
      type: 'columns-moved',
      region: 'body',
      index: startColumn,
      span: 1,
      destination: endColumn
    };
    this.handleEmits(change, 'columns-moved');
  }

  /**
   * Clears the contents of the selected region
   * Keybind: ['Backspace']
   * @param regionClicked The clicked region, used to determine which areas of to clear
   * @param rowClicked The row clicked
   * @param columnClicked The column clicked
   * @param selection The curent selection
   *
   * @returns The DataModel change args
   */
  clearContents(
    regionClicked: DataModel.CellRegion,
    rowClicked: number,
    columnClicked: number,
    selection: SelectionModel.Selection
  ): DataModel.ChangedArgs {
    if (regionClicked === 'corner-header') {
      return;
    }

    const { r1, r2, c1, c2 } = selection;
    let row, column, rowSpan, columnSpan: number;
    let change: DataModel.ChangedArgs;

    switch (regionClicked) {
      // clear contents of that column
      case 'column-header':
        // set params
        row = 0;
        column = columnClicked;
        rowSpan = this.rowCount('body');
        columnSpan = 1;

        //define change args
        change = {
          type: 'cells-changed',
          region: 'body',
          row: row,
          column: column,
          rowSpan: rowSpan,
          columnSpan: columnSpan
        };

        // iterate through column to clear contents
        for (let i = 0; i < rowSpan; i++) {
          this.setData('body', i, column, '', false);
        }
        break;
      // clear contents of that row
      case 'row-header':
        // set params
        row = rowClicked;
        column = 0;
        rowSpan = 1;
        columnSpan = this.columnCount('body');

        //define change args
        change = {
          type: 'cells-changed',
          region: 'body',
          row: row,
          column: column,
          rowSpan: rowSpan,
          columnSpan: columnSpan
        };

        // iterate through row to clear contents
        for (let i = 0; i < columnSpan; i++) {
          this.setData('body', row, i, '', false);
        }
        break;
      // region === 'body'
      // clear contents in the current selection
      default:
        // set params
        row = Math.min(r1, r2);
        column = Math.min(c1, c2);
        rowSpan = Math.abs(r1 - r2) + 1;
        columnSpan = Math.abs(c1 - c2) + 1;

        //define change args
        change = {
          type: 'cells-changed',
          region: 'body',
          row: row,
          column: column,
          rowSpan: rowSpan,
          columnSpan: columnSpan
        };

        // iterate through row to clear contents
        for (let curRow = row; curRow < row + rowSpan; curRow++) {
          for (let curCol = column; curCol < column + columnSpan; curCol++) {
            this.setData('body', curRow, curCol, '', false);
          }
        }
        break;
    }
    return change;
  }

  /**
   * Handles all signal emitting and model parsing after the raw data is manipulated
   * @param change The current change to be emitted to the Datagrid
   */
  handleEmits(
    change: DataModel.ChangedArgs,
    type: string,
    useLitestore = true
  ): void {
    this._silenceDsvModel();
    this._dsvModel.parseAsync();

    // Emits the updates to the DataModel to the DataGrid for rerender
    this.emitChanged(change);
    // Emits the updated raw data and change args to the CSVViewer
    this._onChangeSignal.emit({
      data: this._dsvModel.rawData.slice(this.colHeaderLength),
      change,
      useLitestore,
      type
    });
  }

  sliceOut(
    model: DSVModel,
    cellLoc: ICoordinates,
    keepingCell = false,
    keepingValue = false
  ): string {
    let sliceStart: number;
    let sliceEnd: number;
    if (keepingCell) {
      sliceStart = this.firstIndex(cellLoc);
      sliceEnd = this.lastIndex(cellLoc);
      // check whether we are removing last row (or column)
    } else if (this.isTrimOperation(cellLoc)) {
      const prevCell = this.getPreviousCell(cellLoc);
      sliceStart = this.lastIndex(prevCell);
      sliceEnd = this.lastIndex(cellLoc);
    } else {
      sliceStart = this.firstIndex(cellLoc);
      sliceEnd = this.firstIndex(this.getNextCell(cellLoc));
    }
    const value = model.rawData.slice(sliceStart, sliceEnd);
    if (!keepingValue) {
      model.rawData =
        model.rawData.slice(0, sliceStart) + model.rawData.slice(sliceEnd);
    }
    return value;
  }

  insertAt(value: any, model: DSVModel, cellLoc: ICoordinates): void {
    // check if we are finishing a pasting operation, block the unwanted change
    let insertionIndex: number;
    //check if we are appending an additional row (or column)
    if (this.isExtensionOperation(cellLoc)) {
      const prevCell = this.getPreviousCell(cellLoc);
      insertionIndex = this.lastIndex(prevCell);
    } else {
      insertionIndex = this.firstIndex(cellLoc);
    }

    model.rawData =
      model.rawData.slice(0, insertionIndex) +
      value +
      model.rawData.slice(insertionIndex);
  }

  /**
   * Returns a blank row with the correct numbers of columns and correct delimiters
   * @param model The DSV model being used
   * @param row The index of the row being inserted (determines whether to add a row delimiter or not)
   */
  blankRow(model: DSVModel, row: number): string {
    const rows = this.rowCount();
    if (row > rows - 1) {
      return (
        model.rowDelimiter + model.delimiter.repeat(this.columnCount() - 1)
      );
    }
    return model.delimiter.repeat(this.columnCount() - 1) + model.rowDelimiter;
  }

  /**
   * @param coords: the coordinates of the cell.
   */
  firstIndex(coords: ICoordinates): number {
    const { row, column } = coords;
    if (column === undefined) {
      return this.dsvModel.getOffsetIndex(row + 1, 0);
    }
    return this.dsvModel.getOffsetIndex(row + 1, column);
  }

  lastIndex(coords: ICoordinates): number {
    const { row, column } = coords;
    const columns = this.columnCount();
    const delim = this.dsvModel.delimiter.length;
    if (0 <= column && column < columns - 1) {
      return this.dsvModel.getOffsetIndex(row + 1, column + 1) - delim;
    }
    return this.rowEnd(row);
  }

  rowEnd(row: number): number {
    const rows = this.rowCount();
    const rowDelim = this.dsvModel.rowDelimiter.length;
    if (row < rows - 1) {
      return this.dsvModel.getOffsetIndex(row + 2, 0) - rowDelim;
    }
    return this.dsvModel.rawData.length;
  }
  // checks whether we are removing data cells on the last row or the last column.
  isTrimOperation(coords: ICoordinates): boolean {
    const { row, column } = coords;
    const rows = this.rowCount();
    const columns = this.columnCount();
    return column === columns - 1 || (row === rows - 1 && column === undefined);
  }
  // checks whether we are appending a column to the end or appending a row to the end.
  // This would mainly come up if we were undoing a trim operation.
  isExtensionOperation(coords: ICoordinates): boolean {
    const { row, column } = coords;
    const rows = this.rowCount();
    const columns = this.columnCount();
    return column >= columns || row >= rows;
  }

  getPreviousCell(coords: ICoordinates): ICoordinates {
    const { row, column } = coords;
    const columns = this.columnCount();
    switch (column) {
      // if column is not specified, then 'cell' is treated as the whole row
      case undefined: {
        return { row: Math.max(row - 1, 0) };
      }
      case 0: {
        return { row: Math.max(row - 1, 0), column: columns - 1 };
      }
      default: {
        return { row: row, column: column - 1 };
      }
    }
  }

  getNextCell(coords: ICoordinates): ICoordinates {
    const { row, column } = coords;
    const columns = this.columnCount();
    switch (column) {
      // if column is not specified, then we seek then next cell is treated as the next row.
      case undefined: {
        return { row: row + 1 };
      }
      // indexing for last column
      case columns - 1: {
        return { row: row + 1, column: 0 };
      }
      default: {
        return { row: row, column: column + 1 };
      }
    }
  }

  private _dsvModel: DSVModel;
  private _onChangeSignal: Signal<
    this,
    DSVEditor.ModelChangedArgs
  > = new Signal<this, DSVEditor.ModelChangedArgs>(this);
  private _transmitting = true;
  private _cancelEditingSignal: Signal<this, null> = new Signal<this, null>(
    this
  );
}

interface ICoordinates {
  row: number;
  column?: number;
}

export interface ICellSelection {
  startRow: number;
  startColumn: number;
  endColumn: number;
  endRow: number;
}
