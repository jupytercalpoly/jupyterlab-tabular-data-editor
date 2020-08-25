import { BasicKeyHandler, DataGrid } from 'tde-datagrid';
import { getKeyboardLayout } from '@lumino/keyboard';
import { EditorModel } from './newmodel';

export class RichKeyHandler extends BasicKeyHandler {
  onKeyDown(grid: DataGrid, event: KeyboardEvent) {
    const key = getKeyboardLayout().keyForKeydownEvent(event);
    if (key === 'Backspace' || key === 'Delete') {
      event.stopPropagation();
      event.preventDefault();
      this.onDelete(grid, event);
      return;
    }
    super.onKeyDown(grid, event);
  }
  onDelete(grid: DataGrid, event: KeyboardEvent) {
    // Fetch the selection.
    const selection = grid.selectionModel.currentSelection();

    // Fetch the dataModel.
    const model = grid.dataModel as EditorModel;

    // Compute an update for the model.
    const update = model.clearCells('body', selection);

    // Emit the change to the editor.
    model.onChangedSignal.emit(update);
  }
}
