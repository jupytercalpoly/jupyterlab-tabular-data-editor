import 'jest';
import { EditorModel } from '../src/newmodel';
import { DSVEditor } from '../src/widget';
import { toArray, range } from '@lumino/algorithm';
import { Litestore } from '../src/litestore';
import { DATA } from './data';

const delimiter = ',';
let model: EditorModel;
let dataMatrix: string[][];
let bigModel: EditorModel;

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
      selection: update.selection || null,
      gridState: update.gridStateUpdate || null
    }
  );
}

function initModel() {
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
    values: toArray(range(0, model.totalRows))
  };
  const columnUpdate = {
    index: 0,
    remove: 0,
    values: toArray(range(0, model.totalColumns))
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
}

function initBigModel() {
  // Parse the data matrix once.
  dataMatrix = DATA.split('\n').map(row => row.split(','));

  bigModel = new EditorModel({ data: DATA, delimiter });

  // Define the initial update object for the litestore.
  const update: DSVEditor.ModelChangedArgs = {};

  // Define the initial state of the row and column map.
  const rowUpdate = {
    index: 0,
    remove: 0,
    values: toArray(range(0, bigModel.totalRows))
  };
  const columnUpdate = {
    index: 0,
    remove: 0,
    values: toArray(range(0, bigModel.totalColumns))
  };

  // Add the map updates to the update object.
  update.rowUpdate = rowUpdate;
  update.columnUpdate = columnUpdate;

  // Define the litestore
  bigModel.litestore = new Litestore({
    id: 0,
    schemas: [DSVEditor.DATAMODEL_SCHEMA]
  });

  // set inital status of litestore
  bigModel.litestore.beginTransaction();
  updateLitestore(bigModel, update);
  bigModel.litestore.endTransaction();
}

describe('Row & Column Map Manipulation', () => {
  beforeEach(() => {
    initModel();
  });

  it('should add a row to the row map', () => {
    const update = model.addRows('body', 0, 1);

    model.litestore.beginTransaction();
    updateLitestore(model, update);
    model.litestore.endTransaction();

    const { rowMap } = model.litestore.getRecord({
      schema: DSVEditor.DATAMODEL_SCHEMA,
      record: DSVEditor.RECORD_ID
    });

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
    const update = model.clearRows('row-header', 1, 1);
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
    const update = model.clearColumns('column-header', 2, 1);
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
  beforeEach(() => {
    initModel();
  });

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
    clearUpdate = model.clearRows('row-header', 1, 1);
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
    const clearUpdate = model.clearCells('body', {
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

    refMatrix.splice(3, 0, ['', '', '']);

    const expectedData = refMatrix.map(row => row.join(',')).join('\n');
    const newString = model.updateString();
    expect(newString).toBe(expectedData);
  });
});

/**
 * A test suite for testing data processing on a large data set.
 * All functions are run with a fresh copy of the data
 * NOTE: All of these tests should be wrapped in a promise resolution
 * for the model to be done parsing.
 */
describe('Large string tests (isolated)', () => {
  beforeEach(() => {
    initBigModel();
  });

  it('Should serialize a cell entry', () => {
    bigModel.model.ready.then(() => {
      // Initialize the update object
      const update: DSVEditor.ModelChangedArgs = {};

      // Apply the change to the update object
      bigModel.setData(
        'body',
        dataMatrix.length - 1,
        dataMatrix.length[0] - 1,
        'hello',
        1,
        1,
        update
      );

      // Update the litestore.
      bigModel.litestore.beginTransaction();
      updateLitestore(bigModel, update);
      bigModel.litestore.endTransaction();

      // Update the data matrix.
      dataMatrix[dataMatrix.length - 1][dataMatrix.length[0] - 1] = 'hello';

      // Serialize
      const string = bigModel.updateString();

      // Compare
      const same = string === dataMatrix.map(row => row.join(',')).join('\n');
      expect(same).toBe(true);
    });
  });

  describe('Add', () => {
    it('Should add a row to the beginning', () => {
      bigModel.model.ready.then(() => {
        const update = bigModel.addRows('body', 0, 1);

        // Update the litestore.
        bigModel.litestore.beginTransaction();
        updateLitestore(bigModel, update);
        bigModel.litestore.endTransaction();

        // Update the data matrix.
        dataMatrix.unshift(new Array(dataMatrix[0].length).fill(''));

        // Serialize
        const string = bigModel.updateString();

        // Compare
        const same = string === dataMatrix.map(row => row.join(',')).join('\n');
        expect(same).toBe(true);
      });
    });
    it('Should add a row to the end', () => {
      bigModel.model.ready.then(() => {
        const update = bigModel.addRows('body', 1000, 1);

        // Update the litestore.
        bigModel.litestore.beginTransaction();
        updateLitestore(bigModel, update);
        bigModel.litestore.endTransaction();

        // Update the data matrix.
        dataMatrix.push(new Array(dataMatrix[0].length).fill(''));

        // Serialize
        const string = bigModel.updateString();

        // Compare
        const same = string === dataMatrix.map(row => row.join(',')).join('\n');
        expect(same).toBe(true);
      });
    });
    it('Should add a column to the end', () => {
      bigModel.model.ready.then(() => {
        const maxColumn = bigModel.totalColumns - 1;
        const update = bigModel.addColumns('body', maxColumn, 1);

        // Update the litestore.
        bigModel.litestore.beginTransaction();
        updateLitestore(bigModel, update);
        bigModel.litestore.endTransaction();

        // Update the data matrix.
        dataMatrix.forEach((row, index) => {
          dataMatrix[index].push('');
        });

        // Serialize
        const string = bigModel.updateString();

        // Compare
        const same = string === dataMatrix.map(row => row.join(',')).join('\n');
        expect(same).toBe(true);
      });
    });
    it('Should add multiple rows to the beginning', () => {
      bigModel.model.ready.then(() => {
        const span = 3;
        const update = bigModel.addRows('body', 1000, span);

        // Update the litestore.
        bigModel.litestore.beginTransaction();
        updateLitestore(bigModel, update);
        bigModel.litestore.endTransaction();

        // Update the data matrix.
        for (let i = 0; i < span; i++) {
          dataMatrix.unshift(new Array(dataMatrix[0].length).fill(''));
        }

        // Serialize.
        const string = bigModel.updateString();

        // Compare.
        const same = string === dataMatrix.map(row => row.join(',')).join('\n');
        expect(same).toBe(true);
      });
    });
    it('Should add multiple rows to the end', () => {
      bigModel.model.ready.then(() => {
        const span = 3;
        const update = bigModel.addRows('body', 1000, span);

        // Update the litestore.
        bigModel.litestore.beginTransaction();
        updateLitestore(bigModel, update);
        bigModel.litestore.endTransaction();

        // Update the data matrix.
        for (let i = 0; i < span; i++) {
          dataMatrix.push(new Array(dataMatrix[0].length).fill(''));
        }

        // Serialize.
        const string = bigModel.updateString();

        // Compare.
        const same = string === dataMatrix.map(row => row.join(',')).join('\n');
        expect(same).toBe(true);
      });
    });
    it('Should add multiple columns to the end', () => {
      bigModel.model.ready.then(() => {
        const span = 2;
        const maxColumn = bigModel.totalColumns - 1;
        const update = bigModel.addColumns('body', maxColumn, span);

        // Update the litestore.
        bigModel.litestore.beginTransaction();
        updateLitestore(bigModel, update);
        bigModel.litestore.endTransaction();

        // Update the data matrix.
        for (let i = 0; i < span; i++) {
          dataMatrix.forEach((row, index) => {
            dataMatrix[index].push('');
          });
        }

        // Serialize.
        const string = bigModel.updateString();

        // Compare.
        const same = string === dataMatrix.map(row => row.join(',')).join('\n');
        expect(same).toBe(true);
      });
    });
  });

  it('Should clear a row', () => {
    bigModel.model.ready.then(() => {
      const update = bigModel.clearRows('body', 800);

      // Update the litestore.
      bigModel.litestore.beginTransaction();
      updateLitestore(bigModel, update);
      bigModel.litestore.endTransaction();

      // Update the data matrix.
      dataMatrix[800] = new Array(dataMatrix.length[0]).fill('');

      // Serialize.
      const string = bigModel.updateString();

      // Compare.
      const same = string === dataMatrix.map(row => row.join(',')).join('\n');
      expect(same).toBe(true);
    });
  });
  it('Should clear a column', () => {
    bigModel.model.ready.then(() => {
      const update = bigModel.clearColumns('body', 700);

      // Update the litestore.
      bigModel.litestore.beginTransaction();
      updateLitestore(bigModel, update);
      bigModel.litestore.endTransaction();

      // Update the data matrix.
      dataMatrix.forEach((elem, index) => {
        dataMatrix[index][700] = '';
      });

      // Serialize.
      const string = bigModel.updateString();

      // Compare.
      const same = string === dataMatrix.map(row => row.join(',')).join('\n');
      expect(same).toBe(true);
    });
  });
  it('Should move a row', () => {
    bigModel.model.ready.then(() => {
      const update = bigModel.moveRows('body', 900, 950, 1);

      // Update the litestore.
      bigModel.litestore.beginTransaction();
      updateLitestore(bigModel, update);
      bigModel.litestore.endTransaction();

      // Update the data matrix.
      [dataMatrix[900], dataMatrix[950]] = [dataMatrix[950], dataMatrix[900]];

      // Serialize.
      const string = bigModel.updateString();

      // Compare.
      const same = string === dataMatrix.map(row => row.join(',')).join('\n');
      expect(same).toBe(true);
    });
  });
  it('Should move a column', () => {
    bigModel.model.ready.then(() => {
      const update = bigModel.moveColumns('body', 5, 2, 1);

      // Update the litestore.
      bigModel.litestore.beginTransaction();
      updateLitestore(bigModel, update);
      bigModel.litestore.endTransaction();

      // Update the data matrix.
      dataMatrix.forEach(row => {
        [row[5], row[2]] = [row[2], row[5]];
      });

      // Serialize.
      const string = bigModel.updateString();

      // Compare.
      const same = string === dataMatrix.map(row => row.join(',')).join('\n');
      expect(same).toBe(true);
    });
  });
  // it('Should remove a row', () => {
  //   bigModel.model.ready.then(() => {

  //   });
  // });
  // it('Should remove a column', () => {
  //   bigModel.model.ready.then(() => {

  //   })
  // })
  // })
  // })
  // it('Should clear a cell selection', () => {
  //   bigModel.model.ready.then(() => {

  //   })
  // });
  // it('Should cut a region', () => {
  //   bigModel.model.ready.then(() => {

  //   })
  // });
  // it('Should it should paste a region', () => {
  //   bigModel.model.ready.then(() => {

  //   })
  // });
  // it('Should undo', () => {
  //   bigModel.model.ready.then(() => {

  //   })
  // });
  // it('Should redo', () => {
  //   bigModel.model.ready.then(() => {
});

/**
 * A test suite for testing data processing on a large data set.
 * NOTE: All of these tests should be wrapped in a promise resolution
 * for the model to be done parsing.
 */
describe('Large string tests (integrated)', () => {
  beforeAll(() => {
    initBigModel();
  });

  it('Should serialize a cell entry', () => {
    bigModel.model.ready.then(() => {
      // Initialize the update object
      const update: DSVEditor.ModelChangedArgs = {};

      // Apply the change to the update object
      bigModel.setData('body', 900, 0, 'hello', 1, 1, update);

      // Update the litestore.
      bigModel.litestore.beginTransaction();
      updateLitestore(bigModel, update);
      bigModel.litestore.endTransaction();

      // Fetch the map to get the right indices.
      const { rowMap, columnMap } = bigModel.litestore.getRecord({
        schema: DSVEditor.DATAMODEL_SCHEMA,
        record: DSVEditor.RECORD_ID
      });
      const row = rowMap[900];
      const column = columnMap[0];

      // Update the data matrix.
      dataMatrix[row][column] = 'hello';

      // Serialize
      const string = bigModel.updateString();

      // Compare
      const same = string === dataMatrix.map(row => row.join(',')).join('\n');
      expect(same).toBe(true);
    });
  });

  it('Should add a row to the end', () => {
    bigModel.model.ready.then(() => {
      const update = bigModel.addRows('body', 1000, 1);

      // Update the litestore.
      bigModel.litestore.beginTransaction();
      updateLitestore(bigModel, update);
      bigModel.litestore.endTransaction();

      // Fetch the map to get the right indices.
      const { rowMap } = bigModel.litestore.getRecord({
        schema: DSVEditor.DATAMODEL_SCHEMA,
        record: DSVEditor.RECORD_ID
      });
      const row = rowMap[1000];

      // Create a blank row.
      const newRow = new Array(dataMatrix[0].length).fill('');

      // Update the data matrix.
      dataMatrix.splice(row, 0, newRow);

      // Serialize.
      const string = bigModel.updateString();

      // Compare.
      const same = string === dataMatrix.map(row => row.join(',')).join('\n');
      expect(same).toBe(true);
    });
  });
  it('Should add a column to the end', () => {
    bigModel.model.ready.then(() => {
      const maxColumn = bigModel.totalColumns - 1;
      const update = bigModel.addColumns('body', maxColumn, 1);

      // Update the litestore.
      bigModel.litestore.beginTransaction();
      updateLitestore(bigModel, update);
      bigModel.litestore.endTransaction();

      // Fetch the map to get the right indices.
      const { columnMap } = bigModel.litestore.getRecord({
        schema: DSVEditor.DATAMODEL_SCHEMA,
        record: DSVEditor.RECORD_ID
      });
      const column = columnMap[1000];

      // Update the data matrix.
      dataMatrix.forEach((row, index) => {
        dataMatrix[index].splice(column, 0, '');
      });

      // Serialize.
      const string = bigModel.updateString();

      // Compare.
      const same = string === dataMatrix.map(row => row.join(',')).join('\n');
      expect(same).toBe(true);
    });
  });
  it('Should clear a row', () => {
    bigModel.model.ready.then(() => {
      const update = bigModel.clearRows('body', 800);

      // Update the litestore.
      bigModel.litestore.beginTransaction();
      updateLitestore(bigModel, update);
      bigModel.litestore.endTransaction();

      // Fetch the map to get the right indices.
      const { rowMap } = bigModel.litestore.getRecord({
        schema: DSVEditor.DATAMODEL_SCHEMA,
        record: DSVEditor.RECORD_ID
      });
      const row = rowMap[800];

      // Update the data matrix.
      dataMatrix[row] = new Array(dataMatrix.length[0]).fill('');

      // Serialize.
      const string = bigModel.updateString();

      // Compare.
      const same = string === dataMatrix.map(row => row.join(',')).join('\n');
      expect(same).toBe(true);
    });
  });
  it('Should clear a column', () => {
    bigModel.model.ready.then(() => {
      const update = bigModel.clearColumns('body', 700);

      // Update the litestore.
      bigModel.litestore.beginTransaction();
      updateLitestore(bigModel, update);
      bigModel.litestore.endTransaction();

      // Fetch the map to get the right indices.
      const { columnMap } = bigModel.litestore.getRecord({
        schema: DSVEditor.DATAMODEL_SCHEMA,
        record: DSVEditor.RECORD_ID
      });
      const column = columnMap[700];

      // Update the data matrix.
      dataMatrix.forEach((elem, index) => {
        dataMatrix[index][column] = '';
      });

      // Serialize.
      const string = bigModel.updateString();

      // Compare.
      const same = string === dataMatrix.map(row => row.join(',')).join('\n');
      expect(same).toBe(true);
    });
  });
  it('Should move a row', () => {
    bigModel.model.ready.then(() => {
      const update = bigModel.moveRows('body', 900, 950, 1);

      // Update the litestore.
      bigModel.litestore.beginTransaction();
      updateLitestore(bigModel, update);
      bigModel.litestore.endTransaction();

      // Fetch the map to get the right indices.
      const { rowMap } = bigModel.litestore.getRecord({
        schema: DSVEditor.DATAMODEL_SCHEMA,
        record: DSVEditor.RECORD_ID
      });
      const start = rowMap[900];
      const end = rowMap[950];

      // Update the data matrix.
      [dataMatrix[start], dataMatrix[end]] = [
        dataMatrix[end],
        dataMatrix[start]
      ];

      // Serialize
      const string = bigModel.updateString();

      // Compare
      const same = string === dataMatrix.map(row => row.join(',')).join('\n');
      expect(same).toBe(true);
    });
  });
  it('Should move a column', () => {
    bigModel.model.ready.then(() => {
      const update = bigModel.moveColumns('body', 5, 2, 1);

      // Update the litestore
      bigModel.litestore.beginTransaction();
      updateLitestore(bigModel, update);
      bigModel.litestore.endTransaction();

      // Fetch the map to get the right indices.
      const { columnMap } = bigModel.litestore.getRecord({
        schema: DSVEditor.DATAMODEL_SCHEMA,
        record: DSVEditor.RECORD_ID
      });
      const start = columnMap[5];
      const end = columnMap[2];

      // Update the data matrix.
      dataMatrix.forEach(row => {
        [row[end], row[start]] = [row[start], row[end]];
      });

      // Serialize
      const string = bigModel.updateString();

      // Compare
      const same = string === dataMatrix.map(row => row.join(',')).join('\n');
      expect(same).toBe(true);
    });
  });
  // TODO: Add these tests
  // it('Should remove a row', () => {
  //   bigModel.model.ready.then(() => {

  //   })
  // })
  it('Should remove a column', () => {
    bigModel.model.ready.then(() => {
      const update = bigModel.removeColumns('body', dataMatrix[0].length - 1);

      // Update the litestore
      bigModel.litestore.beginTransaction();
      updateLitestore(bigModel, update);
      bigModel.litestore.endTransaction();

      // Fetch the map to get the right indices.
      const { columnMap } = bigModel.litestore.getRecord({
        schema: DSVEditor.DATAMODEL_SCHEMA,
        record: DSVEditor.RECORD_ID
      });
      const column = columnMap[dataMatrix[0].length - 1];

      // Update the data matrix.
      dataMatrix.forEach(row => {
        row.splice(column, 1);
      });

      // Serialize.
      const string = bigModel.updateString();

      // Compare.
      const same = string === dataMatrix.map(row => row.join(',')).join('\n');
      expect(same).toBe(true);
    });
  });

  // })
  // })
  // })
  // it('Should clear a cell selection', () => {
  //   bigModel.model.ready.then(() => {

  //   })
  // });
  it('Should add multiple rows to the end', () => {
    bigModel.model.ready.then(() => {
      const update = bigModel.addRows('body', dataMatrix.length - 1, 2);

      // Update the litestore.
      bigModel.litestore.beginTransaction();
      updateLitestore(bigModel, update);
      bigModel.litestore.endTransaction();

      // Fetch the map to get the right indices.
      const { rowMap } = bigModel.litestore.getRecord({
        schema: DSVEditor.DATAMODEL_SCHEMA,
        record: DSVEditor.RECORD_ID
      });
      const row = rowMap[dataMatrix.length - 1];

      // Update the data matrix.
      dataMatrix.splice(row, 0, new Array(dataMatrix[0].length).fill(''));
      dataMatrix.splice(row, 0, new Array(dataMatrix[0].length).fill(''));

      // Serialize
      const string = bigModel.updateString();

      // Compare
      const same = string === dataMatrix.map(row => row.join(',')).join('\n');
      expect(same).toBe(true);
    });
  });
  it('Should add multiple columns to the end', () => {
    bigModel.model.ready.then(() => {
      const update = bigModel.addColumns('body', dataMatrix.length - 1, 2);

      // Update the litestore.
      bigModel.litestore.beginTransaction();
      updateLitestore(bigModel, update);
      bigModel.litestore.endTransaction();

      // Fetch the map to get the right indices.
      const { columnMap } = bigModel.litestore.getRecord({
        schema: DSVEditor.DATAMODEL_SCHEMA,
        record: DSVEditor.RECORD_ID
      });
      const column = columnMap[dataMatrix.length - 1];

      // Update the data matrix.
      dataMatrix.forEach(elem => {
        elem.splice(column, 0, '', '');
      });

      // Serialize.
      const string = bigModel.updateString();

      // Compare.
      const same = string === dataMatrix.map(row => row.join(',')).join('\n');
      expect(same).toBe(true);
    });
  });
  it('Should cut a region and paste to another region', () => {
    bigModel.model.ready.then(() => {
      let update = bigModel.cut('body', 500, 3, 550, 5);

      // Update the litestore.
      bigModel.litestore.beginTransaction();
      updateLitestore(bigModel, update);
      bigModel.litestore.endTransaction();

      // Fetch the map to get the right indices.
      const { columnMap, rowMap } = bigModel.litestore.getRecord({
        schema: DSVEditor.DATAMODEL_SCHEMA,
        record: DSVEditor.RECORD_ID
      });

      // Initialize an array to hold copied data.
      const copyData = [];

      // Update the data matrix.
      for (let row = 500; row <= 550; row++) {
        row = rowMap[row];
        // Initialize the row data.
        const rowData = [];
        for (let column = 3; column <= 5; column++) {
          column = columnMap[column];
          rowData.push(dataMatrix[row][column]);
          dataMatrix[row][column] = '';
        }
        copyData.push(rowData);
      }

      // Serialize.
      let string = bigModel.updateString();

      // Compare.
      let same = string === dataMatrix.map(row => row.join(',')).join('\n');
      expect(same).toBe(true);

      update = bigModel.paste('body', 600, 600);

      // Update the litestore.
      bigModel.litestore.beginTransaction();
      updateLitestore(bigModel, update);
      bigModel.litestore.endTransaction();

      // Initialize variables to iterate on the copy data.
      let i = 0;
      let j = 0;

      // Update the data matrix.
      for (let row = 500; row <= 550; row++) {
        row = rowMap[row];
        for (let column = 3; column <= 5; column++) {
          column = columnMap[column];
          dataMatrix[row][column] = copyData[i][j];
          j++;
        }
        i++;
        j = 0;
      }

      // Serialize.
      string = bigModel.updateString();

      // Compare.
      same = string === dataMatrix.map(row => row.join(',')).join('\n');
      expect(same).toBe(true);
    });
  });
  it('Should compute the correct data types', () => {
    bigModel.model.ready.then(() => {
      const correctTypes = [
        'string',
        'string',
        'string',
        'string',
        'string',
        'date',
        'integer',
        'date',
        'integer',
        'number',
        'number',
        'number',
        'number',
        'number'
      ];

      // Turn data formatting on.
      bigModel.isDataFormatted = true;

      // Generate an array with just the types.
      const types = bigModel.dataTypes.map(elem => elem.type);

      // Compare.
      expect(types).toBe(correctTypes);
    });
  });
  it('Should undo to the original state', () => {
    bigModel.model.ready.then(() => {
      // Recreate the original matrix.
      const originalMatrix = DATA.split('\n').map(row => row.split(','));

      // Fetch the undo stack.
      const undoStack = bigModel.litestore.transactionStore.undoStack;

      // Undo to the original state.
      while (undoStack.length > 0) {
        bigModel.litestore.undo();
      }

      // Serialize.
      const string = bigModel.updateString();

      // Compare.
      const same =
        string === originalMatrix.map(row => row.join(',')).join('\n');
      expect(same).toBe(true);
    });
  });
  it('Should redo to the last state', () => {
    bigModel.model.ready.then(() => {
      // Fetch the redo stack.
      const redoStack = bigModel.litestore.transactionStore.undoStack;

      // Redo to the last state.
      while (redoStack.length > 0) {
        bigModel.litestore.redo();
      }

      // Serialize.
      const string = bigModel.updateString();

      // Compare.
      const same = string === dataMatrix.map(row => row.join(',')).join('\n');
      expect(same).toBe(true);
    });
  });
});
