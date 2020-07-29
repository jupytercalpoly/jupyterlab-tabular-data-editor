import { DSVModel } from 'tde-csvviewer';
import { MutableDataModel, DataModel } from '@lumino/datagrid';

export default class EditorModel extends MutableDataModel {
  private _model: DSVModel;
  private _valueMap: Map<Array<number>, string>;
  private _rowMap: Array<number>;
  private _columnMap: Array<number>;
  constructor(options: DSVModel.IOptions) {
    super();
    // give our model the DSVModel as a property
    this._model = new DSVModel(options);

    // Arrays which map the requested row/column to the
    // row/column where the data actually lives, initially
    // set so that indices are mapped to themselves.
    this._rowMap = this._rowIdentityMap();
    this._columnMap = this._columnIdentityMap();

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

    // check if our cell has non-integer values, which
    // occurs iff either the row or column has been added.
    if (!(Number.isInteger(row) || Number.isInteger(column))) {
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
   * returns an array or the form [0, 1, 2, ..., n], where
   * n is the number of rows in the data set.
   * We also give the underlying object a (-1, -1) key value pair
   * so that each queried entry will have at least 1 value above and
   * 1 value below
   */
  private _rowIdentityMap(): Array<number> {
    const arr = [...Array(this.numRows + 1).keys()];
    arr[-1] = -1;
    return arr;
  }

  /**
   * returns an array or the form [0, 1, 2, ..., m], where
   * m is the number of columns in the data set.
   * We also give the underlying object a (-1, -1) key value pair
   * so that each queried entry will have at least 1 value above and
   * 1 value below
   */
  private _columnIdentityMap(): Array<number> {
    const arr = [...Array(this.numColumns + 1).keys()];
    arr[-1] = -1;
    return arr;
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
