import { BasicMouseHandler, DataGrid } from '@lumino/datagrid';
import { Signal } from '@lumino/signaling';

export default class RichMouseHandler extends BasicMouseHandler {
  onContextMenu(grid: DataGrid, event: MouseEvent): void {
    this.onMouseDown(grid, event);
    const { clientX, clientY } = event;
    const hit = grid.hitTest(clientX, clientY);
    const { row, column } = hit;
    this._rightClickSignal.emit([row, column]);
  }

  get rightClickSignal(): Signal<this, Array<number>> {
    return this._rightClickSignal;
  }

  private _rightClickSignal = new Signal<this, Array<number>>(this);
}
