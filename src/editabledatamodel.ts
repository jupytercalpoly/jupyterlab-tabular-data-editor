// import { MutableDataModel, DataModel } from '@lumino/datagrid';

// export default class EditableDataModel extends MutableDataModel {
//   rowCount(region: DataModel.RowRegion): number {
//     return 0;
//   }

//   columnCount(region: DataModel.ColumnRegion): number {
//     return 0;
//   }

//   data(): void {}

//   //   @param region - The cell region of interest.
//   //   @param row - The row index of the cell of interest.
//   //   @param column - The column index of the cell of interest.
//   //
//   //
//   //     @returns true if succeeds, false otherwise.

//   setData(): boolean {
//     return false;
//   }

//   //   @param position - the column index of the selected column.

//   addColumn(row: number, column: number): void {
//     let colCount = this.columnCount('body');
//     // TODO: how do we get the position of the highlighted cell.
//     ++colCount;
//     // Todo: what do we return?
//   }
//   // @param  position - the row index of the selected row

//   addRow(row: number, column: number): void {
//     let rowCount = this.rowCount('body');
//     ++rowCount;
//     // TODO: what do we return?
//   }
// }