import 'jest';
import EditableDSVModel from '../src/model';

const delimiter = ',';
let model: EditableDSVModel;

beforeEach(() => {
  const data = ['A,B,C', '1,2,3', '4,5,6', '7,8,9'].join('\n');
  const headerLength = 3;
  model = new EditableDSVModel({ data, delimiter }, headerLength);
});

describe('addRow function', () => {
  it('adds a row at the beginning of the model', () => {
    model.addRow(0);
    const expectedData = ['A,B,C', ',,', '1,2,3', '4,5,6', '7,8,9'].join('\n');
    expect(model.dsvModel.rawData).toBe(expectedData);
  });

  // not present in UI, but here for complete coverage
  it('adds a row at the end of the model', () => {
    model.addRow(model.dsvModel.rowCount('body'));
    const expectedData = 'A,B,C\n1,2,3\n4,5,6\n7,8,9\n,,';
    expect(model.dsvModel.rawData).toBe(expectedData);
  });

  it('adds a row in the middle of the model', () => {
    model.addRow(2);
    const expectedData = ['A,B,C', '1,2,3', '4,5,6', ',,', '7,8,9'].join('\n');
    expect(model.dsvModel.rawData).toBe(expectedData);
  });
});

describe('paste function', () => {
  it('paste a single entry to the first row, first column', () => {
    model.paste({ row: 0, column: 0 }, 'Sup');
    const expectedData = 'A,B,C\nSup,2,3\n4,5,6\n7,8,9';
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
    const expectedData = 'A,B,C\n1,2,paste-1\n4,5,6\n7,8,9';
    expect(model.dsvModel.rawData).toBe(expectedData);
  });
  it('Paste more rows than available. Should only paste where there is room', () => {
    model.paste({ row: 2, column: 0 }, 'paste-1\npaste-2');
    const expectedData = 'A,B,C\n1,2,3\n4,5,6\npaste-1,8,9';
    expect(model.dsvModel.rawData).toBe(expectedData);
  });
  it('Paste empty string.', () => {
    model.paste({ row: 0, column: 0 }, '');
    const expectedData = 'A,B,C\n,2,3\n4,5,6\n7,8,9';
    expect(model.dsvModel.rawData).toBe(expectedData);
  });
  it('Paste more rows & columns than available. Should only paste where there is room', () => {
    model.paste({ row: 2, column: 2 }, 'paste-1\tpaste-2\npaste-3\tpaste-4');
    const expectedData = 'A,B,C\n1,2,3\n4,5,6\n7,8,paste-1';
    expect(model.dsvModel.rawData).toBe(expectedData);
  });
});

describe('cut function', () => {
  it('cut a value', () => {
    model.cut({ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 });
    const expectedData = 'A,B,C\n,2,3\n4,5,6\n7,8,9';
    expect(model.dsvModel.rawData).toBe(expectedData);
  });
  it('cut end row', () => {
    model.cut({ startRow: 2, endRow: 2, startColumn: 0, endColumn: 2 });
    const expectedData = 'A,B,C\n1,2,3\n4,5,6\n,,';
    expect(model.dsvModel.rawData).toBe(expectedData);
  });
  it('cut end column', () => {
    model.cut({ startRow: 0, endRow: 2, startColumn: 2, endColumn: 2 });
    const expectedData = 'A,B,C\n1,2,\n4,5,\n7,8,';
    expect(model.dsvModel.rawData).toBe(expectedData);
  });
});

describe('removeRow function', () => {
  it('remove a row at the beginning of the model', () => {
    model.removeRow(0);
    const expectedData = ['A,B,C', '4,5,6', '7,8,9'].join('\n');
    expect(model.dsvModel.rawData).toBe(expectedData);
  });

  it('remove a row at the end of the model', () => {
    model.removeRow(model.dsvModel.rowCount('body') - 1);
    const expectedData = 'A,B,C\n1,2,3\n4,5,6';
    expect(model.dsvModel.rawData).toBe(expectedData);
  });

  it('adds a row in the middle of the model', () => {
    model.removeRow(1);
    const expectedData = ['A,B,C', '1,2,3', '7,8,9'].join('\n');
    expect(model.dsvModel.rawData).toBe(expectedData);
  });
});
