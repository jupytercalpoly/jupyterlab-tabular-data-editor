import 'jest';
import { EditorModel } from '../src/newmodel';
import { DSVEditor } from '../src/widget';
import { toArray, range } from '@lumino/algorithm';
import { Litestore } from '../src/litestore';

const delimiter = ',';
let model: EditorModel;

function updateLitestore(
  model: EditorModel,
  update?: DSVEditor.ModelChangedArgs
): void {
  // const selection = this._grid.selectionModel.currentSelection();

  model.litestore.updateRecord(
    {
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    },
    {
      rowMap: update.rowUpdate || DSVEditor.NULL_NUM_SPLICE,
      columnMap: update.columnUpdate || DSVEditor.NULL_NUM_SPLICE,
      valueMap: update.valueUpdate || null,
      gridChange: update.gridUpdate || null,
      gridChangeRecord:
        update.gridChangeRecordUpdate || DSVEditor.NULL_CHANGE_SPLICE,
      type: update.type || null
    }
  );
}

beforeEach(() => {
  const data = [
    'column 0,column 1,column 2',
    'r0c0,r0c1:randomvalue,r1c2',
    'r1c0,r1c1,r1c2:another-random-val',
    'r2c0,r2c1,r2c2'
  ].join('\n');
  model = new EditorModel({ data, delimiter });
  // Define the initial update object for the litestore.
  const update: DSVEditor.ModelChangedArgs = {};

  // Define the initial state of the row and column map.
  const rowUpdate = {
    index: 0,
    remove: 0,
    values: toArray(range(0, model.totalRows()))
  };
  const columnUpdate = {
    index: 0,
    remove: 0,
    values: toArray(range(0, model.totalColumns()))
  };

  // Add the map updates to the update object.
  update.rowUpdate = rowUpdate;
  update.columnUpdate = columnUpdate;

  // Define the litestore
  model.litestore = new Litestore({
    id: 0,
    schemas: [DSVEditor.DATAMODEL_SCHEMA]
  });

  // set inital status of litestore
  model.litestore.beginTransaction();
  updateLitestore(model, update);
  model.litestore.endTransaction();
});

describe('Row & Column Map Manipulation', () => {
  it('should add a row to the row map', () => {
    const update = model.addRows('body', 0, 1);
    console.log(update);
    model.litestore.beginTransaction();
    updateLitestore(model, update);
    model.litestore.endTransaction();

    const { rowMap } = model.litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });
    console.log(rowMap);
    const compareArray = [];
    for (let i = 0; i < rowMap.length; i++) {
      compareArray.push(rowMap[i]);
    }
    const data = [0, -4, 1, 2, 3];
    expect(compareArray).toStrictEqual(data);
  });
  it('should handle a row removal followed by an addition.', () => {
    const update = model.removeRows('body', 0, 1);
    model.litestore.beginTransaction();
    updateLitestore(model, update);
    model.litestore.endTransaction();
    const nextUpdate = model.addRows('body', 0, 1);
    model.litestore.beginTransaction();
    updateLitestore(model, nextUpdate);
    model.litestore.endTransaction();
    const { rowMap } = model.litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });
    const compareArray = [];
    for (let i = 0; i < rowMap.length; i++) {
      compareArray.push(rowMap[i]);
    }
    const data = [0, -4, 2, 3];
    expect(compareArray).toStrictEqual(data);
  });

  it('should handle a column removal followed by a column addition.', () => {
    const update = model.removeColumns('body', 0, 1);
    model.litestore.beginTransaction();
    updateLitestore(model, update);
    model.litestore.endTransaction();
    const nextUpdate = model.addColumns('body', 0, 1);
    model.litestore.beginTransaction();
    updateLitestore(model, nextUpdate);
    model.litestore.endTransaction();
    const { columnMap } = model.litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });
    expect(columnMap.slice()).toStrictEqual([-3, 1, 2]);
  });
  it('should handle clear a row', () => {
    const update = model.clearContents('row-header', {
      r1: 1,
      r2: 1,
      c1: 0,
      c2: 2
    });
    model.litestore.beginTransaction();
    updateLitestore(model, update);
    model.litestore.endTransaction();
    const { rowMap } = model.litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });
    expect(rowMap.slice()).toStrictEqual([0, 1, -4, 3]);
  });
  it('should handle clear a column', () => {
    const update = model.clearContents('column-header', {
      r1: 0,
      r2: 3,
      c1: 2,
      c2: 2
    });
    model.litestore.beginTransaction();
    updateLitestore(model, update);
    model.litestore.endTransaction();
    const { columnMap } = model.litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });
    expect(columnMap.slice()).toStrictEqual([0, 1, -3]);
  });
});

describe('Serialization', () => {
  it('Should serialize a series of cell entries', () => {
    // Add hello to upper-left corner.
    const update: DSVEditor.ModelChangedArgs = {};
    model.setData('body', 0, 0, 'hello', 1, 1, update);
    model.litestore.beginTransaction();
    updateLitestore(model, update);
    model.litestore.endTransaction();

    // Add world to lower-right corner.
    const nextUpdate: DSVEditor.ModelChangedArgs = {};
    model.setData('body', 2, 2, 'world', 1, 1, nextUpdate);
    model.litestore.beginTransaction();
    updateLitestore(model, nextUpdate);
    model.litestore.endTransaction();

    // Unpack updated litestore values.
    const { valueMap } = model.litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });
    console.log(valueMap);

    // Check that the valueMap was properly updated.
    expect(valueMap['1,0']).toBe('hello');
    expect(valueMap['3,2']).toBe('world');

    // Check that these get properly serialized.
    const newString = model.updateString();
    expect(newString).toBe(
      [
        'column 0,column 1,column 2',
        'hello,r0c1:randomvalue,r1c2',
        'r1c0,r1c1,r1c2:another-random-val',
        'r2c0,r2c1,world'
      ].join('\n')
    );
  });
  it('should serialize a combo of each kind of macro update', () => {
    let refMatrix = [
      ['column 0', 'column 1', 'column 2'],
      ['r0c0', 'r0c1:randomvalue', 'r1c2'],
      ['r1c0', 'r1c1', 'r1c2:another-random-val'],
      ['r2c0', 'r2c1', 'r2c2']
    ];
    // Addition macro update
    let addUpdate: DSVEditor.ModelChangedArgs = {};
    addUpdate = model.addRows('body', 3, 1);
    model.litestore.beginTransaction();
    updateLitestore(model, addUpdate);
    model.litestore.endTransaction();

    refMatrix.push(['', '', '']);

    // Removal macro update.
    let removeUpdate: DSVEditor.ModelChangedArgs = {};
    removeUpdate = model.removeColumns('body', 2, 1);
    model.litestore.beginTransaction();
    updateLitestore(model, removeUpdate);
    model.litestore.endTransaction();

    refMatrix = refMatrix.map(row => {
      row.pop();
      return row;
    });

    // Clear macro update.
    let clearUpdate: DSVEditor.ModelChangedArgs = {};
    clearUpdate = model.clearContents('row-header', {
      r1: 1,
      r2: 1,
      c1: 0,
      c2: 1
    });
    model.litestore.beginTransaction();
    updateLitestore(model, clearUpdate);
    model.litestore.endTransaction();

    refMatrix[2] = ['', ''];

    // Ensure the row and column maps check out
    const { rowMap, columnMap } = model.litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });
    expect(rowMap.slice()).toStrictEqual([0, 1, -5, 3, -4]);
    expect(columnMap.slice()).toStrictEqual([0, 1]);

    // Make the comparison.
    const newString = model.updateString();
    const data = refMatrix.map(row => row.join(',')).join('\n');
    expect(newString).toStrictEqual(data);
  });

  it('Should serialize a combo of micro and macro updates', () => {
    const refMatrix = [
      ['column 0', 'column 1', 'column 2'],
      ['r0c0', 'r0c1:randomvalue', 'r1c2'],
      ['r1c0', 'r1c1', 'r1c2:another-random-val'],
      ['r2c0', 'r2c1', 'r2c2']
    ];
    // Apply a micro update.
    const clearUpdate = model.clearContents('body', {
      r1: 1,
      r2: 1,
      c1: 0,
      c2: 1
    });
    model.litestore.beginTransaction();
    updateLitestore(model, clearUpdate);
    model.litestore.endTransaction();

    // Update reference matrix.
    refMatrix[2][0] = '';
    refMatrix[2][1] = '';

    const addUpdate = model.addRows('body', 2, 1);
    model.litestore.beginTransaction();
    updateLitestore(model, addUpdate);
    model.litestore.endTransaction();

    refMatrix.splice(2, 0, ['', '', '']);

    console.log(refMatrix);
    const expectedData = refMatrix.map(row => row.join(',')).join('\n');
    const newString = model.updateString();
    expect(newString).toBe(expectedData);
  });
});
