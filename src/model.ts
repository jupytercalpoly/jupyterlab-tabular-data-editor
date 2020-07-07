import { MutableDataModel, DataModel } from '@lumino/datagrid';
import { DSVModel } from 'tde-csvviewer';
import { Signal } from '@lumino/signaling';

export default class EditableDSVModel extends MutableDataModel {
  constructor(options: DSVModel.IOptions) {
    super();
    this._dsvModel = new DSVModel(options);
  }

  get dsvModel(): DSVModel {
    return this._dsvModel;
  }

  get onChangedSignal(): Signal<this, void> {
    return this._onChangeSignal;
  }

  rowCount(region: DataModel.RowRegion): number {
    return this._dsvModel.rowCount(region);
  }

  columnCount(region: DataModel.ColumnRegion): number {
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

  setData(
    region: DataModel.CellRegion,
    row: number,
    column: number,
    value: any
  ): boolean {
    const model = this._dsvModel;
    console.log('setData method called');
    // Look up the field and value for the region.
    switch (region) {
      case 'body':
        if (model.header.length === 0) {
          this._setField(row, column, value);
        } else {
          this._setField(row + 1, column, value);
        }
        console.log('setting field in body');
        break;
      default:
        throw 'unreachable';
    }

    this.emitChanged({
      type: 'cells-changed',
      region: 'body',
      row: row,
      column: column,
      rowSpan: 1,
      columnSpan: 1
    });
    this._onChangeSignal.emit();

    return true;
  }

  /**
   *
   * @param row the row being edited
   * @param column the column being edited
   * @param the value typed at the keyboard
   */

  private _setField(row: number, column: number, value: string): void {
    const model = this.dsvModel;
    let nextIndex;

    // Find the index for the first character in the field.
    const index = model.getOffsetIndex(row, column);

    // Initialize the trim adjustments.
    let trimRight = 0;
    let trimLeft = 0;

    // Find the end of the slice (the start of the next field), and how much we
    // should adjust to trim off a trailing field or row delimiter. First check
    // if we are getting the last column.
    if (column === model.columnCount('body') - 1) {
      // Check if we are getting any row but the last.
      if (row < model.rowCount('body') - 1) {
        // Set the next offset to the next row, column 0.
        nextIndex = model.getOffsetIndex(row + 1, 0);

        // Since we are not at the last row, we need to trim off the row
        // delimiter.
        trimRight += model.rowDelimiter.length;
      } else {
        // We are getting the last data item, so the slice end is the end of the
        // data string.
        nextIndex = model.rawData.length;

        // The string may or may not end in a row delimiter (RFC 4180 2.2), so
        // we explicitly check if we should trim off a row delimiter.
        if (
          model.rawData[nextIndex - 1] ===
          model.rowDelimiter[model.rowDelimiter.length - 1]
        ) {
          trimRight += model.rowDelimiter.length;
        }
      }
    } else {
      // The next field starts at the next column offset.
      nextIndex = model.getOffsetIndex(row, column + 1);

      // Trim off the delimiter if it exists at the end of the field
      if (
        index < nextIndex &&
        model.rawData[nextIndex - 1] === model.delimiter
      ) {
        trimRight += 1;
      }
    }

    // Check to see if the field begins with a quote. If it does, trim a quote on either side.
    if (model.rawData[index] === model.quote) {
      trimLeft += 1;
      trimRight += 1;
    }
    model.rawData =
      model.rawData.slice(0, index + trimLeft) +
      value +
      model.rawData.slice(nextIndex - trimRight, model.rawData.length);

    model.parseAsync();
  }

  addRow(rowNumber: number): void {
    const model = this.dsvModel;
    const index = model.getOffsetIndex(rowNumber + 1, 0);
    model.rawData =
      model.rawData.slice(0, index) +
      // supply n - 1 delimeters to mark end of 1st through (n - 1)th entry of ith row
      model.delimiter.repeat(model.columnCount('body') - 1) +
      // end row with a row delimeter
      model.rowDelimiter +
      // append the rest of the rawData
      model.rawData.slice(index);
    model.parseAsync();
    this.emitChanged({
      type: 'rows-inserted',
      region: 'body',
      index: rowNumber,
      span: 1
    });
    this._onChangeSignal.emit();
  }

  addColumn(colNumber: number): void {
    const model = this.dsvModel;
    // this feels sub-optimal but I haven't thought of a better way.
    let index: number;
    let shift = 0;
    for (let row = 0; row <= model.rowCount('body'); row++) {
      index = model.getOffsetIndex(row, colNumber) + shift;
      model.rawData =
        model.rawData.slice(0, index) +
        model.delimiter +
        model.rawData.slice(index);
      shift += model.delimiter.length;
    }
    model.parseAsync();
    this.emitChanged({
      type: 'columns-inserted',
      region: 'body',
      index: colNumber,
      span: 1
    });
    this._onChangeSignal.emit();
  }

  removeRow(rowNumber: number): void {
    const model = this.dsvModel;
    const rowRemovedIndex = model.getOffsetIndex(rowNumber + 1, 0);
    const rowAfterIndex = model.getOffsetIndex(rowNumber + 2, 0);
    model.rawData =
      model.rawData.slice(0, rowRemovedIndex) +
      model.rawData.slice(rowAfterIndex);
    model.parseAsync();
    this.emitChanged({
      type: 'rows-removed',
      region: 'body',
      index: rowNumber,
      span: 1
    });
    this._onChangeSignal.emit();
  }

  positiveModulo(n: number, m: number): number {
    return ((n % m) + m) % m;
  }

  getModifiedOffsetIndex(
    rowNum: number,
    colNum: number,
    shifted: number
  ): Array<number> {
    const model = this._dsvModel;
    // subtract to find the actual column due to shifting
    let startCol = colNum - shifted;
    console.log('Startcol', startCol);
    let startRow = rowNum;
    let endCol = startCol + 1;
    let endRow = rowNum;

    if (startCol < 0) {
      startRow = startRow - Math.ceil(shifted / model.columnCount('body'));
      startCol = this.positiveModulo(startCol, model.columnCount('body') + 1);
      console.log('row', startRow, 'col', startCol);
    }

    if (endCol < 0) {
      endRow = endRow - Math.ceil(shifted / model.columnCount('body'));
      endCol = this.positiveModulo(endCol, model.columnCount('body') + 1);
    }

    console.log('row', startRow, 'col', startCol);
    console.log('row', endRow, 'col', endCol, '\n');
    return [
      model.getOffsetIndex(startRow, startCol),
      model.getOffsetIndex(endRow, endCol)
    ];
  }

  removeCol(colNumber: number): void {
    const model = this.dsvModel;
    let start,
      end = 0;
    for (let row = 0; row < 3 /*model.rowCount('body')*/; row++) {
      [start, end] = this.getModifiedOffsetIndex(row, colNumber, row);

      console.log('start', model.rawData[start], '\tend', model.rawData[end]);
      model.rawData =
        model.rawData.slice(
          0,
          row > 0 ? start - model.delimiter.length * row : start
        ) + model.rawData.slice(end);
      // console.log('shift', end - start);
    }
    model.parseAsync();
    this.emitChanged({
      type: 'columns-removed',
      region: 'body',
      index: colNumber,
      span: 1
    });
    // this._onChangeSignal.emit();
  }
  private _dsvModel: DSVModel;
  private _onChangeSignal: Signal<this, void> = new Signal<this, void>(this);
}
