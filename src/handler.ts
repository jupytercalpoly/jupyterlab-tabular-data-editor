import { BasicMouseHandler, DataGrid } from '@lumino/datagrid';
import { Signal } from '@lumino/signaling';

export default class RichMouseHandler extends BasicMouseHandler {
    onContextMenu(grid: DataGrid, event: MouseEvent) {
        const {clientX, clientY } = event;
        let hit = grid.hitTest(clientX, clientY);
        const { row, column } = hit;
        console.log(row, column)
        this._rightClickSignal.emit([row, column])
    }
    get rightClickSignal() {
        return this._rightClickSignal
    }

    private _rightClickSignal = new Signal<this, Array<number>>(this)
}