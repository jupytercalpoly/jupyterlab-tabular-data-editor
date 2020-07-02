import { TextCellEditor } from '@lumino/datagrid';
// import { getKeyboardLayout } from '@lumino/keyboard';

/**
 * Example custom cell editor which implements editing
 * text cell data.
 */
export default class CSVTextCellEditor extends TextCellEditor {
  updatePosition(): void {
    super.updatePosition();
    this.viewportOccluder.style.position = 'absolute';
    this.editorContainer.style.position = 'absolute';
  }
}
