import { MutableDataModel, DataModel } from '@lumino/datagrid';
import { DSVModel } from 'tde-csvviewer';
import { Signal } from '@lumino/signaling';
import { numberToCharacter } from './_helper';
// import { ClipBoardHandler } from './clipboard';

export default class EditableDSVModel extends MutableDataModel {
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

  get onChangedSignal(): Signal<this, string> {
    return this._onChangeSignal;
  }

  get colHeaderLength(): number {
    const model = this._dsvModel;
    const headerLength = model.header.join('').length;
    return (
      headerLength +
      (headerLength - 1) * model.delimiter.length +
      model.rowDelimiter.length
    );
  }
  private _silenceDsvModel(): void {
    this._transmitting = false;
    window.setTimeout(() => (this._transmitting = true), 30);
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
    value: any
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
    this.emitChanged(change);
    this._silenceDsvModel();
    model.parseAsync();
    this._onChangeSignal.emit(
      this._dsvModel.rawData.slice(this.colHeaderLength)
    );
    return true;
  }

  addRow(row: number): void {
    const model = this.dsvModel;
    const newRow = this.blankRow(model, row);
    this.insertAt(newRow, model, { row: row });
    const change: DataModel.ChangedArgs = {
      type: 'rows-inserted',
      region: 'body',
      index: row,
      span: 1
    };
    this.emitChanged(change);
    this._silenceDsvModel();
    model.parseAsync();

    this._onChangeSignal.emit(
      this._dsvModel.rawData.slice(this.colHeaderLength)
    );
  }

  addColumn(column: number): void {
    const model = this.dsvModel;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let row: number;
    for (row = this.rowCount() - 1; row >= 0; row--) {
      this.insertAt(model.delimiter, model, { row: row, column: column });
    }
    const prevNumCol = this.columnCount();
    const nextLetter = numberToCharacter(alphabet, prevNumCol + 1);

    let headerLength = this.colHeaderLength;

    model.rawData =
      model.rawData.slice(0, headerLength - 1) +
      model.delimiter +
      nextLetter +
      model.rawData.slice(headerLength - 1);

    headerLength += model.delimiter.length + nextLetter.length;
    // need to push the letter to the header here so that it updates
    model.header.push(nextLetter);

    const change: DataModel.ChangedArgs = {
      type: 'columns-inserted',
      region: 'body',
      index: column,
      span: 1
    };
    this.emitChanged(change);
    this._silenceDsvModel();
    model.parseAsync();
    this._onChangeSignal.emit(this._dsvModel.rawData.slice(headerLength));
  }

  removeRow(row: number): void {
    const model = this.dsvModel;
    this.sliceOut(model, { row: row });

    const change: DataModel.ChangedArgs = {
      type: 'rows-removed',
      region: 'body',
      index: row,
      span: 1
    };
    this.emitChanged(change);
    this._silenceDsvModel();
    model.parseAsync();
    this._onChangeSignal.emit(
      this._dsvModel.rawData.slice(this.colHeaderLength)
    );
  }

  removeColumn(column: number): void {
    const model = this.dsvModel;
    let row: number;
    for (row = this.rowCount() - 1; row >= 0; row--) {
      this.sliceOut(model, { row: row, column: column });
    }

    // update rawData and header (header handles immediate update, rawData handles parseAsync)
    // slice out the last letter in the column header
    let headerLength = this.colHeaderLength;
    const headerIndex = model.rawData.lastIndexOf(
      model.delimiter,
      headerLength
    );

    model.rawData =
      model.rawData.slice(0, headerIndex) +
      model.rowDelimiter +
      model.rawData.slice(headerLength);

    // need to remove the last letter from the header
    const removedLetter = model.header.pop();
    headerLength -= removedLetter.length + model.rowDelimiter.length;

    const change: DataModel.ChangedArgs = {
      type: 'columns-removed',
      region: 'body',
      index: column,
      span: 1
    };
    this.emitChanged(change);
    this._silenceDsvModel();
    model.parseAsync();
    this._onChangeSignal.emit(this._dsvModel.rawData.slice(headerLength));
  }

  cut(selection: ICellSelection): void {
    // this._cellSelection = selection;
    const model = this.dsvModel;
    const { startRow, startColumn, endRow, endColumn } = selection;
    const numRows = endRow - startRow + 1;
    const numColumns = endColumn - startColumn + 1;
    let row: number;
    let column: number;
    for (let i = numRows - 1; i >= 0; i--) {
      row = startRow + i;
      for (let j = numColumns - 1; j >= 0; j--) {
        column = startColumn + j;
        this.sliceOut(model, { row: row, column: column }, true);
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
    this.emitChanged(change);
    this._silenceDsvModel();
    model.parseAsync();
    this._onChangeSignal.emit(
      this._dsvModel.rawData.slice(this.colHeaderLength)
    );
  }

  paste(startCoord: ICoordinates, data: string): void {
    this._cancelEditingSignal.emit(null);
    const model = this.dsvModel;
    // convert the copied data to an array
    const clipboardArray = data.split('\n').map(elem => elem.split('\t'));
    console.log(clipboardArray[0][0]);

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
        console.log(clipboardArray[i][j]);
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
    model.parseAsync();
    this.emitChanged(change);
    this._onChangeSignal.emit(
      this._dsvModel.rawData.slice(this.colHeaderLength)
    );
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
   *
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
  private _onChangeSignal: Signal<this, string> = new Signal<this, string>(
    this
  );
  private _transmitting = true;
  private _cancelEditingSignal: Signal<this, null> = new Signal<this, null>(
    this
  );
  // private _cellSelection: ICellSelection | null;
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
