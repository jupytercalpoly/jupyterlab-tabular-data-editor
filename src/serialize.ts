import { DSVModel } from 'tde-csvviewer';
import { ListField } from 'tde-datastore';

function modelRows(model: DSVModel): number {
  return model.rowCount('body') + 1;
}

function modelColumns(model: DSVModel): number {
  return model.columnCount('body');
}

function rowEnd(model: DSVModel, row: number): number {
  const rows = modelRows(model);
  const rowTrim = model.rowDelimiter.length;
  // See if we are on any row but the last.
  if (row + 1 < rows) {
    return model.getOffsetIndex(row + 1, 0) - rowTrim;
  }
  return model.rawData.length;
}

export function openSlice(
  model: DSVModel,
  row: number,
  start: number,
  end: number
): string {
  if (end + 1 < modelColumns(model)) {
    const trimRight = model.delimiter.length;
    return model.rawData.slice(
      model.getOffsetIndex(row, start),
      model.getOffsetIndex(row, end + 1) - trimRight
    );
  }
  return model.rawData.slice(
    model.getOffsetIndex(row, start),
    rowEnd(model, row)
  );
}

function columnSlicePattern(
  columnMap: ListField.Value<number>,
  model: DSVModel
): SlicePattern {
  let i = 0;
  const buffers: string[] = [];
  const slices: Array<Array<number>> = [];
  let nextSlice: number[] = [];
  let delimiterReps = 0;
  while (i < columnMap.length) {
    while (!Number.isInteger(columnMap[i])) {
      i++;
      delimiterReps++;
    }
    buffers.push(model.delimiter.repeat(delimiterReps));
    delimiterReps = 0;
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
  console.log({ buffers, slices });
  return { buffers, slices };
}

export function performGlobalSlice(
  model: DSVModel,
  slicePattern: SlicePattern,
  rowMap: ListField.Value<number>,
  columnMap: ListField.Value<number>
): string {
  // Initialize a map array.
  const mapArray: Array<string | 0> = new Array(rowMap.length).fill(0);
  const { buffers, slices } = slicePattern;
  // initialize a callback for the map method.
  const mapper = (elem: any, index: number) => {
    const row = rowMap[index];
    if (!Number.isInteger(row)) {
      return blankRow(rowMap, columnMap, index, model);
    }
    let str = buffers[0];
    for (let i = 0; i < slices.length; i++) {
      str += openSlice(model, row, slices[i][0], slices[i][1]) + buffers[i + 1];
    }
    return str;
  };
  return mapArray.map(mapper).join(model.rowDelimiter);
}

export function serializer(
  rowMap: ListField.Value<number>,
  columnMap: ListField.Value<number>,
  model: DSVModel
): string {
  const slicePattern = columnSlicePattern(columnMap, model);
  return performGlobalSlice(model, slicePattern, rowMap, columnMap);
}

/**
 * Returns a blank row with the correct numbers of columns and correct delimiters
 * @param model The DSV model being used
 * @param row The index of the row being inserted (determines whether to add a row delimiter or not)
 */
function blankRow(
  rowMap: ListField.Value<number>,
  columnMap: ListField.Value<number>,
  row: number,
  model: DSVModel
): string {
  const rows = rowMap.length;
  if (row + 1 === rows) {
    return model.rowDelimiter + model.delimiter.repeat(columnMap.length - 1);
  }
  return model.delimiter.repeat(columnMap.length - 1) + model.rowDelimiter;
}

export type SlicePattern = {
  buffers: Array<string>;
  slices: Array<Array<number>>;
};
