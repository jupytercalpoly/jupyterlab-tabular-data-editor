import { DataGrid } from '@lumino/datagrid';

export default class EditableDataGrid extends DataGrid {
  constructor(options: DataGrid.IOptions = {}) {
    super(options);
    // proof that an EditableDataGrid is being created
    console.log('helllo');
  }

//   onMouseDown() {

//   }
// }
}
