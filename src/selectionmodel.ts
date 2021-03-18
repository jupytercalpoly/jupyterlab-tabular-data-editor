import { BasicSelectionModel, SelectionModel } from '@lumino/datagrid';
import { EditorModel } from './model';

export default class GhostSelectionModel extends BasicSelectionModel {
  select(selection: SelectionModel.SelectArgs): void {
    // Hide the ghost row and column from selection.
    const model = this.dataModel as EditorModel;
    model.ghostsRevealed = false;
    super.select(selection);
    model.ghostsRevealed = true;
  }
}
