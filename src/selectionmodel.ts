import { BasicSelectionModel, SelectionModel } from 'tde-datagrid';

export default class GhostSelectionModel extends BasicSelectionModel {
  select(selection: SelectionModel.SelectArgs): void {
    // Find the bounds of the real rows and columns.
    const realRowCount = this.dataModel.rowCount('body') - 1;
    const realColumnCount = this.dataModel.columnCount('body') - 1;
    // Unpack the selection.
    let { r1, r2, c1, c2 } = selection;
    const { cursorRow, cursorColumn, clear } = selection;
    // Clamp to the data model
    r1 = Math.max(0, Math.min(r1, realRowCount - 1));
    r2 = Math.max(0, Math.min(r2, realRowCount - 1));
    c1 = Math.max(0, Math.min(c1, realColumnCount - 1));
    c2 = Math.max(0, Math.min(c2, realColumnCount - 1));
    super.select({ r1, r2, c1, c2, cursorRow, cursorColumn, clear });
  }
}
