import { DSVModel } from 'tde-csvviewer';
import { MutableDataModel, DataModel, SelectionModel } from 'tde-datagrid';
import { Litestore } from './litestore';
// import { toArray, range } from '@lumino/algorithm';
import { DSVEditor } from './widget';
import { Signal } from '@lumino/signaling';
import { ListField, MapField, RegisterField } from 'tde-datastore';
import { toArray, range } from '@lumino/algorithm';
// import { SplitPanel } from '@lumino/widgets';

export class EditorModel extends MutableDataModel {
  private _clipboard: Array<Array<string>>;
  private _litestore: Litestore | null;
  private _model: DSVModel;
  private _rowsAdded: number;
  private _columnsAdded: number;
  private _onChangeSignal = new Signal<this, DSVEditor.ModelChangedArgs | null>(
    this
  );
  private _rowsRemoved: number;
  private _columnsRemoved: number;
  private _saving = false;
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

    this._litestore = null;
  }
  /**
   * The model which holds the string containing the contents of the file.
   */
  get model(): DSVModel {
    return this._model;
  }

  /**
   * A signal that emits when data is set to notify the Editor.
   */
  get onChangedSignal(): Signal<this, DSVEditor.ModelChangedArgs> {
    return this._onChangeSignal;
  }

  /**
   * The datastore used by the this class to read properties.
   */
  get litestore(): Litestore {
    return this._litestore;
  }
  /**
   * The setter used by parent classes to intialize the litestore.
   */
  set litestore(value: Litestore) {
    this._litestore = value;
  }

  /**
   * The grid's current number of rows by region.
   * NOTE: we add one so that a ghost row appears.
   *
   */
  rowCount(region: DataModel.RowRegion): number {
    if (region === 'body') {
      return (
        this._model.rowCount('body') + this._rowsAdded - this._rowsRemoved + 1
      );
    }
    return 1;
  }

  /**
   * The grid's current number of columns by region.
   *
   * Note: the UI components use this method to get the column count
   * so it should reflect the grid's columns.
   * NOTE: we add 1 so that a ghost column appears.
   */
  columnCount(region: DataModel.ColumnRegion): number {
    if (region === 'body') {
      return (
        this._model.columnCount('body') +
        this._columnsAdded -
        this._columnsRemoved +
        1
      );
    }
    return 1;
  }

  /**
   * The grid's current number of rows. TOTAL, NOT BY REGION.
   */
  get totalRows(): number {
    return (
      this._model.rowCount('body') + this._rowsAdded - this._rowsRemoved + 1
    );
  }

  /**
   * The grid's current number of columns. TOTAL, NOT BY REGION.
   *
   * Notes: This is equivalent to columnCount('body')
   */

  get totalColumns(): number {
    return (
      this._model.columnCount('body') +
      this._columnsAdded -
      this._columnsRemoved
    );
  }

  /**
   * This function is called by the datagrid to fill in values. It is called many times
   * and so should be efficient.
   */
  data(region: DataModel.CellRegion, row: number, column: number): any {
    // The model is defered to if the region is a row header.
    if (region === 'row-header') {
      if (row + 1 === this.rowCount('body')) {
        return '';
      }
      return this._model.data(region, row, column);
    }

    if (region === 'corner-header') {
      return;
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

    if (row === undefined || column === undefined) {
      return '';
    }

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

  /**
   * The method for setting data in a single cell.
   */
  setData(
    region: DataModel.CellRegion,
    row: number,
    column: number,
    values: any,
    rowSpan = 1,
    columnSpan = 1,
    update: DSVEditor.ModelChangedArgs | null = null
  ): boolean {
    // The row comes to us as an index on a particular region. We need the
    // absolute index (ie index 0 is the first row of data).
    row = this._absoluteIndex(row, region);

    // unpack Litestore values.
    const { rowMap, columnMap } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });
    const currentRows = rowMap.length;
    const currentColumns = columnMap.length;

    // Set up the update to the valueMap.
    const valueUpdate: { [key: string]: string } = {};

    if (update === null) {
      // TODO Feels like this function does too much. Can we have this if statement be
      // the only thing handled by setData and then the else handled by a different function?
      // Initialize an empty update if we are not provided with one.
      update = {};

      // Create the value update
      valueUpdate[`${rowMap[row]},${columnMap[column]}`] = values;

      // Add the valueMap update to the Litestore update.
      update.valueUpdate = valueUpdate;

      // Revert to the row index by region, which is what the grid expects.
      row = this._regionIndex(row, region);

      // Define the next change to the data model.
      const nextChange: DataModel.ChangedArgs = {
        type: 'cells-changed',
        region,
        row: row,
        column,
        rowSpan,
        columnSpan
      };

      // Get a snapshot of the current state of the grid.
      const gridState = {
        currentRows,
        currentColumns,
        nextChange
      };

      // Set the grid state update to the current state of the grid.
      update.gridStateUpdate = gridState;

      // Emit the model change to the datagrid.
      this.emitChanged(nextChange);

      this._onChangeSignal.emit(update);
      return true;
    } else {
      // If it is a singleton, coerce it into an array.
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

      // Define the next change to the data model.
      const nextChange: DataModel.ChangedArgs = {
        type: 'cells-changed',
        region,
        row: row,
        column,
        rowSpan,
        columnSpan
      };

      // Get a snapshot of the current state of the grid.
      const gridState = {
        currentRows,
        currentColumns,
        nextChange
      };

      // Set the grid state update to the current state of the grid.
      update.gridStateUpdate = gridState;

      // Emit the model change to the datagrid.
      this.emitChanged(nextChange);

      return true;
    }
  }

  /**
   * The method for setting data in a range of cells.
   */
  bulkSetData(
    rowArray: Array<number>,
    columnArray: Array<number>,
    value: string,
    startRow: number,
    startColumn: number,
    endRow: number,
    endColumn: number
  ): void {
    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};

    // Unpack values from the litestore.
    const { rowMap, columnMap } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });
    const currentRows = rowMap.length;
    const currentColumns = columnMap.length;

    let row: number;
    let column: number;
    // Set up the update to the valueMap.
    const valueUpdate: { [key: string]: string } = {};
    for (let i = 0; i <= rowMap.length; i++) {
      row = rowMap[this._absoluteIndex(rowArray[i], 'body')];
      column = columnMap[columnArray[i]];
      valueUpdate[`${row},${column}`] = value;
    }

    // Add the valueMap update to the Litestore update.
    update.valueUpdate = valueUpdate;

    // Define the next change to the data model.
    const nextChange: DataModel.ChangedArgs = {
      type: 'cells-changed',
      region: 'body',
      row: startRow,
      column: startColumn,
      rowSpan: endRow - startRow + 1,
      columnSpan: endColumn - startColumn + 1
    };

    // Get a snapshot of the current state of the grid.
    const gridState = {
      currentRows,
      currentColumns,
      nextChange
    };

    // Set the grid state update to the current state of the grid.
    update.gridStateUpdate = gridState;

    // Emit the model change to the datagrid.
    this.emitChanged(nextChange);
  }

  /**
   * Add rows to the Editor.
   */
  addRows(
    region: DataModel.CellRegion,
    start: number,
    span = 1
  ): DSVEditor.ModelChangedArgs {
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
    const currentRows = rowMap.length;
    const currentColumns = columnMap.length;

    // store the next span's worth of values.
    const values = [];
    let i = 0;
    while (i < span) {
      values.push(-(this.totalRows + this._rowsRemoved));
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

    // Revert to the row index by region, which is what the grid expects.
    start = this._regionIndex(start, region);

    // Define the next change to the data model.
    const nextChange: DataModel.ChangedArgs = {
      type: 'rows-inserted',
      region: 'body',
      index: start,
      span: span
    };

    // Get a snapshot of the current state of the grid.
    const gridState = {
      currentRows,
      currentColumns,
      nextChange
    };

    // Set the grid state update to the current state of the grid.
    update.gridStateUpdate = gridState;

    // Emit the model change to the datagrid.
    this.emitChanged(nextChange);

    return update;
  }

  /**
   * Add columns to the editor.
   */
  addColumns(
    region: DataModel.CellRegion,
    start: number,
    span = 1
  ): DSVEditor.ModelChangedArgs {
    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};

    // Unpack values from the litestore.
    const { columnMap, rowMap } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });
    const currentRows = rowMap.length;
    const currentColumns = columnMap.length;

    const values = [];
    const columnHeaders: { [key: string]: string } = {};
    let i = 0;
    let nextKey: number;
    while (i < span) {
      nextKey = -(this.totalColumns + this._columnsRemoved);
      values.push(nextKey);
      columnHeaders[`0,${nextKey}`] = `Column ${start + i + 1}`;
      i++;
      this._columnsAdded++;
    }

    // Add the column headers as the value update.
    update.valueUpdate = columnHeaders;

    // Create the splice data for the litestore.
    const columnUpdate = {
      index: start,
      remove: 0,
      values
    };

    // Add the column update to the litestore update object.
    update.columnUpdate = columnUpdate;

    // Define the next change to the data model.
    const nextChange: DataModel.ChangedArgs = {
      type: 'columns-inserted',
      region: 'body',
      index: start,
      span: span
    };

    // Get a snapshot of the current state of the grid.
    const gridState = {
      currentRows,
      currentColumns,
      nextChange
    };

    // Set the grid state update to the current state of the grid.
    update.gridStateUpdate = gridState;

    // Emit the model change to the datagrid.
    this.emitChanged(nextChange);

    return update;
  }

  /**
   * Add rows to the editor.
   */
  removeRows(
    region: DataModel.CellRegion,
    start: number,
    span = 1
  ): DSVEditor.ModelChangedArgs {
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
    const currentRows = rowMap.length;
    const currentColumns = columnMap.length;

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

    // Define the next change to the data model.
    const nextChange: DataModel.ChangedArgs = {
      type: 'rows-removed',
      region: 'body',
      index: start,
      span: span
    };

    // Get a snapshot of the current state of the grid.
    const gridState = {
      currentRows,
      currentColumns,
      nextChange
    };

    // Set the grid state update to the current state of the grid.
    update.gridStateUpdate = gridState;

    // Emit the model change to the datagrid.
    this.emitChanged(nextChange);

    // return the update object.
    return update;
  }

  /**
   * Remove rows from the editor.
   */
  removeColumns(
    region: DataModel.CellRegion,
    start: number,
    span = 1
  ): DSVEditor.ModelChangedArgs {
    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};

    // Unpack values from the litestore.
    const { rowMap, columnMap } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });
    const currentRows = rowMap.length;
    const currentColumns = columnMap.length;

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

    // Define the next change to the data model.
    const nextChange: DataModel.ChangedArgs = {
      type: 'columns-removed',
      region: 'body',
      index: start,
      span: span
    };

    // Get a snapshot of the current state of the grid.
    const gridState = {
      currentRows,
      currentColumns,
      nextChange
    };

    // Set the grid state update to the current state of the grid.
    update.gridStateUpdate = gridState;

    // Emit the model change to the datagrid.
    this.emitChanged(nextChange);

    return update;
  }

  /**
   * Move rows in the grid.
   */

  moveRows(
    region: DataModel.CellRegion,
    start: number,
    end: number,
    span: number
  ): DSVEditor.ModelChangedArgs {
    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};
    // Start and end come to us as an index on a particular region. We need the
    // absolute index (ie index 0 is the first row of data).
    start = this._absoluteIndex(start, region);
    end = this._absoluteIndex(end, region);

    // bail early if we are moving no distance
    if (start === end) {
      return;
    }

    // Unpack values from the litestore.
    const { rowMap, columnMap } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });
    const currentRows = rowMap.length;
    const currentColumns = columnMap.length;
    const nextCommand: DSVEditor.Commands = 'move-rows';

    const rowUpdate = this.rowMapSplice(rowMap, start, end, span);

    // Add the rowUpdate to the litestore update object.
    update.rowUpdate = rowUpdate;

    // Revert to the row index by region, which is what the grid expects.
    start = this._regionIndex(start, region);
    end = this._regionIndex(end, region);

    // Define the next change to the data model.
    const nextChange: DataModel.ChangedArgs = {
      type: 'rows-moved',
      region: 'body',
      index: start,
      span: span,
      destination: end
    };

    // Get a snapshot of the current state of the grid.
    const gridState = {
      currentRows,
      currentColumns,
      nextChange,
      nextCommand
    };

    // Set the grid state update to the current state of the grid.
    update.gridStateUpdate = gridState;

    // Emit the model change to the datagrid.
    this.emitChanged(nextChange);

    return update;
  }

  /**
   * Handles the computations involved in moving rows in the grid.
   */
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
   * Move columns in the grid.
   */
  moveColumns(
    region: DataModel.CellRegion,
    start: number,
    end: number,
    span: number
  ): DSVEditor.ModelChangedArgs {
    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};

    // bail early if we are moving no distance
    if (start === end) {
      return;
    }

    // Unpack values from the litestore.
    const { columnMap, rowMap } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });
    const currentRows = rowMap.length;
    const currentColumns = columnMap.length;
    const nextCommand: DSVEditor.Commands = 'move-columns';

    const columnUpdate = this.columnMapSplice(columnMap, start, end, span);

    // Add the columnUpdate to the litestore update object.
    update.columnUpdate = columnUpdate;

    // Define the next change to the data model.
    const nextChange: DataModel.ChangedArgs = {
      type: 'columns-moved',
      region: 'body',
      index: start,
      span: span,
      destination: end
    };

    // Get a snapshot of the current state of the grid.
    const gridState = {
      currentRows,
      currentColumns,
      nextChange,
      nextCommand
    };

    // Set the grid state update to the current state of the grid.
    update.gridStateUpdate = gridState;

    // Emit the model change to the datagrid.
    this.emitChanged(nextChange);

    return update;
  }

  /**
   * Handles computations associated with moving columns in the grid.
   */
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

  /**
   * Clear a region of cells in the grid.
   */
  clearCells(
    region: DataModel.CellRegion,
    selection: SelectionModel.Selection
  ): DSVEditor.ModelChangedArgs {
    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};

    // Unpack the selection.
    const { r1, r2, c1, c2 } = selection;
    const row = Math.min(r1, r2);
    const rowSpan = Math.abs(r1 - r2) + 1;
    const column = Math.min(c1, c2);
    const columnSpan = Math.abs(c1 - c2) + 1;

    // Set the values to an array of blanks.
    const values = new Array(rowSpan)
      .fill(0)
      .map(elem => new Array(columnSpan).fill(''));

    // Set the data.
    this.setData('body', row, column, values, rowSpan, columnSpan, update);
    return update;
  }

  /**
   * Clear rows in the grid.
   */
  clearRows(
    region: DataModel.CellRegion,
    start: number,
    span = 1
  ): DSVEditor.ModelChangedArgs {
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
    const currentRows = rowMap.length;
    const currentColumns = columnMap.length;

    // Set up values to stand in for the blank rows.
    const values = [];
    let i = 0;
    while (i < span) {
      values.push(-(this.totalRows + this._rowsRemoved));
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

    const gridUpdate: DataModel.ChangedArgs = { type: 'model-reset' };

    // Emit the model change to the datagrid.
    this.emitChanged(gridUpdate);

    // Define the next change to the data model.
    const nextChange: DataModel.ChangedArgs = {
      region,
      type: 'cells-changed',
      row: start,
      rowSpan: span,
      column: 0,
      columnSpan: currentColumns
    };

    // Get a snapshot of the current state of the grid.
    const gridState = {
      currentRows,
      currentColumns,
      nextChange
    };

    // Set the grid state update to the current state of the grid.
    update.gridStateUpdate = gridState;

    return update;
  }

  /**
   * Clear columns in the grid.
   */
  clearColumns(
    region: DataModel.CellRegion,
    start: number,
    span = 1
  ): DSVEditor.ModelChangedArgs {
    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};

    // Unpack values from the litestore.
    const { columnMap, rowMap } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });
    const currentRows = rowMap.length;
    const currentColumns = columnMap.length;

    // Set up values to stand in for the blank columns.
    const values = [];
    let i = 0;
    while (i < span) {
      values.push(-(this.totalColumns + this._columnsAdded));
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
    const gridUpdate: DataModel.ChangedArgs = { type: 'model-reset' };

    // Emit the model change to the datagrid.
    this.emitChanged(gridUpdate);

    // Define the next change to the data model.
    const nextChange: DataModel.ChangedArgs = {
      region,
      type: 'cells-changed',
      row: 0,
      rowSpan: currentRows,
      column: start,
      columnSpan: span
    };

    // Get a snapshot of the current state of the grid.
    const gridState = {
      currentRows,
      currentColumns,
      nextChange
    };

    // Set the grid state update to the current state of the grid.
    update.gridStateUpdate = gridState;

    return update;
  }

  /**
   * Cut a selection of cells.
   * NOTE: this method both copies the cells to the _clipboard property and clears them
   * from the region.
   */
  cut(
    region: DataModel.CellRegion,
    startRow: number,
    startColumn: number,
    endRow: number,
    endColumn: number
  ): DSVEditor.ModelChangedArgs {
    this.copy('body', startRow, startColumn, endRow, endColumn);

    return this.clearCells('body', {
      r1: startRow,
      r2: endRow,
      c1: startColumn,
      c2: endColumn
    });
  }

  /**
   * Copies a selection of data to the local propery _clipboard.
   * NOTE: this does not copy to the system clipboard. For this use the DataGrid method
   * copyToClipboard
   */
  copy(
    region: DataModel.CellRegion,
    startRow: number,
    startColumn: number,
    endRow: number,
    endColumn: number
  ): void {
    const rowSpan = Math.abs(startRow - endRow) + 1;
    const columnSpan = Math.abs(startColumn - endColumn) + 1;
    this._clipboard = new Array(rowSpan)
      .fill(0)
      .map(elem => new Array(columnSpan).fill(0));
    for (let i = 0; i < rowSpan; i++) {
      for (let j = 0; j < columnSpan; j++) {
        // make a temporary copy of the values
        this._clipboard[i][j] = this.data(
          region,
          startRow + i,
          startColumn + j
        );
      }
    }
  }
  /**
   * Paste a selection of cells onto the grid.
   * NOTE: this method first checks if we have data stored in our local clipboard. It
   * only checks for the data parameter if the local clipboard is empty.
   */
  paste(
    region: DataModel.CellRegion,
    row: number,
    column: number,
    data: string | null = null
  ): DSVEditor.ModelChangedArgs {
    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};
    if (data !== null) {
      // convert the copied data to an array
      this._clipboard = data.split('\n').map(elem => elem.split('\t'));
    }
    // Row comes to us as an index on a particular region. We need the
    // absolute index (ie index 0 is the first row of data).
    row = this._absoluteIndex(row, region);

    // see how much space we have
    const rowsBelow = this.totalRows - row;
    const columnsRight = this.totalColumns - column;

    // clamp the values we are adding at the bounds of the grid
    const rowSpan = Math.min(rowsBelow, this._clipboard.length);
    const columnSpan = Math.min(columnsRight, this._clipboard[0].length);

    // Revert to the row index by region, which is what setData expects.
    row = this._regionIndex(row, region);

    // set the data
    this.setData(
      'body',
      row,
      column,
      this._clipboard,
      rowSpan,
      columnSpan,
      update
    );
    return update;
  }

  /**
   * Emits the change which undoes the change passed in.
   */
  emitOppositeChange(change: DataModel.ChangedArgs): void {
    // Bail early if there is no change.
    if (!change) {
      return;
    }

    // Set up an udate object for the litestore.
    let gridUpdate: DataModel.ChangedArgs;

    // submit a signal to the DataGrid based on the change.
    switch (change.type) {
      case 'model-reset': {
        gridUpdate = { type: 'model-reset' };
        break;
      }
      case 'cells-changed':
        gridUpdate = {
          type: 'cells-changed',
          region: 'body',
          row: change.row,
          column: change.column,
          rowSpan: change.rowSpan,
          columnSpan: change.columnSpan
        };
        break;
      case 'rows-inserted':
        gridUpdate = {
          type: 'rows-removed',
          region: 'body',
          index: change.index,
          span: change.span
        };
        this._rowsRemoved += gridUpdate.span;
        break;
      case 'columns-inserted':
        gridUpdate = {
          type: 'columns-removed',
          region: 'body',
          index: change.index,
          span: change.span
        };
        this._columnsRemoved += change.span;
        break;
      case 'rows-removed':
        gridUpdate = {
          type: 'rows-inserted',
          region: 'body',
          index: change.index,
          span: change.span
        };
        this._rowsAdded += gridUpdate.span;
        break;
      case 'columns-removed':
        gridUpdate = {
          type: 'columns-inserted',
          region: 'body',
          index: change.index,
          span: change.span
        };
        this._columnsAdded += gridUpdate.span;
        break;
      case 'rows-moved':
        gridUpdate = {
          type: 'rows-moved',
          region: 'body',
          index: change.destination,
          destination: change.index,
          span: change.span
        };
        break;
      case 'columns-moved':
        gridUpdate = {
          type: 'columns-moved',
          region: 'body',
          index: change.destination,
          destination: change.index,
          span: change.span
        };
        break;
    }
    this.emitChanged(gridUpdate);

    this.onChangedSignal.emit(null);
  }

  /**
   * Emits the change which is passed in as an argument.
   */
  emitCurrentChange(change: DataModel.ChangedArgs): void {
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
    this.emitChanged(change);

    this.onChangedSignal.emit(null);
  }

  /**
   * Returns the serializes string with the changes added.
   */
  updateString(): string {
    // Get the current litestore values.
    // Setting saving to true blocks parseAsync from effecting the grid during serialization.
    this._saving = true;
    const { rowMap, columnMap, valueMap } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });
    // Get the total count for the row/column values used by adding back the ones removed.
    const rowValuesUsed = rowMap.length + this._rowsRemoved;
    const columnvaluesUsed = columnMap.length + this._columnsRemoved;

    const [inverseRowMap, inverseColumnMap] = this._invertMaps(
      rowValuesUsed,
      columnvaluesUsed
    );

    // Create a copy of the string to revert back to.
    const originalString = this._model.rawData;

    const newString = this._serializer(
      rowMap,
      columnMap,
      valueMap,
      inverseRowMap,
      inverseColumnMap
    );
    this._model.rawData = originalString;

    this._model.parseAsync();

    this._model.ready.then(() => (this._saving = false));

    return newString;
  }

  /**
   * Produces two arrays inverseRowMap and inverseColumnMap such that for each x
   * in rowMap, inverseRowMap[x] === rowMap.indexOf(x). Likewise for inverseColumnMap
   * and columnMap.
   */
  private _invertMaps(rows: number, columns: number): Array<Array<number>> {
    // Initialize the inverse row map and inverse column map
    const inverseRowMap = toArray(range(0, rows));
    const inverseColumnMap = toArray(range(0, columns));

    // Get a copy of the undo stack of transaction ids.
    const ids = [...this._litestore.transactionStore.undoStack];

    // Set up some helpful constants.
    let id: string;
    let change: DataModel.ChangedArgs;
    let values: number[] = [];
    let index: number;
    let destination: number;

    // Iterate through each transaction id starting with the most recent.
    while (ids.length > 0) {
      // Get the most recent ID.
      id = ids.pop();

      // Get the data store patch for this ID.
      const patch = this._litestore.getTransaction(id).patch[
        DSVEditor.SCHEMA_ID
      ][DSVEditor.RECORD_ID];

      // Get the grid state before this patch.
      const gridState = patch.gridState as RegisterField.Patch<
        DSVEditor.GridState
      >;
      if (!gridState.value) {
        continue;
      }

      // Unpack the current rows, columns, change, and command from the state.
      const {
        currentRows,
        currentColumns,
        nextChange,
        nextCommand
      } = gridState.value;

      // See if there is a command to invert.
      if (!nextCommand) {
        continue;
      }

      switch (nextCommand) {
        case 'insert-rows-above':
        case 'insert-rows-below': {
          change = nextChange as DataModel.RowsChangedArgs;
          index = this._absoluteIndex(change.index, change.region);
          // The inverse change is to move a span's worth of values
          // starting from the insert point to just beyond the current length.
          values = inverseRowMap.splice(index, change.span);
          inverseRowMap.splice(currentRows, 0, ...values);
          break;
        }
        case 'insert-columns-left':
        case 'insert-columns-right': {
          change = nextChange as DataModel.ColumnsChangedArgs;
          // The inverse change is to move a span's worth of values
          // starting from the insert point to just beyond the current length.
          values = inverseColumnMap.splice(change.index, change.span);
          inverseColumnMap.splice(currentColumns, 0, ...values);
          break;
        }
        case 'remove-rows': {
          change = nextChange as DataModel.RowsChangedArgs;
          index = this._absoluteIndex(change.index, change.region);
          // The inverse change is to move a spans worth of items from
          // the end to the remove index.
          values = inverseRowMap.splice(
            inverseRowMap.length - change.span,
            change.span
          );
          inverseRowMap.splice(index, 0, ...values);
          break;
        }
        case 'remove-columns': {
          change = nextChange as DataModel.ColumnsChangedArgs;
          // The inverse change is to move a spans worth of items from
          // the end to the remove index.
          values = inverseColumnMap.splice(
            inverseColumnMap.length - change.span,
            change.span
          );
          inverseColumnMap.splice(change.index, 0, ...values);
          break;
        }
        case 'move-rows': {
          change = nextChange as DataModel.RowsMovedArgs;
          index = this._absoluteIndex(change.index, change.region);
          destination = this._absoluteIndex(change.destination, change.region);
          // The inverse change is to move a span's worth of values from the destination to the start.
          values = inverseRowMap.splice(destination, change.span);
          inverseRowMap.splice(index, 0, ...values);
          break;
        }
        case 'move-columns': {
          change = nextChange as DataModel.ColumnsMovedArgs;
          // The inverse change is to move a span's worth of values from the destination to the start.
          values = inverseColumnMap.splice(change.destination, change.span);
          inverseColumnMap.splice(change.index, 0, ...values);
          break;
        }
        case 'clear-rows': {
          change = nextChange as DataModel.CellsChangedArgs;
          index = this._absoluteIndex(change.row, change.region);
          // The inverse of this change is a dual operation. First, grab a span of
          values = inverseRowMap.splice(index, change.rowSpan);
          inverseRowMap.splice(currentRows - change.rowSpan, 0, ...values);
          values = inverseRowMap.splice(
            inverseRowMap.length - change.rowSpan,
            change.rowSpan
          );
          inverseRowMap.splice(index, 0, ...values);
          break;
        }
        case 'clear-columns': {
          change = nextChange as DataModel.CellsChangedArgs;
          // The inverse of this change is a dual operation. First, grab a span of
          values = inverseColumnMap.splice(change.column, change.columnSpan);
          inverseColumnMap.splice(
            currentColumns - change.columnSpan,
            0,
            ...values
          );
          values = inverseColumnMap.splice(
            inverseColumnMap.length - change.columnSpan,
            change.columnSpan
          );
          inverseColumnMap.splice(change.row, 0, ...values);
          break;
        }
      }
    }
    return [inverseRowMap, inverseColumnMap];
  }

  /**
   * translate from the Grid's row IDs to our own standard
   */
  private _absoluteIndex(row: number, region: DataModel.CellRegion): number {
    return region === 'column-header' || region === 'corner-header'
      ? 0
      : row + 1;
  }

  /**
   * translate from our unique row ID to the Grid's standard
   */
  private _regionIndex(row: number, region: DataModel.CellRegion): number {
    return region === 'column-header' ? 0 : row - 1;
  }

  /**
   * Processes updates from the DSVModel.
   */
  private _receiveModelSignal(
    emitter: DSVModel,
    message: DataModel.ChangedArgs
  ): void {
    if (this._saving) {
      return;
    }
    if (message.type === 'rows-inserted') {
      // Unpack values from the litestore.
      const { rowMap } = this._litestore.getRecord({
        schema: DSVEditor.DATAMODEL_SCHEMA,
        record: DSVEditor.RECORD_ID
      });

      const start = rowMap.length + this._rowsRemoved;
      const span = message.span;
      this._assimilateNewRows(start, span);
    }
  }

  /**
   * Adds new rows coming in from the asynchronous parsing of string by the DSVModel.
   */
  private _assimilateNewRows(start: number, span: number): void {
    // Set up an udate object for the litestore.
    const update: DSVEditor.ModelChangedArgs = {};

    // Unpack values from the litestore.
    const { rowMap, columnMap } = this._litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });
    const currentRows = rowMap.length;
    const currentColumns = columnMap.length;

    // Create the new rows for the rowMap.
    const values = toArray(range(start, span + start));

    // Create the splice data for the litestore.
    const rowUpdate = {
      index: rowMap.length,
      remove: 0,
      values
    };

    // Add the rowUpdate to the litestore update object.
    update.rowUpdate = rowUpdate;

    // Define the update for the grid.
    const nextChange: DataModel.ChangedArgs = {
      type: 'rows-inserted',
      region: 'body',
      index: start,
      span: span
    };

    // Get a snapshot of the current state of the grid.
    const gridState: DSVEditor.GridState = {
      currentRows,
      currentColumns,
      nextChange,
      nextCommand: 'init'
    };

    update.gridStateUpdate = gridState;

    // Emit the update to the DSVEditor
    this._onChangeSignal.emit(update);

    // Emit the change.
    this.emitChanged(nextChange);
  }

  /**
   * The total rows currently stored in the DSVModel.
   */
  private _modelRows(): number {
    return this._model.rowCount('body') + 1;
  }

  /**
   * The total columns currently stored in the DSVModel.
   */
  private _modelColumns(): number {
    return this._model.columnCount('body');
  }

  /**
   * Computes the offset index at the end of a given row (note: row delimeter not included).
   */
  private _rowEnd(row: number): number {
    const rows = this._modelRows();
    const rowTrim = this._model.rowDelimiter.length;
    // See if we are on any row but the last.
    if (row + 1 < rows) {
      return this._model.getOffsetIndex(row + 1, 0) - rowTrim;
    }
    return this._model.rawData.length;
  }

  private _openSlice(row: number, start: number, end: number): string {
    if (end + 1 < this._modelColumns()) {
      const trimRight = this._model.delimiter.length;
      return this._model.rawData.slice(
        this._model.getOffsetIndex(row, start),
        this._model.getOffsetIndex(row, end + 1) - trimRight
      );
    }
    return this._model.rawData.slice(
      this._model.getOffsetIndex(row, start),
      this._rowEnd(row)
    );
  }

  /**
   * Builds the slicing pattern that needs to be applied to every row in the model
   * @param columnMap
   * @returns The SlicePattern containing a list of buffers (arrays of delimiters) and slices (indexes to slice the original string on)
   */
  private _columnSlicePattern(
    columnMap: ListField.Value<number>
  ): SlicePattern {
    let i = 0;
    const buffers: string[] = [];
    const slices: Array<Array<number>> = [];
    let nextSlice: number[] = [];
    let delimiterReps = 0;
    while (i < columnMap.length) {
      // add another delimeter and move to the next index if the value is negative (new column)
      while (columnMap[i] < 0) {
        i++;
        delimiterReps++;
      }

      // remove a delimiter of the last column is involved
      if (i === columnMap.length) {
        delimiterReps--;
      }

      buffers.push(this._model.delimiter.repeat(delimiterReps));
      delimiterReps = 0;

      // break if we reached the end of the column map
      if (i >= columnMap.length) {
        break;
      }
      nextSlice.push(columnMap[i]);
      while (columnMap[i] + 1 === columnMap[i + 1]) {
        i++;
      }
      nextSlice.push(columnMap[i]);
      delimiterReps++;
      slices.push(nextSlice);
      nextSlice = [];
      i++;
    }
    buffers.push('');
    return { buffers, slices };
  }

  private _performMacroSlice(
    slicePattern: SlicePattern,
    rowMap: ListField.Value<number>,
    columnMap: ListField.Value<number>
  ): string {
    // Initialize a map array.
    const mapArray: Array<string | 0> = new Array(rowMap.length).fill(0);
    const { buffers, slices } = slicePattern;
    // initialize a callback for the map method.
    const mapper = (elem: any, index: number): string => {
      const row = rowMap[index];
      if (row < 0) {
        return this._blankRow(columnMap);
      }
      let str = buffers[0];
      for (let i = 0; i < slices.length; i++) {
        str +=
          this._openSlice(row, slices[i][0], slices[i][1]) + buffers[i + 1];
      }
      return str;
    };
    return mapArray.map(mapper).join(this._model.rowDelimiter);
  }

  private _serializer(
    rowMap: ListField.Value<number>,
    columnMap: ListField.Value<number>,
    valueMap: MapField.Value<string>,
    inverseRowMap: Array<number>,
    inverseColumnMap: Array<number>
  ): string {
    const slicePattern = this._columnSlicePattern(columnMap);
    this._model.rawData = this._performMacroSlice(
      slicePattern,
      rowMap,
      columnMap
    );
    this._model.parseAsync();
    this._model.rawData = this._peformMicroSlice(
      valueMap,
      rowMap,
      columnMap,
      inverseRowMap,
      inverseColumnMap
    );
    return this._model.rawData;
  }

  /**
   * Returns a blank row with the correct numbers of columns and correct delimiters
   * @param model The DSV model being used
   * @param row The index of the row being inserted (determines whether to add a row delimiter or not)
   */
  private _blankRow(columnMap: ListField.Value<number>): string {
    return this._model.delimiter.repeat(columnMap.length - 1);
  }

  private _peformMicroSlice(
    valueMap: MapField.Value<string>,
    rowMap: ListField.Value<number>,
    columnMap: ListField.Value<number>,
    inverseRowMap: ListField.Value<number>,
    inverseColumnMap: ListField.Value<number>
  ): string {
    // Get the keys of the value map into an array of row/column arrays.
    let keys = Object.keys(valueMap).map(elem =>
      elem.split(',').map(elem => Math.abs(parseFloat(elem)))
    );

    // Bail early if the keys are empty.
    if (keys.length === 0) {
      return this._model.rawData;
    }

    // Map the keys to the actual location in the DataGrid with the inverse maps
    keys = keys.map(elem => [
      inverseRowMap[elem[0]],
      inverseColumnMap[elem[1]]
    ]);

    // Sort the keys according to where they appear in the string.
    keys = keys.sort((elem1, elem2) => {
      return (
        elem1[0] * this._modelColumns() +
        elem1[1] -
        (elem2[0] * this._modelColumns() + elem2[1])
      );
    });

    // Filter out elements that are out of bounds. (This indicates they were deleted in the process.)
    keys = keys.filter(elem => {
      return elem[0] < rowMap.length && elem[1] < columnMap.length;
    });

    // Bail early if the keys are empty. This can happen if you insert and remove the same column
    if (keys.length === 0) {
      return this._model.rawData;
    }

    // Now revert the keys to their corresponding map keys.
    const valueKeys = keys.map(key => `${rowMap[key[0]]},${columnMap[key[1]]}`);

    // Set up an array to map the slices into.
    const mapArray: Array<string | 0> = new Array(keys.length - 1).fill('');

    // Set up shorthands for delimiter lengths.
    const rdl = this.model.rowDelimiter.length;
    const dl = this.model.delimiter.length;

    // Create the map function.
    const mapper = (elem: any, index: number): string => {
      let sliceStart: number;
      const startKey = keys[index];
      const endKey = keys[index + 1];

      // Check if the previous key is at the last column
      if (startKey[1] + 1 === this._modelColumns()) {
        sliceStart = this.model.getOffsetIndex(startKey[0] + 1, 0) - rdl;
      } else {
        sliceStart =
          this.model.getOffsetIndex(startKey[0], startKey[1] + 1) - dl;
      }
      const sliceEnd = this.model.getOffsetIndex(endKey[0], endKey[1]);
      return (
        valueMap[valueKeys[index]] +
        this.model.rawData.slice(sliceStart, sliceEnd)
      );
    };
    // Get the buffer before the first insertion.
    const startBuffer = this._model.rawData.slice(
      0,
      this.model.getOffsetIndex(keys[0][0], keys[0][1])
    );

    // Get the buffer after the last insertion.
    let endBuffer: string;
    const lastKey = keys[keys.length - 1];
    // Check if last key is at end column
    if (lastKey[1] + 1 === columnMap.length) {
      // check if last key is at last row
      if (lastKey[0] + 1 === rowMap.length) {
        endBuffer = '';
      } else {
        endBuffer = this._model.rawData.slice(
          this._model.getOffsetIndex(lastKey[0] + 1, 0) - rdl,
          this._model.rawData.length
        );
      }
    } else {
      endBuffer = this.model.rawData.slice(
        this._model.getOffsetIndex(lastKey[0], lastKey[1] + 1) - dl
      );
    }
    // Get the last value.
    const lastValue = valueMap[valueKeys[valueKeys.length - 1]];
    return startBuffer + mapArray.map(mapper).join('') + lastValue + endBuffer;
  }
}

export type MapUpdate = 'add' | 'remove' | 'move' | 'clear';

export type SlicePattern = {
  buffers: Array<string>;
  slices: Array<Array<number>>;
};
