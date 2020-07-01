import { DataGrid } from '@lumino/datagrid';

export default class EditableDataGrid extends DataGrid {
  constructor(options: DataGrid.IOptions = {}) {
    super(options);
    this.editingEnabled = true;
    // proof that an EditableDataGrid is being created

    console.log('helllo world4');
  }

  //   onMouseDown() {

  //   }
  // }
}
