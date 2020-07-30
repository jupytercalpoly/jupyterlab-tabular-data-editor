import { DSVModel } from 'tde-csvviewer';
import { MutableDataModel, DataModel } from '@lumino/datagrid';

export default class EditorModel extends MutableDataModel {
  private _model: DSVModel;
  private _valueMap: Map<Array<number>, string>;
  private _rowMap: Array<number>;
  private _columnMap: Array<number>;
  private _newRow: number;
  private _newColumn: number;
  private _initRows: number;
  private _initColumns: number;
  constructor(options: DSVModel.IOptions) {
    super();
    // give our model the DSVModel as a property
    this._model = new DSVModel(options);

    // Arrays which map the requested row/column to the
    // row/column where the data actually lives, initially
    // set so that indices are mapped to themselves.
    this._rowMap = this._rowIdentityMap();
    this._columnMap = this._columnIdentityMap();

    // we will give each subsequent row/column we add a numeric
    // value. It is natural to give them positive integer values
    // starting where this._rowMap and this._columnMap end.
    this._newRow = this.numRows;
    this._newColumn = this.numColumns;

    // to quickly check whether a row/column is one we've added,
    // we just check wether it was bigger than the inital rows/columns
    this._initRows = this.numRows - 1;
    this._initColumns = this.numColumns - 1;

    // the valueMap stores new values that are added to the
    // dataset. It maps [row, column] pairs to values and is
    // the first thing that is checked when a cell is queried
    // for its value.
    this._valueMap = new Map();
  }

  /**
   * the rowCount for a specific region
   */
  rowCount(region: DataModel.RowRegion): number {
    return this._model.rowCount(region);
  }

  /**
   * the columnCount for a specific region
   */
  columnCount(region: DataModel.ColumnRegion = 'body'): number {
    return this._model.columnCount(region);
  }

  data(region: DataModel.CellRegion, row: number, column: number): any {
    // The Grids rows IDs are not unique, as the header row
    // has ID 0 and the first body row has ID 0. We give each
    // row a unique id by indexing the first body row at 1
    row = this._uniqueRowID(row, region);

    // map the requested row, column to where the data has
    // been moved to through previous mutations
    row = this._rowMap[row];
    column = this._columnMap[column];

    // check if a new value has been stored at this cell
    if (this._valueMap.has([row, column])) {
      return this._valueMap.get([row, column]);
    }

    // do a bounds check to see if either the row or column is
    // an added one.
    if (row > this._initRows || column > this._initColumns) {
      // we are on a new column or row which has no maped
      // value, so we know that the value must be empty
      return '';
    }

    // the model's data method assumes the grid's row IDs.
    row = this._gridRowID(row, region);

    // fetch the value from the data
    return this._model.data(region, row, column);
  }

  setData(
    region: DataModel.CellRegion,
    row: number,
    column: number,
    value: any
  ): boolean {
    row = this._uniqueRowID(row, region);

    // map to the virtual cell in the model.
    row = this._rowMap[row];
    column = this._columnMap[column];

    // add the value to the valueMap
    this._valueMap.set([row, column], value);

    return true;
  }

  /**
   * @param start: the index at which to start adding rows.
   * @param span: the number of rows to add. Default is 1.
   *
   * Notes: this method (and all others that follow it)
   */
  addRows(start: number, span = 1): void {
    // store the next span's worth of values
    const values = [];
    let i = 0;
    while (i <= span) {
      values.push(this._newRow);
      i++;
      this._newRow++;
    }

    // add the values to the row map, starting AT start
    this._rowMap.splice(start, 0, ...values);
  }

  /**
   *
   * @param start the index at which to start adding columns.
   * @param span the number of columns to add. Default is 1.
   */
  addColumns(start: number, span = 1): void {
    // store the next span's worth of values
    const values = [];
    let i = 0;
    while (i <= span) {
      values.push(this._newColumn);
      i++;
      this._newColumn++;
    }

    // add the values to the column map, starting AT start
    this._columnMap.splice(start, 0, ...values);
  }

  /**
   *
   * @param start the index to start removing the rows
   * @param span the number of rows to remove
   */
  removeRows(start: number, span: number): void {
    // remove the values from the rowMap
    this._rowMap.splice(start, span);
  }

  /**
   *
   * @param start the index to start removing the columns
   * @param span the number of columns to remove
   */

  removeColumns(start: number, span: number): void {
    // remove the values from the rowMap
    this._rowMap.splice(start, span);
  }

  /**
   *
   * @param start the index of the first column to move
   * @param end the index to insert the first column
   * @param span the number of columns moving
   */

  moveRows(start: number, end: number, span: number): void {
    // bail early if we are moving no distance
    if (start === end) {
      return;
    }

    // need to figure out which way we are moving.
    const directionMoving = start < end ? 'down' : 'up';

    // remove the values we are moving
    const valuesMoving = this._rowMap.splice(start, span);

    // if moving down, we just grabbed rows above the desitnation,
    // which means we removed values BEFORE end which we must account for
    // when inserting again.
    let destination: number;
    switch (directionMoving) {
      case 'down': {
        destination = end - span;
        break;
      }
      case 'up': {
        // subtract 1 because we want to be inserting BEFORE end when going up
        destination = end - 1;
      }
    }

    // insert the values we have moved starting at the destination
    this._rowMap.splice(destination, 0, ...valuesMoving);
  }

  /**
   *
   * @param start the index of the first column to move
   * @param end the index to insert the first column
   * @param span the number of columns moving
   */
  moveColumns(start: number, end: number, span: number): void {
    // bail early if we are moving no distance
    if (start === end) {
      return;
    }

    // need to figure out which way we are moving. This is based
    // on the REAL columns start and end
    const directionMoving = start < end ? 'down' : 'up';

    // remove the values we are moving
    const valuesMoving = this._columnMap.splice(start, span);

    // if moving down, we just grabbed columns above the desitnation,
    // which means we removed values BEFORE end which we must account for
    // when inserting again.
    let destination: number;
    switch (directionMoving) {
      case 'down': {
        destination = end - span;
        break;
      }
      case 'up': {
        // subtract 1 because we want to be inserting BEFORE end when going up
        destination = end - 1;
      }
    }

    // insert the values we have moved starting at the destination
    this._columnMap.splice(destination, 0, ...valuesMoving);
  }

  cut(row: number, column: number, rowSpan: number, columnSpan: number): void {
    // we are redefining data in virtual space, so we must use the row and column
    // maps to get the virtual row and column.
    for (let i = 0; i < rowSpan; i++) {
      for (let j = 0; j < columnSpan; j++) {
        this._valueMap.set(
          [this._rowMap[row + i], this._columnMap[column + j]],
          ''
        );
      }
    }
  }
  // copy(row: number, column: number, rowSpan: number, columnSpan: number): void {
  // }

  // paste(row: number, column: number, rowSpan: number, columnSpan: number): void {
  // }

  // undo(): void {
  // }

  // redo(): void {
  // }

  /**
   * get the row count
   * Notes: this is equivalent to this.rowCount('body')
   */
  get numRows(): number {
    return this._model.rowCount('body');
  }

  /**
   * get the column count
   * Notes: this is equivalent to this.rowCount('body')
   */
  get numColumns(): number {
    return this._model.columnCount('body');
  }

  /**
   * returns an array or the form [0, 1, 2, ..., n - 1], where
   * n is the number of rows in the data set.
   */
  private _rowIdentityMap(): Array<number> {
    return [...Array(this.numRows).keys()];
  }

  /**
   * returns an array or the form [0, 1, 2, ..., m - 1], where
   * m is the number of columns in the data set.
   */
  private _columnIdentityMap(): Array<number> {
    return [...Array(this.numColumns).keys()];
  }

  /**
   * translate from the Grid's row IDs to our own standard
   */
  private _uniqueRowID(row: number, region: DataModel.CellRegion) {
    return region === 'body' ? row + 1 : row;
  }

  /**
   * translate from our unique row ID to the Grid's standard
   */
  private _gridRowID(row: number, region: DataModel.CellRegion) {
    return region === 'body' ? row - 1 : row;
  }
}
