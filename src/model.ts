import { MutableDataModel, DataModel } from '@lumino/datagrid';
import { DSVModel } from '@jupyterlab/csvviewer';

export default class EditableDSVModel extends MutableDataModel {
  constructor(options: DSVModel.IOptions) {
    super();

    this._dsvModel = new DSVModel(options);
  }

  get dsvModel(): DSVModel {
    return this._dsvModel;
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
    return this._dsvModel.metadata(region, row, column);
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
        if (model._header.length === 0) {
          this._setField(row, column, value);
        } else {
          this._setField(row + 1, column, value);
        }
        console.log('setting field in body');
        break;
      //   case 'column-header':
      //     if (model._header.length === 0) {
      //       value = (column + 1).toString();
      //     } else {
      //       value = model._header[column];
      //     }
      //     break;
      //   case 'row-header':
      //     value = (row + 1).toString();
      //     break;
      //   case 'corner-header':
      //     value = '';
      //     break;
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

    return true;
  }

  /**
   *
   * @param row the row being edited
   * @param column the column being edited
   * @param the value typed at the keyboard
   */

  private _setField(row: number, column: number, value: string): void {
    let model = this.dsvModel;
    let nextIndex;

    // Find the index for the first character in the field.
    const index = model._getOffsetIndex(row, column);

    // Initialize the trim adjustments.
    let trimRight = 0;
    let trimLeft = 0;

    // Find the end of the slice (the start of the next field), and how much we
    // should adjust to trim off a trailing field or row delimiter. First check
    // if we are getting the last column.
    if (column === model._columnCount! - 1) {
      // Check if we are getting any row but the last.
      if (row < model._rowCount! - 1) {
        // Set the next offset to the next row, column 0.
        nextIndex = model._getOffsetIndex(row + 1, 0);

        // Since we are not at the last row, we need to trim off the row
        // delimiter.
        trimRight += model._rowDelimiter.length;
      } else {
        // We are getting the last data item, so the slice end is the end of the
        // data string.
        nextIndex = model._data.length;

        // The string may or may not end in a row delimiter (RFC 4180 2.2), so
        // we explicitly check if we should trim off a row delimiter.
        if (
          model._data[nextIndex - 1] ===
          model._rowDelimiter[model._rowDelimiter.length - 1]
        ) {
          trimRight += model._rowDelimiter.length;
        }
      }
    } else {
      // The next field starts at the next column offset.
      nextIndex = model._getOffsetIndex(row, column + 1);

      // Trim off the delimiter if it exists at the end of the field
      if (
        index < nextIndex &&
        model._data[nextIndex - 1] === model._delimiter
      ) {
        trimRight += 1;
      }
    }

    // Check to see if the field begins with a quote. If it does, trim a quote on either side.
    if (model._data[index] === model._quote) {
      trimLeft += 1;
      trimRight += 1;
    }
    model._data =
      model._data.slice(0, index + trimLeft) +
      value +
      model._data.slice(nextIndex - trimRight, model._data.length);
  }

  private _dsvModel: DSVModel;
}
