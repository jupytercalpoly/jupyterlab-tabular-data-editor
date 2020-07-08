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
    console.log(model.rawData);

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
      if (row <= model.rowCount('body') - 1) {
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
    if (!rowAfterIndex) {
      model.rawData = model.rawData.slice(0, rowRemovedIndex);
    } else {
      model.rawData =
        model.rawData.slice(0, rowRemovedIndex) +
        model.rawData.slice(rowAfterIndex);
    }
    model.parseAsync();
    this.emitChanged({
      type: 'rows-removed',
      region: 'body',
      index: rowNumber,
      span: 1
    });
    this._onChangeSignal.emit();
  }

  removeCol(colNumber: number): void {
    const model = this.dsvModel;

    let startIndex: number;
    let endIndex: number;
    //records length of the data we just removed
    let diff: number;
    // the row we are processing
    let currentRow: number;
    // total data we removed
    // the row of the next entry (or we're at the end)
    let nextRow: number;
    let shift = 0;
    // Accounts for length of trailing delimeter if we are removing last column
    let trailingDelimeter = 0;
    // Accounts for length of trailing rowDelimeter if we are removing last column
    let trailingRowDelimeter = 0;
    // The column of the next entry. 0 if we are removing the last column.
    let nextCol = colNumber + 1;
    // If we are removing last column, next entry is on next row, so this gets set to 1.
    let rowShift = 0;
    // check if we are removing last column
    if (colNumber + 1 === model.columnCount('body')) {
      trailingDelimeter = model.delimiter.length;
      trailingRowDelimeter = model.rowDelimiter.length;
      nextCol = 0;
      rowShift = 1;
    }

    for (currentRow = 0; currentRow <= model.rowCount('body'); currentRow++) {
      nextRow = currentRow + rowShift;
      startIndex =
        model.getOffsetIndex(currentRow, colNumber) - shift - trailingDelimeter;
      if (nextRow > this.rowCount('body')) {
        endIndex = model.rawData.length;
      } else {
        endIndex =
          model.getOffsetIndex(nextRow, nextCol) - shift - trailingRowDelimeter;
      }
      diff = endIndex - startIndex;
      model.rawData =
        model.rawData.slice(0, startIndex) + model.rawData.slice(endIndex);
      shift += diff;
    }

    console.log(model.rawData);
    model.parseAsync();
    this.emitChanged({
      type: 'columns-removed',
      region: 'body',
      index: colNumber,
      span: 1
    });
    this._onChangeSignal.emit();
  }
  private _dsvModel: DSVModel;
  private _onChangeSignal: Signal<this, void> = new Signal<this, void>(this);
}
