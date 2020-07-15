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
