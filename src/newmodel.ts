import { DSVModel } from 'tde-csvviewer';
import { MutableDataModel, DataModel } from 'tde-datagrid';
import { Fields } from '@lumino/datastore';
import { Litestore } from './litestore';
import { toArray, range } from '@lumino/algorithm';

export class EditorModel extends MutableDataModel {
  private _valueMap: HashMap;
  private _rowMap: Array<number>;
  private _columnMap: Array<number>;
  private _nextRow: number;
  private _nextColumn: number;
  private _clipboard: Array<Array<string>>;
  public litestore: Litestore;
  public model: DSVModel;
  private _rowsAdded: number;
  private _columnsAdded: number;
  // private _onChangeSignal: Signal<this, string> = new Signal<this, string>(
  //   this
  // );

  constructor(options: DSVModel.IOptions) {
    super();
    // Define our model.
    this.model = new DSVModel(options);

    // Connect to the model's signals to recieve updates.
    this.model.changed.connect(this._receiveModelSignal, this);

    // Set up variables to record how many rows/columns we add.
    this._rowsAdded = 0;
    this._columnsAdded = 0;

    // Arrays which map the requested row/column to the
    // row/column where the data actually lives, initially
    // set to [0, 1, ..., total rows - 1] & [0, 1, ..., total columns - 1]
    this._rowMap = toArray(range(0, this.totalRows()));
    this._columnMap = toArray(range(0, this.totalColumns()));

    // we will give added rows/columns a numeric value.
    // It is natural to start them at 0.5 and increment by 1.
    this._nextRow = 0.5;
    this._nextColumn = 0.5;

    // the valueMap stores new values that are added to the
    // dataset. It maps "row, column" pairs to values and is
    // the first thing that is checked when a cell is queried
    // for its value.
    this._valueMap = {};

    // initialize the litestore
    this.litestore = new Litestore({ id: 0, schemas: [DATAMODEL_SCHEMA] });
  }

  /**
   * The grid's current number of rows by region.
   *
   */
  rowCount(region: DataModel.RowRegion): number {
    if (region === 'body') {
      return this.model.rowCount('body') + this._rowsAdded;
    }
    return 1;
  }

  /**
   * The grid's current number of columns by region.
   *
   * Note: the UI components use this method to get the column count
   * so it should reflect the grid's columns.
   */
  columnCount(region: DataModel.ColumnRegion): number {
    if (region === 'body') {
      return this.model.columnCount('body') + this._columnsAdded;
    }
    return 1;
  }

  /**
   * The grid's current number of rows. TOTAL, NOT BY REGION.
   */
  totalRows(): number {
    return this.model.rowCount('body') + this._rowsAdded + 1;
  }

  /**
   * The grid's current number of columns. TOTAL, NOT BY REGION.
   *
   * Notes: This is equivalent to columnCount('body')
   */

  totalColumns(): number {
    return this.model.columnCount('body') + this._columnsAdded;
  }

  data(region: DataModel.CellRegion, row: number, column: number): any {
    // The model is defered to if the region is a row header.
    if (region === 'row-header') {
      return this.model.data(region, row, column);
    }

    // The row comes to us as an index on a particular region. We need the
    // absolute index (ie index 0 is the first row of data).
    row = this._absoluteIndex(row, region);

    // Map from the cell on the grid to the cell in the model.
    row = this._rowMap[row];
    column = this._columnMap[column];

    // check if a new value has been stored at this cell
    if (this._valueMap[`${row}, ${column}`]) {
      return this._valueMap[`${row}, ${column}`];
    }

    if (!(Number.isInteger(row) && Number.isInteger(column))) {
      // we are on a new column or row which has no maped
      // value, so we know that the value must be empty
      return '';
    }

    // the model's data method assumes the grid's row IDs.
    row = this._regionIndex(row, region);

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
    // The row comes to us as an index on a particular region. We need the
    // absolute index (ie index 0 is the first row of data).
    row = this._absoluteIndex(row, region);

    // Map from the cell on the grid to the cell in the model.
    const modelRow = this._rowMap[row];
    const modelColumn = this._columnMap[column];

    // add the value to the valueMap
    this._valueMap[`${modelRow}, ${modelColumn}`] = value;

    // Revert the Grid Row ID
    row = this._regionIndex(row, region);

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
    // The row comes to us as an index on a particular region. We need the
    // absolute index (ie index 0 is the first row of data).
    start = this._absoluteIndex(start, region);
    const t0 = performance.now();
    // store the next span's worth of values.
    const values = [];
    let i = 0;
    while (i < span) {
      values.push(this._nextRow);
      i++;
      this._nextRow++;
      this._rowsAdded++;
    }

    // add the values to the row map, starting AT start
    this._rowMap.splice(start, 0, ...values);

    // Revert to the row index by region, which is what the grid expects.
    start = this._regionIndex(start, region);

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

    const t1 = performance.now();
    console.log('time taken', t1 - t0);
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
    while (i < span) {
      values.push(this._nextColumn);

      // insert the default column header
      this._valueMap[`0, ${this._nextColumn}`] = `Column ${start + i + 1}`;

      i++;
      this._nextColumn++;
      this._columnsAdded++;
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
    // The row comes to us as an index on a particular region. We need the
    // absolute index (ie index 0 is the first row of data).
    start = this._absoluteIndex(start, region);

    // remove the values from the rowMap
    this._rowMap.splice(start, span);

    // update the row count.
    this._rowsAdded -= span;

    // Revert to the row index by region, which is what the grid expects.
    start = this._regionIndex(start, region);

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
    // remove the values from the rowMap.
    this._columnMap.splice(start, span);

    // Update the column count.
    this._columnsAdded -= span;

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
    // Start and end come to us as an index on a particular region. We need the
    // absolute index (ie index 0 is the first row of data).
    start = this._absoluteIndex(start, region);
    end = this._absoluteIndex(end, region);

    // bail early if we are moving no distance
    if (start === end) {
      return;
    }

    // Figure out which way we are moving.
    const directionMoving = start < end ? 'down' : 'up';

    // remove the values we are moving
    const valuesMoving = this._rowMap.splice(start, span);

    // if moving down, we just grabbed rows above the desitnation,
    // which means we removed values BEFORE end which we must account for
    // when inserting again.
    let destination: number;
    switch (directionMoving) {
      case 'down': {
        // Add 1 because we want to insert AFTER end - span.
        destination = end - span + 1;
        break;
      }
      case 'up': {
        destination = end;
      }
    }

    // insert the values we have moved starting at the destination
    this._rowMap.splice(destination, 0, ...valuesMoving);

    // Revert to the row index by region, which is what the grid expects.
    start = this._regionIndex(start, region);
    end = this._regionIndex(end, region);

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
    const directionMoving = start < end ? 'right' : 'left';

    // remove the values we are moving
    const valuesMoving = this._columnMap.splice(start, span);

    // if moving right, we just grabbed columns left of the desitnation,
    // which means we removed values BEFORE end which we must account for
    // when inserting again.
    let destination: number;
    switch (directionMoving) {
      case 'right': {
        // Add 1 because we want to insert AFTER end - span.
        destination = end - span + 1;
        break;
      }
      case 'left': {
        destination = end;
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
    // Row comes to us as an index on a particular region. We need the
    // absolute index (ie index 0 is the first row of data).
    row = this._absoluteIndex(row, region);

    // see how much space we have
    const rowsBelow = this.totalRows() - row;
    const columnsRight = this.totalColumns() - column;

    // clamp the values we are adding at the bounds of the grid
    const rowSpan = Math.min(rowsBelow, this._clipboard.length);
    const columnSpan = Math.min(columnsRight, this._clipboard[0].length);

    // Revert to the row index by region, which is what the grid expects.
    row = this._regionIndex(row, region);

    // set the data
    // TODO see if calling setData in for loop is bad for performance.
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
   * translate from the Grid's row IDs to our own standard
   */
  private _absoluteIndex(row: number, region: DataModel.CellRegion) {
    return region === 'column-header' ? 0 : row + 1;
  }

  /**
   * translate from our unique row ID to the Grid's standard
   */
  private _regionIndex(row: number, region: DataModel.CellRegion) {
    return region === 'column-header' ? 0 : row - 1;
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

  private _receiveModelSignal(
    emitter: DSVModel,
    message: DataModel.ChangedArgs
  ): void {
    if (message.type === 'rows-inserted') {
      // Update the rowMap to include added rows.
      const start = this._absoluteIndex(message.index, message.region);
      const numAdded = message.span;
      this._rowMap = this._rowMap.concat(
        toArray(range(start, start + numAdded))
      );
    }
    // Emit the change up to the Grid.
    this.emitChanged(message);
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
