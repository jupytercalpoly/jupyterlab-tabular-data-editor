import { DSVModel } from 'tde-csvviewer';
import { MutableDataModel, DataModel, SelectionModel } from 'tde-datagrid';
import { Litestore } from './litestore';
// import { toArray, range } from '@lumino/algorithm';
import { DSVEditor } from './widget';
import { Signal } from '@lumino/signaling';
import { ListField } from 'tde-datastore';
import { toArray, range } from '@lumino/algorithm';
// import { SplitPanel } from '@lumino/widgets';

export class EditorModel extends MutableDataModel {
  private _clipboard: Array<Array<string>>;
  private _litestore: Litestore | null;
  private _model: DSVModel;
  private _rowsAdded: number;
  private _columnsAdded: number;
  private _currentRows: number;
  private _onChangeSignal: Signal<
    this,
    DSVEditor.ModelChangedArgs
  > = new Signal<this, DSVEditor.ModelChangedArgs>(this);
  private _rowsRemoved: number;
  private _columnsRemoved: number;
  // private _onChangeSignal: Signal<this, string> = new Signal<this, string>(
  //   this
  // );

  constructor(options: DSVModel.IOptions) {
    super();
    // Define our model.
    this._model = new DSVModel(options);

    // Connect to the model's signals to recieve updates.
    this._model.changed.connect(this._receiveModelSignal, this);
    this._rowsAdded = 0;
    this._columnsAdded = 0;
    this._rowsRemoved = 0;
    this._columnsRemoved = 0;

    this._currentRows = this.totalRows();

    this._litestore = null;
  }

  get model(): DSVModel {
    return this._model;
  }

  get onChangedSignal(): Signal<this, DSVEditor.ModelChangedArgs> {
    return this._onChangeSignal;
  }

  get litestore(): Litestore {
    return this._litestore;
  }
  set litestore(value: Litestore) {
    this._litestore = value;
  }

  /**
   * The grid's current number of rows by region.
   *
   */
  rowCount(region: DataModel.RowRegion): number {
    if (region === 'body') {
      return this._model.rowCount('body') + this._rowsAdded - this._rowsAdded;
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
      return this._model.columnCount('body') + this._columnsAdded - this._columnsRemoved;
    }
    return 1;
  }

  /**
   * The grid's current number of rows. TOTAL, NOT BY REGION.
   */
  totalRows(): number {
    return (
      this._model.rowCount('body') + this._rowsAdded - this._rowsRemoved + 1
    );
  }

  /**
   * The grid's current number of columns. TOTAL, NOT BY REGION.
   *
   * Notes: This is equivalent to columnCount('body')
   */

  totalColumns(): number {
    return (
      this._model.columnCount('body') +
      this._columnsAdded -
      this._columnsRemoved
    );
  }

  data(region: DataModel.CellRegion, row: number, column: number): any {
    // The model is defered to if the region is a row header.
    if (region === 'row-header') {
      return this._model.data(region, row, column);
    }

    // The row comes to us as an index on a particular region. We need the
    // absolute index (ie index 0 is the first row of data).
    row = this._absoluteIndex(row, region);

    // unpack the maps from the LiteStore.
    const { rowMap, columnMap, valueMap } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });

    // Map from the cell on the grid to the cell in the model.
    row = rowMap[row];
    column = columnMap[column];

    // check if a new value has been stored at this cell.
    if (valueMap[`${row},${column}`] !== undefined) {
      return valueMap[`${row},${column}`];
    }

    if (row < 0 || column < 0) {
      // we are on a new column or row which has no maped
      // value, so we know that the value must be empty
      return '';
    }

    // the model's data method assumes the grid's row IDs.
    row = this._regionIndex(row, region);

    // fetch the value from the data
    return this._model.data(region, row, column);
  }

  setData(
    region: DataModel.CellRegion,
    row: number,
    column: number,
    values: any,
    rowSpan = 1,
    columnSpan = 1,
    useLitestore = true
  ): boolean {
    // The row comes to us as an index on a particular region. We need the
    // absolute index (ie index 0 is the first row of data).
    row = this._absoluteIndex(row, region);

    // unpack Litestore values.
    const { rowMap, columnMap } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });

    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};

    // Set up the update to the valueMap.
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
        key = `${currentRow},${currentColumn}`;
        valueUpdate[key] = values[i][j];
      }
    }

    // Add the valueMap update to the Litestore update.
    update.valueUpdate = valueUpdate;

    // Revert to the row index by region, which is what the grid expects.
    row = this._regionIndex(row, region);

    // Define the update for the grid.
    const gridUpdate: DataModel.ChangedArgs = {
      type: 'cells-changed',
      region,
      row,
      column,
      rowSpan,
      columnSpan
    };

    // Add the grid update to the liteStore update.
    update.gridUpdate = gridUpdate;

    // Add the use litestore boolean to see if we will actually update
    // on this iteration.
    update.useLitestore = useLitestore;

    // Emit the change.
    this._handleEmits(update);

    return true;
  }

  /**
   * @param start: the index at which to start adding rows.
   * @param span: the number of rows to add. Default is 1.
   *
   * Notes: this method (and all others that follow it)
   */
  addRows(region: DataModel.CellRegion, start: number, span = 1): void {
    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};

    // The row comes to us as an index on a particular region. We need the
    // absolute index (ie index 0 is the first row of data).
    start = this._absoluteIndex(start, region);

    // Unpack values from the litestore.
    const { rowMap, columnMap } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });

    // store the next span's worth of values.
    const values = [];
    let i = 0;
    while (i < span) {
      values.push(-(this.totalRows() + this._rowsAdded));
      i++;
      this._rowsAdded++;
    }

    // Create the splice data for the litestore.
    const rowUpdate = {
      index: start,
      remove: 0,
      values
    };

    // Add the rowUpdate to the litestore update object.
    update.rowUpdate = rowUpdate;

    // Update the row count.
    this._rowsAdded += span;

    // Revert to the row index by region, which is what the grid expects.
    start = this._regionIndex(start, region);

    // Define the update for the grid.
    const gridUpdate: DataModel.ChangedArgs = {
      type: 'rows-inserted',
      region: 'body',
      index: start,
      span: span
    };

    // Add the change to the litestore update object.
    update.gridUpdate = gridUpdate;

    // Get the grid change record update args
    const updateArgs = {
      currentRows: rowMap.length,
      currentColumns: columnMap.length,
      change: gridUpdate
    };

    // Log the update to the grid.
    const gridChangeRecordUpdate = {
      index: 0,
      remove: 0,
      values: [updateArgs]
    };
    update.gridChangeRecordUpdate = gridChangeRecordUpdate;

    // Emit the update object for the grid & editor.
    this._handleEmits(update);
  }

  /**
   *
   * @param start the index at which to start adding columns.
   * @param span the number of columns to add. Default is 1.
   */
  addColumns(region: DataModel.CellRegion, start: number, span = 1): void {
    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};

    // Unpack values from the litestore.
    const { columnMap, rowMap } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });
    const values = [];
    const columnHeaders: { [key: string]: string } = {};
    let i = 0;
    while (i < span) {
      values.push(-(this.totalColumns() + this._columnsAdded));
      columnHeaders[`0,${columnMap.length}`] = `Column ${start + i + 1}`;
      i++;
      this._columnsAdded++
    }

    // Create the splice data for the litestore.
    const columnUpdate = {
      index: start,
      remove: 0,
      values
    };

    // Add the column update to the litestore update object.
    update.columnUpdate = columnUpdate;

    // Define the update for the grid.
    const gridUpdate: DataModel.ChangedArgs = {
      type: 'columns-inserted',
      region: 'body',
      index: start,
      span: span
    };

    // Add the change to the litestore update object.
    update.gridUpdate = gridUpdate;

    // Get the grid change record update args
    const updateArgs = {
      currentRows: rowMap.length,
      currentColumns: columnMap.length,
      change: gridUpdate
    };

    // Log the update to the grid.
    const gridChangeRecordUpdate = {
      index: 0,
      remove: 0,
      values: [updateArgs]
    };
    update.gridChangeRecordUpdate = gridChangeRecordUpdate;

    // Emit the update object for the grid & editor.
    this._handleEmits(update);
  }

  /**
   *
   * @param start the index to start removing the rows
   * @param span the number of rows to remove
   */
  removeRows(region: DataModel.CellRegion, start: number, span = 1): void {
    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};

    // The row comes to us as an index on a particular region. We need the
    // absolute index (ie index 0 is the first row of data).
    start = this._absoluteIndex(start, region);

    // Unpack values from the litestore.
    const { columnMap, rowMap } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });

    // Create the row update object for the litestore.
    const nullValues: number[] = [];
    const rowUpdate = {
      index: start,
      remove: span,
      values: nullValues
    };

    // Add the rowUpdate to the litestore update object.
    update.rowUpdate = rowUpdate;

    // Update the row count.
    this._rowsRemoved += span;

    // Revert to the row index by region, which is what the grid expects.
    start = this._regionIndex(start, region);

    // Define the update for the grid.
    const gridUpdate: DataModel.ChangedArgs = {
      type: 'rows-removed',
      region: 'body',
      index: start,
      span: span
    };

    // Add the change to the litestore update object.
    update.gridUpdate = gridUpdate;

    // Get the grid change record update args
    const updateArgs = {
      currentRows: rowMap.length,
      currentColumns: columnMap.length,
      change: gridUpdate
    };

    // Log the update to the grid.
    const gridChangeRecordUpdate = {
      index: 0,
      remove: 0,
      values: [updateArgs]
    };
    update.gridChangeRecordUpdate = gridChangeRecordUpdate;

    // Emit the change.
    this._handleEmits(update);
  }

  /**
   *
   * @param start the index to start removing the columns
   * @param span the number of columns to remove
   */
  removeColumns(region: DataModel.CellRegion, start: number, span = 1): void {
    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};

    // Unpack values from the litestore.
    const { rowMap, columnMap } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });

    // Create the column update object for the litestore.
    const nullValues: number[] = [];
    const columnUpdate = {
      index: start,
      remove: span,
      values: nullValues
    };

    // Add the columnUpdate to the litestore update object.
    update.columnUpdate = columnUpdate;

    // Update the column count.
    this._columnsRemoved += span;

    // Define the update for the grid.
    const gridUpdate: DataModel.ChangedArgs = {
      type: 'columns-removed',
      region: 'body',
      index: start,
      span: span
    };

    // Add the change to the litestore update object.
    update.gridUpdate = gridUpdate;

    // Get the grid change record update args
    const updateArgs = {
      currentRows: rowMap.length,
      currentColumns: columnMap.length,
      change: gridUpdate
    };

    // Log the update to the grid.
    const gridChangeRecordUpdate = {
      index: 0,
      remove: 0,
      values: [updateArgs]
    };
    update.gridChangeRecordUpdate = gridChangeRecordUpdate;

    // Emit the change.
    this._handleEmits(update);
  }

  /**
   *
   * @param start the index of the first row to move
   * @param end the index to insert the first row
   * @param span the number of rows moving
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

    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};

    // Unpack values from the litestore.
    const { rowMap, columnMap } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });

    const rowUpdate = this.rowMapSplice(rowMap, start, end, span);

    // Add the rowUpdate to the litestore update object.
    update.rowUpdate = rowUpdate;

    // Revert to the row index by region, which is what the grid expects.
    start = this._regionIndex(start, region);
    end = this._regionIndex(end, region);

    // Define the update for the grid.
    const gridUpdate: DataModel.ChangedArgs = {
      type: 'rows-moved',
      region: 'body',
      index: start,
      span: span,
      destination: end
    };

    // Add the grid update to the litestore update object.
    update.gridUpdate = gridUpdate;

    // Get the grid change record update args.
    const updateArgs = {
      currentRows: rowMap.length,
      currentColumns: columnMap.length,
      change: gridUpdate
    };

    // Log the update to the grid.
    const gridChangeRecordUpdate = {
      index: 0,
      remove: 0,
      values: [updateArgs]
    };
    update.gridChangeRecordUpdate = gridChangeRecordUpdate;

    // Emit the change.
    this._handleEmits(update);
  }

  rowMapSplice(
    rowMap: ListField.Value<number>,
    start: number,
    end: number,
    span: number
  ): ListField.Splice<number>[] {
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
    return rowSplice;
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

    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};

    // Unpack values from the litestore.
    const { columnMap, rowMap } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });

    const columnUpdate = this.columnMapSplice(columnMap, start, end, span);

    // Add the columnUpdate to the litestore update object.
    update.columnUpdate = columnUpdate;

    // Define the update for the grid.
    const gridUpdate: DataModel.ChangedArgs = {
      type: 'columns-moved',
      region: 'body',
      index: start,
      span: span,
      destination: end
    };

    // Add the grid update to the litestore update object.
    update.gridUpdate = gridUpdate;

    // Get the grid change record update args
    const updateArgs = {
      currentRows: rowMap.length,
      currentColumns: columnMap.length,
      change: gridUpdate
    };

    // Log the update to the grid.
    const gridChangeRecordUpdate = {
      index: 0,
      remove: 0,
      values: [updateArgs]
    };
    update.gridChangeRecordUpdate = gridChangeRecordUpdate;

    // Emit the change.
    this._handleEmits(update);
  }

  columnMapSplice(
    columnMap: ListField.Value<number>,
    start: number,
    end: number,
    span: number
  ): ListField.Splice<number>[] {
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

    return columnSplice;
  }

  inverseSpliceParams(start: number, end: number, span: number) {
    let iStart, iEnd: number;
    if (start < end) {
      iStart = end - span + 1;
      iEnd = start;
      return [iStart, iEnd];
    }
    iStart = end;
    iEnd = start + span - 1;
    return [iStart, iEnd];
  }

  /**
   * Clears the contents of the selected region
   * Keybind: ['Backspace']
   */
  clearContents(
    region: DataModel.CellRegion,
    selection: SelectionModel.Selection
  ): void {
    // Unpack the selection.
    const { r1, r2, c1, c2 } = selection;

    // Set up variables for the different possible regions.
    let row, column, rowSpan, columnSpan: number;

    switch (region) {
      case 'corner-header': {
        // we don't clear all cells, so bail early
        return;
      }
      case 'column-header': {
        // Set up arguments for clearColumns method.
        column = Math.min(c1, c2);
        columnSpan = Math.abs(c1 - c2) + 1;

        // Clear the columns.
        this._clearColumns('body', column, columnSpan);
        break;
      }
      case 'row-header': {
        // Set up arguments for clearRows method.
        row = Math.min(r1, r2);
        rowSpan = Math.abs(r1 - r2) + 1;

        // Clear the rows.
        this._clearRows('body', row, rowSpan);
        break;
      }
      case 'body': {
        // Set up args for setData.
        row = Math.min(r1, r2);
        rowSpan = Math.abs(r1 - r2) + 1;
        column = Math.min(c1, c2);
        columnSpan = Math.abs(c1 - c2) + 1;

        // Set the values to an array of blanks.
        const values = new Array(rowSpan)
          .fill(0)
          .map(elem => new Array(columnSpan).fill(''));

        // Set the data.
        this.setData('body', row, column, values, rowSpan, columnSpan);
      }
    }
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
    // copy the values
    this.copy(region, row, column, rowSpan, columnSpan);

    // Fill in the new blank values.
    const values = new Array(rowSpan)
      .fill('')
      .map(elem => new Array(columnSpan).fill(''));

    // set the new data.
    this.setData(region, row, column, values, rowSpan, columnSpan);
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

    // Revert to the row index by region, which is what setData expects.
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

    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};

    // submit a signal to the DataGrid based on the change.
    switch (change.type) {
      case 'cells-changed':
        // add the visual element of reselecting the cell where the change happened.

        update.gridUpdate = {
          type: 'cells-changed',
          region: 'body',
          row: change.row,
          column: change.column,
          rowSpan: change.rowSpan,
          columnSpan: change.columnSpan
        };
        break;
      case 'rows-inserted':
        update.gridUpdate = {
          type: 'rows-removed',
          region: 'body',
          index: change.index,
          span: change.span
        };
        this._rowsRemoved += update.gridUpdate.span;
        break;
      case 'columns-inserted':
        update.gridUpdate = {
          type: 'columns-removed',
          region: 'body',
          index: change.index,
          span: change.span
        };
        this._columnsRemoved += change.span;
        break;
      case 'rows-removed':
        update.gridUpdate = {
          type: 'rows-inserted',
          region: 'body',
          index: change.index,
          span: change.span
        };
        this._rowsAdded += update.gridUpdate.span;
        break;
      case 'columns-removed':
        update.gridUpdate = {
          type: 'columns-inserted',
          region: 'body',
          index: change.index,
          span: change.span
        };
        this._columnsAdded += update.gridUpdate.span;
        break;
      case 'rows-moved':
        update.gridUpdate = {
          type: 'rows-moved',
          region: 'body',
          index: change.destination,
          destination: change.index,
          span: change.span
        };
        break;
      case 'columns-moved':
        update.gridUpdate = {
          type: 'columns-moved',
          region: 'body',
          index: change.destination,
          destination: change.index,
          span: change.span
        };
        break;
    }

    // Set declaration that we are not using the litestore (as the undo has already been made).
    update.useLitestore = false;

    this._handleEmits(update);
  }

  redo(change: DataModel.ChangedArgs): void {
    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};

    // Add the change to the grid update
    update.gridUpdate = change;

    switch (change.type) {
      case 'columns-inserted': {
        this._columnsAdded += change.span;
        break;
      }
      case 'columns-removed': {
        this._columnsRemoved += change.span;
        break;
      }
      case 'rows-inserted': {
        this._rowsAdded += change.span;
        break;
      }
      case 'rows-removed': {
        this._rowsRemoved += change.span;
      }
    }

    // Emit the change.
    this._handleEmits(update);
  }

  updateString(): void {
    // Get the current litestore values.
    // Unpack the columnMap from the litestore.
    const { rowMap, columnMap, gridChangeRecord } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });
    // Get the total count for the row/column values used by adding back the ones removed.
    const rowValuesUsed = rowMap.length + this._rowsRemoved;
    const columnvaluesUsed = columnMap.length + this._columnsRemoved;

    const [inverseRowMap, inverseColumnMap] = this._invertMaps(
      gridChangeRecord,
      rowValuesUsed,
      columnvaluesUsed
    );
    console.log('maps', rowMap, columnMap);
    console.log('inverse maps', inverseRowMap, inverseColumnMap);
    console.log('2 of rowMap', rowMap.indexOf(2) === inverseRowMap[2]);
    console.log('1 of rowMap', rowMap.indexOf(1) === inverseRowMap[1]);
    console.log('1 of columnMap', columnMap.indexOf(1) === inverseColumnMap[1]);
    console.log(
      'columnMap.indexOf(2)',
      columnMap.indexOf(2),
      'inverseColumnMap[2]',
      inverseColumnMap[2],
      'same?',
      columnMap.indexOf(2) === inverseColumnMap[2]
    );
    console.log('0 of columnMap', columnMap.indexOf(0) === inverseColumnMap[0]);

    // this.model.rawData = serializer(rowMap, columnMap, this._model);
  }

  private _invertMaps(
    gridChangeRecord: ListField.Value<DSVEditor.GridChangeRecordArgs>,
    rows: number,
    columns: number
  ): Array<Array<number>> {
    // Initialize the updates to the inverse row map and inverse column map
    // with the initial update splice.
    const inverseRowMap = toArray(range(0, rows));
    const inverseColumnMap = toArray(range(0, columns));

    // Iterate through each change record, adding to the
    // inverse column update and inverse row udpate when appropriate.
    let changeArg: DSVEditor.GridChangeRecordArgs;
    let change: DataModel.ChangedArgs;
    let values: number[] = [];
    for (let i = 0; i < gridChangeRecord.length; i++) {
      changeArg = gridChangeRecord[i];
      switch (changeArg.change.type) {
        case 'rows-inserted': {
          change = changeArg.change as DataModel.RowsChangedArgs;
          // The inverse change is to move a span's worth of values
          // starting from the insert point to just beyond the current length.
          values = inverseRowMap.splice(change.index, change.span);
          inverseRowMap.splice(changeArg.currentRows, 0, ...values);
          break;
        }
        case 'columns-inserted': {
          change = changeArg.change as DataModel.ColumnsChangedArgs;
          // The inverse change is to move a span's worth of values
          // starting from the insert point to just beyond the current length.
          values = inverseColumnMap.splice(change.index, change.span);
          inverseRowMap.splice(changeArg.currentColumns, 0, ...values);
          break;
        }
        case 'rows-removed': {
          change = changeArg.change as DataModel.RowsChangedArgs;
          // The inverse change is to move a spans worth of items from
          // the end to the remove index.
          values = inverseRowMap.splice(
            inverseRowMap.length - change.span,
            change.span
          );
          inverseRowMap.splice(change.index, 0, ...values);
          break;
        }
        case 'columns-removed': {
          change = changeArg.change as DataModel.ColumnsChangedArgs;
          // The inverse change is to move a spans worth of items from
          // the end to the remove index.
          values = inverseColumnMap.splice(
            inverseColumnMap.length - change.span,
            change.span
          );
          inverseColumnMap.splice(change.index, 0, ...values);
          break;
        }
        case 'rows-moved': {
          change = changeArg.change as DataModel.RowsMovedArgs;
          // The inverse change is to move a span's worth of values from the destination to the start.
          values = inverseRowMap.splice(change.destination, change.span);
          inverseRowMap.splice(change.index, 0, ...values);
          break;
        }
        case 'columns-moved': {
          change = changeArg.change as DataModel.ColumnsMovedArgs;
          // The inverse change is to move a span's worth of values from the destination to the start.
          values = inverseColumnMap.splice(change.destination, change.span);
          inverseColumnMap.splice(change.index, 0, ...values);
          break;
        }
        case "cells-changed": {
          change = changeArg.change as DataModel.CellsChangedArgs;
          // trickiest case. This is when there was a clear operation. We first need to see whether
          // columns were cleared or rows were cleared.

          // Get the columns that were presesnt at the time.
          columns = changeArg.currentColumns;

          // We assume that if all of the columns were cleared then this is row clear operation.
          if (columns === change.columnSpan) {
            // The inverse of this change is a dual operation. First, grab a span of
            values = inverseRowMap.splice(change.row, change.rowSpan, 0);
            inverseRowMap.splice(changeArg.currentRows - change.rowSpan, 0, ...values);
            values = inverseRowMap.splice(inverseRowMap.length - change.rowSpan, change.row + change.rowSpan)
            break;
          };
          // The inverse of this change is a dual operation. First, grab a span of
          values = inverseColumnMap.splice(change.column, change.columnSpan, 0);
          inverseColumnMap.splice(changeArg.currentColumns - change.columnSpan, 0, ...values);
          values = inverseColumnMap.splice(inverseColumnMap.length - change.columnSpan, change.column + change.columnSpan)
          break;
        }
      }
    }

    return [inverseRowMap, inverseColumnMap];
  }

  private _clearRows(
    region: DataModel.CellRegion,
    start: number,
    span = 1
  ): void {
    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};

    // The row comes to us as an index on a particular region. We need the
    // absolute index (ie index 0 is the first row of data).
    start = this._absoluteIndex(start, region);

    // Unpack values from the litestore.
    const { rowMap, columnMap } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });

    // Set up values to stand in for the blank rows.
    const values = [];
    let i = 0;
    while (i < span) {
      values.push(-(this.totalRows() + this._rowsAdded));
      i++;
      this._rowsAdded++;
    }

    this._rowsRemoved += span;

    // Set up the row splice object to update the litestore.
    const rowUpdate = {
      index: start,
      remove: span,
      values
    };

    // Add the rowUpdate to the litestore update object.
    update.rowUpdate = rowUpdate;

    // Revert to the row index by region, which is what the grid expects.
    start = this._regionIndex(start, region);

    // The DataGrid is slow to process a cells-change argument with
    // a very large span, so in this instance we elect to use the "big
    // hammer".

    let gridUpdate: DataModel.ChangedArgs = { type: 'model-reset' };

    // Add the change to the litestore update object.
    update.gridUpdate = gridUpdate;

    // Redefine the grid update for the change record so it is more descriptive.
    gridUpdate = {
      region,
      type: 'cells-changed',
      row: start,
      rowSpan: span,
      column: 0,
      columnSpan: this.model.rowCount('body')
    };

    // Get the grid change record update args
    const updateArgs = {
      currentRows: rowMap.length,
      currentColumns: columnMap.length,
      change: gridUpdate
    };

    // Log the update to the grid.
    const gridChangeRecordUpdate = {
      index: 0,
      remove: 0,
      values: [updateArgs]
    };
    update.gridChangeRecordUpdate = gridChangeRecordUpdate;
    // Emit the change.
    this._handleEmits(update);
  }

  private _clearColumns(region: DataModel.CellRegion, start: number, span = 1) {
    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};

    // Unpack values from the litestore.
    const { columnMap, rowMap } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });

    // Set up values to stand in for the blank columns.
    const values = [];
    let i = 0;
    while (i < span) {
      values.push(-(this.totalColumns() + this._columnsAdded));
      i++;
      this._columnsAdded++;
    }

    this._columnsRemoved += span;

    // Set up the column splice object to update the litestore.
    const columnUpdate = {
      index: start,
      remove: span,
      values
    };

    // Add the columnUpdate to the litestore update object.
    update.columnUpdate = columnUpdate;

    // The DataGrid is slow to process a cells-change argument with
    // a very large span, so in this instance we elect to use the "big
    // hammer".
    let gridUpdate: DataModel.ChangedArgs = { type: 'model-reset' };

    // Add the change to the litestore update object.
    update.gridUpdate = gridUpdate;

    // Redefine the grid update for the change record so it is more descriptive.
    gridUpdate = {
      region,
      type: 'cells-changed',
      row: 0,
      rowSpan: this.model.rowCount('body'),
      column: start,
      columnSpan: span
    };

    // Get the grid change record update args
    const updateArgs = {
      currentRows: rowMap.length,
      currentColumns: columnMap.length,
      change: gridUpdate
    };

    // Log the update to the grid.
    const gridChangeRecordUpdate = {
      index: 0,
      remove: 0,
      values: [updateArgs]
    };
    update.gridChangeRecordUpdate = gridChangeRecordUpdate;

    // Emit the change.
    this._handleEmits(update);
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

  private _handleEmits(update: DSVEditor.ModelChangedArgs): void {
    // Emits the grid update to the grid.
    if (update.gridUpdate) {
      this.emitChanged(update.gridUpdate);
    }

    // An undefined useLitestore property will automatically be labeled
    // as true.
    if (update.useLitestore === undefined) {
      update.useLitestore = true;
    }

    // emit the update to the Editor for updating the litestore.
    this._onChangeSignal.emit(update);
  }

  private _receiveModelSignal(
    emitter: DSVModel,
    message: DataModel.ChangedArgs
  ): void {
    if (message.type === 'rows-inserted') {
      const start = this._currentRows;
      const span = message.span;
      this.addColumns('body', start, span);
    }
  }

  // private _invertUpdate(type: MapUpdate, update: ListField.Splice<number>, map: ListField.Value<number>): ListField.Update<number> {
  //   let inverseUpdate: ListField.Update<number>;
  //   const noValues: number[] = [];
  //   switch(type) {
  //     case 'add': {
  //       // For inverting, we treat addition as moving a span of values from the end of the array to the insertion
  //       // point. The inverse of this is moving a span of values from the start to the end of the array.
  //       inverseUpdate = [
  //         { index: update.index, remove: update.remove, values: noValues },
  //         { index: map.length, remove: 0, values: update.values }
  //       ];
  //       break;
  //     }
  //     case 'remove': {
  //       // For inverting, we treat removal as the opposite of how we treat addition, as a moving a span of
  //       // values from the index to the end fo the array. The inverse is moving from the end to the index.
  //       inverseUpdate = [
  //         { index: map.length, remove: update.remove, values: noValues },
  //         { index: update.index, remove: 0, values: update.values }
  //       ];
  //       break;
  //     }
  //     case 'move': {
  //       break;
  //     }
  //     case 'clear': {
  //       break;
  //     }
  //   }
  //   return
  // }
}

export type MapUpdate = 'add' | 'remove' | 'move' | 'clear';
