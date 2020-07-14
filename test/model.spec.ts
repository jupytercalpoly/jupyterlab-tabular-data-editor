import 'jest';
import EditableDSVModel from '../src/model';

const delimiter = ',';
let model: EditableDSVModel;
let rowDelimiter: string;

beforeEach(() => {
  const data = `A,B,C
  1,2,3
  4,5,6
  7,8,9`;
  const headerLength = 3;
  model = new EditableDSVModel({ data, delimiter }, headerLength);
  rowDelimiter = model.dsvModel.rowDelimiter;
});

describe('addRow functions', () => {
  it('adds a row to the beginning of the model', () => {
    const bool = model ? true : false;
    expect(bool).toBeTruthy();
    model.addRow(0);
    console.log(model.dsvModel.rawData);
    const expectedData = ['A,B,C', ',,', '1,2,3', '4,5,6', '7,8,9'].join(
      rowDelimiter
    );
    expect(model.dsvModel.rawData).toBe(expectedData);
  });
});
