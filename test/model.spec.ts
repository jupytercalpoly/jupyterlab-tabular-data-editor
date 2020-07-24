import 'jest';
import { EditableDSVModel, DATAMODEL_SCHEMA, RECORD_ID } from '../src/model';
import { DataModel } from '@lumino/datagrid';

const delimiter = ',';
let model: EditableDSVModel;
let change: DataModel.ChangedArgs;

beforeEach(() => {
  const data = ['A,B,C', '1,2,3', 'abc,5,6', '7,8,9'].join('\n');
  model = new EditableDSVModel({ data, delimiter });
});

describe('table editing functions', () => {
  it('gets data', () => {
    expect(model.data('body', 0, 0)).toBe('1');
    expect(model.data('body', 1, 0)).toBe('abc');
    expect(model.data('body', 1, 1)).toBe('5');
    expect(model.data('body', 2, 1)).toBe('8');
    expect(model.data('body', 2, 2)).toBe('9');
  });
  describe('add', () => {
    describe('addRow function', () => {
      it('adds a row at the beginning of the model', () => {
        model.addRow(0);
        const expectedData = ['A,B,C', ',,', '1,2,3', 'abc,5,6', '7,8,9'].join(
          '\n'
        );
        expect(model.dsvModel.rawData).toBe(expectedData);
      });

      // not present in UI, but here for complete coverage
      it('adds a row at the end of the model', () => {
        model.addRow(model.dsvModel.rowCount('body'));
        const expectedData = ['A,B,C', '1,2,3', 'abc,5,6', '7,8,9', ',,'].join(
          '\n'
        );
        expect(model.dsvModel.rawData).toBe(expectedData);
      });

      it('adds a row in the middle of the model', () => {
        model.addRow(2);
        const expectedData = ['A,B,C', '1,2,3', 'abc,5,6', ',,', '7,8,9'].join(
          '\n'
        );
        expect(model.dsvModel.rawData).toBe(expectedData);
      });
    });
    describe('addColumn function', () => {
      it('adds a column at the beginning of the model', () => {
        model.addColumn(0);
        const expectedData = ['A,B,C,D', ',1,2,3', ',abc,5,6', ',7,8,9'].join(
          '\n'
        );
        expect(model.dsvModel.rawData).toBe(expectedData);
        expect(model.dsvModel.header).toStrictEqual(['A', 'B', 'C', 'D']);
      });

      // not present in UI, but here for complete coverage
      it('adds a column at the end of the model', () => {
        model.addColumn(model.dsvModel.rowCount('body'));
        const expectedData = ['A,B,C,D', '1,2,3,', 'abc,5,6,', '7,8,9,'].join(
          '\n'
        );
        expect(model.dsvModel.rawData).toBe(expectedData);
        expect(model.dsvModel.header).toStrictEqual(['A', 'B', 'C', 'D']);
      });

      it('adds a column in the middle of the model', () => {
        model.addColumn(1);
        const expectedData = ['A,B,C,D', '1,,2,3', 'abc,,5,6', '7,,8,9'].join(
          '\n'
        );
        expect(model.dsvModel.rawData).toBe(expectedData);
        expect(model.dsvModel.header).toStrictEqual(['A', 'B', 'C', 'D']);
      });
    });
  });
  describe('remove', () => {
    describe('removeRow function', () => {
      it('remove a row at the beginning of the model', () => {
        model.removeRow(0);
        const expectedData = ['A,B,C', 'abc,5,6', '7,8,9'].join('\n');
        expect(model.dsvModel.rawData).toBe(expectedData);
      });

      it('remove a row at the end of the model', () => {
        model.removeRow(model.dsvModel.rowCount('body') - 1);
        const expectedData = ['A,B,C', '1,2,3', 'abc,5,6'].join('\n');
        expect(model.dsvModel.rawData).toBe(expectedData);
      });

      it('remove a row in the middle of the model', () => {
        model.removeRow(1);
        const expectedData = ['A,B,C', '1,2,3', '7,8,9'].join('\n');
        expect(model.dsvModel.rawData).toBe(expectedData);
      });
    });
    describe('removeColumn function', () => {
      it('remove a column at the beginning of the model', () => {
        model.removeColumn(0);
        const expectedData = ['A,B', '2,3', '5,6', '8,9'].join('\n');
        expect(model.dsvModel.rawData).toBe(expectedData);
      });

      it('remove a column at the end of the model', () => {
        model.removeColumn(model.dsvModel.rowCount('body') - 1);
        const expectedData = ['A,B', '1,2', 'abc,5', '7,8'].join('\n');
        expect(model.dsvModel.rawData).toBe(expectedData);
      });

      it('remove a column in the middle of the model', () => {
        model.removeColumn(1);
        const expectedData = ['A,B', '1,3', 'abc,6', '7,9'].join('\n');
        expect(model.dsvModel.rawData).toBe(expectedData);
      });
    });
  });
  describe('move', () => {
    describe('moveRow function', () => {
      it('move a row at the beginning of the model', () => {
        model.moveRow(0, 1);
        const expectedData = ['A,B,C', 'abc,5,6', '1,2,3', '7,8,9'].join('\n');
        expect(model.dsvModel.rawData).toBe(expectedData);
      });

      it('move a row at the end of the model', () => {
        model.moveRow(0, model.dsvModel.rowCount('body') - 1);
        const expectedData = ['A,B,C', 'abc,5,6', '7,8,9', '1,2,3'].join('\n');
        expect(model.dsvModel.rawData).toBe(expectedData);
      });

      it('move a row in the middle of the model', () => {
        model.moveRow(1, 2);
        const expectedData = ['A,B,C', '1,2,3', '7,8,9', 'abc,5,6'].join('\n');
        expect(model.dsvModel.rawData).toBe(expectedData);
      });
    });
    describe('moveColumn function', () => {
      it('move a column at the beginning of the model', () => {
        model.moveColumn(0, 1);
        const expectedData = ['A,B,C', '2,1,3', '5,abc,6', '8,7,9'].join('\n');
        expect(model.dsvModel.rawData).toBe(expectedData);
      });

      it('move a column at the end of the model', () => {
        model.moveColumn(0, model.dsvModel.rowCount('body') - 1);
        const expectedData = ['A,B,C', '2,3,1', '5,6,abc', '8,9,7'].join('\n');
        expect(model.dsvModel.rawData).toBe(expectedData);
      });

      it('move a column in the middle of the model', () => {
        model.moveColumn(1, 2);
        const expectedData = ['A,B,C', '1,3,2', 'abc,6,5', '7,9,8'].join('\n');
        expect(model.dsvModel.rawData).toBe(expectedData);
      });
    });
  });
  describe('cut function', () => {
    it('cut a value', () => {
      model.cut({ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 });
      const expectedData = 'A,B,C\n,2,3\nabc,5,6\n7,8,9';
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('cut end row', () => {
      model.cut({ startRow: 2, endRow: 2, startColumn: 0, endColumn: 2 });
      const expectedData = 'A,B,C\n1,2,3\nabc,5,6\n,,';
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('cut end column', () => {
      model.cut({ startRow: 0, endRow: 2, startColumn: 2, endColumn: 2 });
      const expectedData = 'A,B,C\n1,2,\nabc,5,\n7,8,';
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
  });
  describe('paste function', () => {
    it('paste a single entry to the first row, first column', () => {
      model.paste({ row: 0, column: 0 }, 'Sup');
      const expectedData = 'A,B,C\nSup,2,3\nabc,5,6\n7,8,9';
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('paste a row', () => {
      model.paste({ row: 1, column: 0 }, 'paste-1\tpaste-2\tpaste-3');
      const expectedData = 'A,B,C\n1,2,3\npaste-1,paste-2,paste-3\n7,8,9';
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('paste a column', () => {
      model.paste({ row: 0, column: 0 }, 'paste-1\npaste-2\npaste-3');
      const expectedData = 'A,B,C\npaste-1,2,3\npaste-2,5,6\npaste-3,8,9';
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('Paste more columns than available. Should only paste where there is room', () => {
      model.paste({ row: 0, column: 2 }, 'paste-1\tpaste-2');
      const expectedData = 'A,B,C\n1,2,paste-1\nabc,5,6\n7,8,9';
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('Paste more rows than available. Should only paste where there is room', () => {
      model.paste({ row: 2, column: 0 }, 'paste-1\npaste-2');
      const expectedData = 'A,B,C\n1,2,3\nabc,5,6\npaste-1,8,9';
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('Paste empty string.', () => {
      model.paste({ row: 0, column: 0 }, '');
      const expectedData = 'A,B,C\n,2,3\nabc,5,6\n7,8,9';
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('Paste more rows & columns than available. Should only paste where there is room', () => {
      model.paste({ row: 2, column: 2 }, 'paste-1\tpaste-2\npaste-3\tpaste-4');
      const expectedData = 'A,B,C\n1,2,3\nabc,5,6\n7,8,paste-1';
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
  });
  describe('undo function', () => {
    it('tries to undo when nothing can be undone', () => {
      change = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      }).change;
      model.undo(change);
      const expectedData = ['A,B,C', '1,2,3', 'abc,5,6', '7,8,9'].join('\n');
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('undo a cell edit', () => {
      model.setData('body', 1, 0, '123');
      change = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      }).change;
      model.undo(change);
      const expectedData = ['A,B,C', '1,2,3', 'abc,5,6', '7,8,9'].join('\n');
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('undo add a row', () => {
      model.addRow(2);
      change = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      }).change;
      model.undo(change);
      const expectedData = ['A,B,C', '1,2,3', 'abc,5,6', '7,8,9'].join('\n');
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('undo add a column', () => {
      model.addColumn(0);
      change = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      }).change;
      model.undo(change);
      const expectedData = ['A,B,C', '1,2,3', 'abc,5,6', '7,8,9'].join('\n');
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('undo remove a row ', () => {
      model.removeRow(1);
      change = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      }).change;
      model.undo(change);
      const expectedData = ['A,B,C', '1,2,3', 'abc,5,6', '7,8,9'].join('\n');
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('undo remove a column', () => {
      model.removeColumn(0);
      change = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      }).change;
      model.undo(change);
      const expectedData = ['A,B,C', '1,2,3', 'abc,5,6', '7,8,9'].join('\n');
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('undo move a row', () => {
      model.moveRow(0, 1);
      change = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      }).change;
      model.undo(change);
      const expectedData = ['A,B,C', '1,2,3', 'abc,5,6', '7,8,9'].join('\n');
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('undo move a column', () => {
      model.moveColumn(0, 2);
      change = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      }).change;
      model.undo(change);
      const expectedData = ['A,B,C', '1,2,3', 'abc,5,6', '7,8,9'].join('\n');
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
  });
  describe('redo function', () => {
    it('tries to redo when nothing can be redone', () => {
      model.litestore.redo();
      const { change, modelData } = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      });
      model.redo(change, modelData);
      const expectedData = ['A,B,C', '1,2,3', 'abc,5,6', '7,8,9'].join('\n');
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('redo a cell edit', () => {
      model.setData('body', 1, 0, '123');
      const oldChange = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      }).change;
      model.undo(oldChange);
      model.litestore.redo();
      const { change, modelData } = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      });
      model.redo(change, modelData);
      const expectedData = ['A,B,C', '1,2,3', '123,5,6', '7,8,9'].join('\n');
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('redo add a row', () => {
      model.addRow(2);
      const oldChange = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      }).change;
      model.undo(oldChange);
      model.litestore.redo();
      const { change, modelData } = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      });
      model.redo(change, modelData);
      const expectedData = ['A,B,C', '1,2,3', 'abc,5,6', ',,', '7,8,9'].join(
        '\n'
      );
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('redo add a column', () => {
      model.addColumn(0);
      const oldChange = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      }).change;
      model.undo(oldChange);
      model.litestore.redo();
      const { change, modelData } = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      });
      model.redo(change, modelData);
      const expectedData = ['A,B,C,D', ',1,2,3', ',abc,5,6', ',7,8,9'].join(
        '\n'
      );
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('redo remove a row ', () => {
      model.removeRow(1);
      const oldChange = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      }).change;
      model.undo(oldChange);
      model.litestore.redo();
      const { change, modelData } = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      });
      model.redo(change, modelData);
      const expectedData = ['A,B,C', '1,2,3', '7,8,9'].join('\n');
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('redo remove a column', () => {
      model.removeColumn(0);
      const oldChange = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      }).change;
      model.undo(oldChange);
      model.litestore.redo();
      const { change, modelData } = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      });
      model.redo(change, modelData);
      const expectedData = ['A,B', '2,3', '5,6', '8,9'].join('\n');
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('redo move a row ', () => {
      model.moveRow(0, 1);
      const oldChange = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      }).change;
      model.undo(oldChange);
      model.litestore.redo();
      const { change, modelData } = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      });
      model.redo(change, modelData);
      const expectedData = ['A,B,C', 'abc,5,6', '1,2,3', '7,8,9'].join('\n');
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('redo move a column', () => {
      model.moveColumn(1, 2);
      const oldChange = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      }).change;
      model.undo(oldChange);
      model.litestore.redo();
      const { change, modelData } = model.litestore.getRecord({
        schema: DATAMODEL_SCHEMA,
        record: RECORD_ID
      });
      model.redo(change, modelData);
      const expectedData = ['A,B,C', '1,3,2', 'abc,6,5', '7,9,8'].join('\n');
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
  });
});

describe('helper functions', () => {
  describe('sliceOut', () => {
    it('remove the top corner (keeping cell)', () => {
      model.sliceOut(model.dsvModel, { row: 0, column: 0 }, true);
      const expectedData = 'A,B,C\n,2,3\nabc,5,6\n7,8,9';
      expect(model.dsvModel.rawData).toBe(expectedData);
    });
    it('Check return value of sliceOut', () => {
      const value = model.sliceOut(model.dsvModel, { row: 0, column: 0 }, true);
      expect(value).toBe('1');
    });
    it('return value for last row', () => {
      const value = model.sliceOut(model.dsvModel, {
        row: model.rowCount() - 1
      });
      expect(value).toBe('\n7,8,9');
    });
  });

  describe('isTrimOperation', () => {
    it('selecting on last column, should return true', () => {
      const result = model.isTrimOperation({
        row: 1,
        column: model.columnCount() - 1
      });
      expect(result).toBe(true);
    });
    it('selecting on last row w/out column, should return true', () => {
      const result = model.isTrimOperation({ row: model.rowCount() - 1 });
      expect(result).toBe(true);
    });
    it('selecting middle entry, should return false', () => {
      const result = model.isTrimOperation({ row: 1, column: 1 });
      expect(result).toBe(false);
    });
  });

  describe('lastIndex', () => {
    it('requesting last index of middle row', () => {
      const result = model.lastIndex({ row: 1 });
      expect(result).toBe(model.dsvModel.rawData.indexOf('6') + 1);
    });
    it('requesting last index of last row', () => {
      const result = model.lastIndex({ row: 2 });
      expect(result).toBe(model.dsvModel.rawData.length);
    });
  });
});
