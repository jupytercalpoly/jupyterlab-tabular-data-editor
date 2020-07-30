import { DSVModel } from 'tde-csvviewer';
import { MutableDataModel, DataModel } from 'tde-datagrid';
import { Fields } from '@lumino/datastore';
import { Litestore } from './litestore';
// import { Signal } from '@lumino/signaling';

export class EditorModel extends MutableDataModel {
  private _valueMap: HashMap;
  private _rowMap: Array<number>;
  private _columnMap: Array<number>;
  private _newRow: number;
  private _newColumn: number;
  private _initRows: number;
  private _initColumns: number;
  private _clipboard: Array<Array<string>>;
  public litestore: Litestore;
  public model: DSVModel;
  // private _onChangeSignal: Signal<this, string> = new Signal<this, string>(
  //   this
  // );

  constructor(options: DSVModel.IOptions) {
    super();
    // give our model the DSVModel as a property
    this.model = new DSVModel(options);

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
    this._valueMap = {};

    // initialize the litestore
    this.litestore = new Litestore({ id: 0, schemas: [DATAMODEL_SCHEMA] });
  }

  /**
   * get the row count
   * Notes: this is equivalent to this.rowCount('body')
   */
  get numRows(): number {
    return this.model.rowCount('body');
  }

  /**
   * get the column count
   * Notes: this is equivalent to this.rowCount('body')
   */
  get numColumns(): number {
    return this.model.columnCount('body');
  }

  /**
   * the rowCount for a specific region
   */
  rowCount(region: DataModel.RowRegion): number {
    return this.model.rowCount(region);
  }

  /**
   * the columnCount for a specific region
   */
  columnCount(region: DataModel.ColumnRegion = 'body'): number {
    return this.model.columnCount(region);
  }

  data(region: DataModel.CellRegion, row: number, column: number): any {
    // The Grids rows IDs are not unique, as the header row
    // has ID 0 and the first body row has ID 0. We give each
    // row a unique id by indexing the first body row at 1
    row = this._uniqueRowID(row, region);

    // map the Grid row/column to the static row/column where the data lives
    row = this._rowMap[row];
    column = this._columnMap[column];

    // check if a new value has been stored at this cell
    if (this._valueMap[`${row}, ${column}`]) {
      return this._valueMap[`${row}, ${column}`];
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
    return this.model.data(region, row, column);
  }

  setData(
    region: DataModel.CellRegion,
    row: number,
    column: number,
    value: any,
    useLitestore = true
  ): boolean {
    row = this._uniqueRowID(row, region);

    // map to the virtual cell in the model.
    row = this._rowMap[row];
    column = this._columnMap[column];

    // add the value to the valueMap
    this._valueMap[`${row}, ${column}`] = value;

    // Revert the Grid Row ID
    row = this._gridRowID(row, region);

    // Define the change.
    const change: DataModel.ChangedArgs = {
      type: 'cells-changed',
      region: 'body',
      row: row,
      column: column,
      rowSpan: 1,
      columnSpan: 1
    };

    // Update the Litestore.
    if (useLitestore) {
      this._updateLitestore(change);
    }

    // Emit the change.
    this._handleEmits(change);

    return true;
  }

  /**
   * @param start: the index at which to start adding rows.
   * @param span: the number of rows to add. Default is 1.
   *
   * Notes: this method (and all others that follow it)
   */
  addRows(region: DataModel.CellRegion, start: number, span = 1): void {
    // Map to the unique row ID.
    start = this._uniqueRowID(start, region);
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

    // Revert the Grid Row ID
    start = this._gridRowID(start, region);

    // Define the change.
    const change: DataModel.ChangedArgs = {
      type: 'rows-inserted',
      region: 'body',
      index: start,
      span: span
    };

    // Update the Litestore.
    this._updateLitestore(change);

    // Emit the change.
    this._handleEmits(change);
  }

  /**
   *
   * @param start the index at which to start adding columns.
   * @param span the number of columns to add. Default is 1.
   */
  addColumns(region: DataModel.CellRegion, start: number, span = 1): void {
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

    // Define the change.
    const change: DataModel.ChangedArgs = {
      type: 'columns-inserted',
      region: 'body',
      index: start,
      span: span
    };

    // Update the Litestore.
    this._updateLitestore(change);

    // Emit the change.
    this._handleEmits(change);
  }

  /**
   *
   * @param start the index to start removing the rows
   * @param span the number of rows to remove
   */
  removeRows(region: DataModel.CellRegion, start: number, span = 1): void {
    // map to the unique row ID.
    start = this._uniqueRowID(start, region);

    // remove the values from the rowMap
    this._rowMap.splice(start, span);

    // Revert the Grid Row ID.
    start = this._gridRowID(start, region);

    // Define the change.
    const change: DataModel.ChangedArgs = {
      type: 'rows-removed',
      region: 'body',
      index: start,
      span: span
    };

    // Update the Litestore.
    this._updateLitestore(change);

    // Emit the change.
    this._handleEmits(change);
  }

  /**
   *
   * @param start the index to start removing the columns
   * @param span the number of columns to remove
   */

  removeColumns(region: DataModel.CellRegion, start: number, span = 1): void {
    // remove the values from the rowMap
    this._rowMap.splice(start, span);

    // Define the change.
    const change: DataModel.ChangedArgs = {
      type: 'columns-removed',
      region: 'body',
      index: start,
      span: span
    };

    // Update the Litestore.
    this._updateLitestore(change);

    // Emit the change.
    this._handleEmits(change);
  }

  /**
   *
   * @param start the index of the first column to move
   * @param end the index to insert the first column
   * @param span the number of columns moving
   */

  moveRows(
    region: DataModel.CellRegion,
    start: number,
    end: number,
    span: number
  ): void {
    // Get the unique row IDs.
    start = this._uniqueRowID(start, region);
    end = this._uniqueRowID(end, region);

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

    // Revert the Grid Row IDs.
    start = this._gridRowID(start, region);
    end = this._gridRowID(end, region);

    // Define the change.
    const change: DataModel.ChangedArgs = {
      type: 'rows-moved',
      region: 'body',
      index: start,
      span: span,
      destination: end
    };

    // Update the Litestore.
    this._updateLitestore(change);

    // Emit the change.
    this._handleEmits(change);
  }

  /**
   *
   * @param start the index of the first column to move
   * @param end the index to insert the first column
   * @param span the number of columns moving
   */
  moveColumns(
    region: DataModel.CellRegion,
    start: number,
    end: number,
    span: number
  ): void {
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

    // Define the change.
    const change: DataModel.ChangedArgs = {
      type: 'columns-moved',
      region: 'body',
      index: start,
      span: span,
      destination: end
    };

    // Update the Litestore.
    this._updateLitestore(change);

    // Emit the change.
    this._handleEmits(change);
  }

  cut(
    region: DataModel.CellRegion,
    row: number,
    column: number,
    rowSpan: number,
    columnSpan: number
  ): void {
    // we use the value map to redefine values within the cut as ''. Need to map
    // to the static values.
    // clear previous values from the clipboard
    this._clipboard = [];
    for (let i = rowSpan - 1; i >= 0; i--) {
      const rowClip = [];
      for (let j = columnSpan - 1; j >= 0; j--) {
        // make a temporary copy of the values
        rowClip.push(this.data(region, row + i, column + j));
        this.setData(region, row, column, '');
      }
      this._clipboard.push(rowClip);
    }

    // Define the change.
    const change: DataModel.ChangedArgs = {
      type: 'cells-changed',
      region: 'body',
      row: row,
      column: column,
      rowSpan: rowSpan,
      columnSpan: columnSpan
    };

    // Update the Litestore.
    this._updateLitestore(change);

    // Emit the change.
    this._handleEmits(change);
  }

  copy(
    region: DataModel.CellRegion,
    row: number,
    column: number,
    rowSpan: number,
    columnSpan: number
  ): void {
    // we use the value map to redefine values within the cut as ''. Need to map
    // to the static values.
    // clear previous values from the clipboard
    this._clipboard = [];
    for (let i = rowSpan - 1; i >= 0; i--) {
      const rowClip = [];
      for (let j = columnSpan - 1; j >= 0; j--) {
        // make a temporary copy of the values
        rowClip.push(this.data(region, row + i, column + j));
      }
      this._clipboard.push(rowClip);
    }
  }

  paste(
    region: DataModel.CellRegion,
    row: number,
    column: number,
    data: string | null = null
  ): void {
    // see if we have stored it in our local array
    if (this._clipboard.length === 0) {
      if (data !== null) {
        // convert the copied data to an array
        this._clipboard = data.split('\n').map(elem => elem.split('\t'));
      } else {
        // we have no data, so bail
        return;
      }
    }

    // get the unique row ID.
    row = this._uniqueRowID(row, region);

    // see how much space we have
    const rowsBelow = this.numRows - row;
    const columnsRight = this.numColumns - column;

    // clamp the values we are adding at the bounds of the grid
    const rowSpan = Math.min(rowsBelow, this._clipboard.length);
    const columnSpan = Math.min(columnsRight, this._clipboard[0].length);

    // revert to grid's row id for setting the data
    row = this._gridRowID(row, region);

    // set the data
    // TODO see if calling set data in for loop is bad for performance.
    for (let i = 0; i < rowSpan; i++) {
      for (let j = 0; j < columnSpan; j++) {
        this.setData(region, row, column, this._clipboard[i][j]);
      }
    }

    // Define the change.
    const change: DataModel.ChangedArgs = {
      type: 'cells-changed',
      region: 'body',
      row: row,
      column: column,
      rowSpan: rowSpan,
      columnSpan: columnSpan
    };

    // Update the Litestore.
    this._updateLitestore(change);

    // Emit the change.
    this._handleEmits(change);
  }

  undo(change: DataModel.ChangedArgs): void {
    // Bail early if there is no change.
    if (!change) {
      return;
    }

    // Undo
    this.litestore.undo();

    // Get the previous state's data.
    let undoChange: DataModel.ChangedArgs;
    ({
      columnMap: this._columnMap,
      rowMap: this._rowMap,
      valueMap: this._valueMap
    } = this.litestore.getRecord({
      schema: DATAMODEL_SCHEMA,
      record: RECORD_ID
    }));

    // submit a signal to the DataGrid based on the change.
    switch (change.type) {
      case 'cells-changed':
        // add the visual element of reselecting the cell where the change happened.

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
    this._handleEmits(undoChange);
  }

  redo(change: DataModel.ChangedArgs): void {
    // Update the data.
    ({
      rowMap: this._rowMap,
      columnMap: this._columnMap,
      valueMap: this._valueMap
    } = this.litestore.getRecord({
      schema: DATAMODEL_SCHEMA,
      record: RECORD_ID
    }));

    // Emit the change.
    this._handleEmits(change);
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

  private _updateLitestore(change: DataModel.ChangedArgs | null) {
    this.litestore.beginTransaction();
    this.litestore.updateRecord(
      {
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      },
      {
        rowMap: this._rowMap,
        columnMap: this._columnMap,
        valueMap: this._valueMap,
        change: change
      }
    );
  }

  private _handleEmits(change: DataModel.ChangedArgs): void {
    // Emits the updates to the DataModel to the DataGrid for rerender
    this.emitChanged(change);
  }
}

export const SCHEMA_ID = 'datamodel';
export const RECORD_ID = 'datamodel';
export const DATAMODEL_SCHEMA = {
  id: SCHEMA_ID,
  fields: {
    rowMap: Fields.Register<number[]>({ value: [] }),
    columnMap: Fields.Register<number[]>({ value: [] }),
    valueMap: Fields.Register<HashMap>({ value: {} }),
    change: Fields.Register<DataModel.ChangedArgs>({
      value: { type: 'model-reset' }
    })
  }
};

export type HashMap = { [key: string]: string };
