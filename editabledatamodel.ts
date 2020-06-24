import { MutableDataModel, DataModel } from '@lumino/datagrid';

export default  class EditableDataModel extends MutableDataModel {

    rowCount(region: DataModel.RowRegion): number {
        return 0
      }

      columnCount(region: DataModel.ColumnRegion): number {
          return 0
      }

      data(): void { }


      setData(): boolean { return false }

      

    addColumn(): void {
        let colCount = this.columnCount('body');
        // TODO: how do we get the position of the highlighted cell.
        ++ colCount;
        // Todo: what do we return?
    }
    addRow(): void {
        let rowCount = this.rowCount('body');
        ++ rowCount;
        // TODO: what do we return?

    }

}