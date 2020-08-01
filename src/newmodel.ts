import { DSVModel } from 'tde-csvviewer';
import { MutableDataModel, DataModel } from 'tde-datagrid';
import { Fields, MapField, ListField } from 'tde-datastore';
import { Litestore } from './litestore';
import { toArray, range } from '@lumino/algorithm';

export class EditorModel extends MutableDataModel {
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

    // we will give added rows/columns a numeric value.
    // It is natural to start them at 0.5 and increment by 1.
    this._nextRow = 0.5;
    this._nextColumn = 0.5;

    // **Add initial values for the Litestore**

    // Arrays which map the requested row/column to the
    // row/column where the data actually lives, initially
    // set to [0, 1, ..., total rows - 1] & [0, 1, ..., total columns - 1]
    const rowValues = toArray(range(0, this.totalRows()));
    const columnValues = toArray(range(0, this.totalColumns()));
    const rowSplice = { index: 0, remove: 0, values: rowValues };
    const columnSplice = { index: 0, remove: 0, values: columnValues };

    // initialize the litestore
    this.litestore = new Litestore({ id: 0, schemas: [DATAMODEL_SCHEMA] });

    // update the lightstore
    this._updateLitestore({ rowSplice, columnSplice });
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

    // unpack the maps from the LiteStore.
    const { rowMap, columnMap, valueMap } = this.litestore.getRecord({
      schema: DATAMODEL_SCHEMA,
      record: RECORD_ID
    });

    // Map from the cell on the grid to the cell in the model.
    row = rowMap[row];
    column = columnMap[column];

    // check if a new value has been stored at this cell.
    if (valueMap[`${row}, ${column}`]) {
      return valueMap[`${row}, ${column}`];
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
    values: any,
    rowSpan = 1,
    columnSpan = 1,
    updating = true
  ): boolean {
    // The row comes to us as an index on a particular region. We need the
    // absolute index (ie index 0 is the first row of data).
    row = this._absoluteIndex(row, region);

    // unpack Litestore values.
    const { rowMap, columnMap } = this.litestore.getRecord({
      schema: DATAMODEL_SCHEMA,
      record: RECORD_ID
    });

    // Set up an udate object for the litestore.
    const valueUpdate: { [key: string]: string } = {};

    // If we got a singleton, coerce it into an array.
    values = Array.isArray(values) ? values : [[values]];

    // set up a loop to go through each value.
    let currentRow: number;
    let currentColumn: number;
    let key: string;
    for (let i = 0; i < rowSpan; i++) {
      currentRow = rowMap[row + i];
      for (let j = 0; j < columnSpan; j++) {
        currentColumn = columnMap[column + j];
        key = `${currentRow}, ${currentColumn}`;
        valueUpdate[key] = values[i][j];
      }
    }

    // Revert to the row index by region, which is what the grid expects.
    row = this._regionIndex(row, region);

    // Define the change.
    const change: DataModel.ChangedArgs = {
      type: 'cells-changed',
      region,
      row,
      column,
      rowSpan,
      columnSpan
    };

    if (updating) {
      // Update the litestore.
      this._updateLitestore({ valueUpdate, change });

      // Emit the change.
      this._handleEmits(change);
    }
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

    // store the next span's worth of values.
    const values = [];
    let i = 0;
    while (i < span) {
      values.push(this._nextRow);
      i++;
      this._nextRow++;
      this._rowsAdded++;
    }

    // Create the splice data.
    const rowSplice = { index: start, remove: 0, values };

    // Revert to the row index by region, which is what the grid expects.
    start = this._regionIndex(start, region);

    // Define the change.
    const change: DataModel.ChangedArgs = {
      type: 'rows-inserted',
      region: 'body',
      index: start,
      span: span
    };

    // Have the Litestore apply the splice.
    this._updateLitestore({ rowSplice, change });

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
    const columnHeaders: { [key: string]: string } = {};
    let i = 0;
    while (i < span) {
      values.push(this._nextColumn);
      columnHeaders[`0, ${this._nextColumn}`] = `Column ${start + i + 1}`;
      i++;
      this._nextColumn++;
      this._columnsAdded++;
    }

    // Create the splice data for the litestore.
    const columnSplice = { index: start, remove: 0, values };

    // Define the change.
    const change: DataModel.ChangedArgs = {
      type: 'columns-inserted',
      region: 'body',
      index: start,
      span: span
    };

    // Update the litestore.
    this._updateLitestore({ columnSplice, valueUpdate: columnHeaders, change });

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

    // Create the splice object for the litestore.
    const values: number[] = [];
    const rowSplice = { index: start, remove: span, values };

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

    // Update the litestore.
    this._updateLitestore({ rowSplice, change });

    // Emit the change.
    this._handleEmits(change);
  }

  /**
   *
   * @param start the index to start removing the columns
   * @param span the number of columns to remove
   */

  removeColumns(region: DataModel.CellRegion, start: number, span = 1): void {
    // Create the splice object for the litestore.
    const values: number[] = [];
    const columnSplice = { index: start, remove: span, values };

    // Update the column count.
    this._columnsAdded -= span;

    // Define the change.
    const change: DataModel.ChangedArgs = {
      type: 'columns-removed',
      region: 'body',
      index: start,
      span: span
    };

    // Update the litestore.
    this._updateLitestore({ columnSplice, change });

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

    // Unpack the rowMap from the litestore.
    const { rowMap } = this.litestore.getRecord({
      schema: DATAMODEL_SCHEMA,
      record: RECORD_ID
    });

    // Get the values of the moving rows.
    const valuesMoving = rowMap.slice(start, start + span);

    // Figure out which way we are moving.
    const directionMoving = start < end ? 'down' : 'up';

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

    // Create the splice object for the Litestore.
    const noValue: number[] = [];
    const rowSplice = [
      { index: start, remove: span, values: noValue },
      { index: destination, remove: 0, values: valuesMoving }
    ];

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

    // Update the litestore.
    this._updateLitestore({ rowSplice, change });

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

    // Unpack the columnMap from the litestore.
    const { columnMap } = this.litestore.getRecord({
      schema: DATAMODEL_SCHEMA,
      record: RECORD_ID
    });

    // Get the values of the moving columns.
    const valuesMoving = columnMap.slice(start, start + span);

    // need to figure out which way we are moving. This is based
    // on the REAL columns start and end
    const directionMoving = start < end ? 'right' : 'left';

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

    // Create the splice object for the Litestore.
    const noValue: number[] = [];
    const columnSplice = [
      { index: start, remove: span, values: noValue },
      { index: destination, remove: 0, values: valuesMoving }
    ];

    // Define the change.
    const change: DataModel.ChangedArgs = {
      type: 'columns-moved',
      region: 'body',
      index: start,
      span: span,
      destination: end
    };

    // Update the litestore.
    this._updateLitestore({ columnSplice, change });

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
    this._clipboard = new Array(rowSpan)
      .fill(0)
      .map(elem => new Array(columnSpan).fill(0));
    for (let i = 0; i < rowSpan; i++) {
      for (let j = 0; j < columnSpan; j++) {
        // make a temporary copy of the values
        this._clipboard[i][j] = this.data(region, row + i, column + j);
      }
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
    this.setData(
      region,
      row,
      column,
      [...this._clipboard],
      rowSpan,
      columnSpan
    );
  }

  undo(change: DataModel.ChangedArgs): void {
    // Bail early if there is no change.
    if (!change) {
      return;
    }

    // Undo
    this.litestore.undo();

    // submit a signal to the DataGrid based on the change.
    let undoChange: DataModel.ChangedArgs;
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
    this.litestore.redo();
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

  private _updateLitestore(updates: LitestoreChangeArgs) {
    const { rowSplice, columnSplice, valueUpdate: newValue, change } = updates;
    const nullValue: number[] = [];
    const nullSplice = { index: 0, remove: 0, values: nullValue };
    this.litestore.beginTransaction();
    this.litestore.updateRecord(
      {
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      },
      {
        rowMap: rowSplice || nullSplice,
        columnMap: columnSplice || nullSplice,
        valueMap: newValue || null,
        change: change || null
      }
    );
    this.litestore.endTransaction();
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
      // Create a row splice object to update the litestore.
      const start = this._absoluteIndex(message.index, message.region);
      const numAdded = message.span;
      const values = toArray(range(start, start + numAdded));
      const rowSplice = { index: start, remove: 0, values };

      // update the litestore
      this._updateLitestore({ change: message, rowSplice });
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
    rowMap: Fields.List<number>(),
    columnMap: Fields.List<number>(),
    valueMap: Fields.Map<string>(),
    change: Fields.Register<DataModel.ChangedArgs>({
      value: { type: 'model-reset' }
    })
  }
};

export type LitestoreChangeArgs = {
  rowSplice?: ListField.Update<number>;
  columnSplice?: ListField.Update<number>;
  valueUpdate?: MapField.Update<string>;
  change?: DataModel.ChangedArgs;
};
