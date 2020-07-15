import 'jest';
import EditableDSVModel from '../src/model';

const delimiter = ',';
let model: EditableDSVModel;

beforeEach(() => {
  const data = 'A,B,C\n1,2,3\n4,5,6\n7,8,9';
  const headerLength = 3;
  model = new EditableDSVModel({ data, delimiter }, headerLength);
});

describe('addRow functions', () => {
  it('adds a row to the beginning of the model', () => {
    const bool = model ? true : false;
    expect(bool).toBeTruthy();
    model.addRow(0);
    console.log(model.dsvModel.rawData);
    const expectedData = 'A,B,C\n,,\n1,2,3\n4,5,6\n7,8,9';
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
