import { BasicSelectionModel, SelectionModel } from 'tde-datagrid';
import { EditorModel } from './newmodel';

export default class GhostSelectionModel extends BasicSelectionModel {
  select(selection: SelectionModel.SelectArgs): void {
    // Hide the ghost row and column from selection.
    const model = this.dataModel as EditorModel;
    model.ghostsRevealed = false;
    super.select(selection);
    model.ghostsRevealed = true;
  }
}
