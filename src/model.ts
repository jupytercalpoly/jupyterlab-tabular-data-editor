import { MutableDataModel, DataModel } from '@lumino/datagrid';
import { DSVModel } from '@jupyterlab/csvviewer';


class EditableDSVNModel extends MutableDataModel {
    
    constructor(options: DSVModel.IOptions) {
      super();
  
      this._dsvModel = new DSVModel(options);
    }
  
    rowCount(region: DataModel.RowRegion): number {
      return this._dsvModel.rowCount(region);
    }
  
    columnCount(region: DataModel.ColumnRegion): number {
      return this._dsvModel.columnCount(region);
    }
  
    metadata(region: DataModel.CellRegion, row: number, column: number): DataModel.Metadata {
      return this._dsvModel.metadata(region, row, column);
    }
  
    data(region: DataModel.CellRegion, row: number, column: number): any {
      return this._dsvModel.data(region, row, column);
    }
  
    setData(region: DataModel.CellRegion, row: number, column: number, value: any): boolean {
    //   const model = this._dsvModel as any;
      
    //   // Set up the field and value variables.
    //   let field: DSVModel
  
    //   // Look up the field and value for the region.
    //   switch (region) {
    //   case 'body':
    //     field = model._bodyFields[column];
    //     model._data[row][field.name] = value;
    //     break;
    //   default:
    //     throw 'cannot change header data';
    //   }
      console.log("setData method called");
  
      this.emitChanged({
        type: 'cells-changed',
        region: 'body',
        row: row,
        column: column,
        rowSpan: 1,
        columnSpan: 1
      });
  
      return true;
    }
  
    private _dsvModel: DSVModel;
  }
  