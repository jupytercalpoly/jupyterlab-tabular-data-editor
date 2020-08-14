import { TextCellEditor } from 'tde-datagrid';

export class HeaderCellEditor extends TextCellEditor {
  /**
   * Reposition cell editor by moving viewport occluder and cell editor container.
   */
  protected updatePosition(): void {
    const grid = this.cell.grid;
    const cellInfo = this.getCellInfo(this.cell);
    const headerHeight = grid.headerHeight;
    const headerWidth = grid.headerWidth;

    this.viewportOccluder.style.top = '0' + 'px';
    this.viewportOccluder.style.left = headerWidth + 'px';
    this.viewportOccluder.style.width = grid.viewportWidth - headerWidth + 'px';
    this.viewportOccluder.style.height =
      grid.viewportHeight - headerHeight + 'px';
    this.viewportOccluder.style.position = 'absolute';

    this.editorContainer.style.left = cellInfo.x - 1 - headerWidth + 'px';
    this.editorContainer.style.top = cellInfo.y - 1 - headerHeight + 'px';
    this.editorContainer.style.width = cellInfo.width + 1 + 'px';
    this.editorContainer.style.height = headerHeight + 1 + 'px';
    this.editorContainer.style.visibility = 'visible';
    this.editorContainer.style.position = 'absolute';
  }
}
