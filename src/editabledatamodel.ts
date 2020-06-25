// Notes: The following class depends on a version of DSVModel in which the following methods
// and attributes are made visible (e.g. protected status)
/** 
 * Attributes
 *   - _data
 *   - _rowDelimiter
 *   - 
 * Methods
 *   - _getOffsetIndex
 *   _ _parseAsync
 * 
**/
import { DSVModel } from '@jupyterlab/csvviewer';

export default class EditableDataModel extends DSVModel {

    /**
     * 
     * @param index index of the row/column directly after where we will insert a new row/column
     * @param axis determins whether we are inserting a row or a column
     */

    addColumnOrRow(index: number, axis: "row" | "column"): void {
        let cutoffIndex: number;

        // Check wether its a row or collumn we are adding.
        if (axis == "row") {
            cutoffIndex = this_getOffsetIndex(index, 0);
            this._data = this._data.slice(0, cutoffIndex)
                .concat(','.repeat(this.columnCount('body') - 1))  //first through (n-1)th entry ends with comma
                .concat(this._rowDelimiter)                         // nth ends with row-delimeter
                .concat(this._data.slice(cutoffIndex, this._data.length)) // rest of data tacked on after.
        } else {
            cutoffIndex = this._getOffsetIndex(0, index);
            // TODO: add a column to this._data. Seems like it will be quite a bit trickier
        }
        // TODO: probably have to run some commands here to have the dataModel adjust to the new data.
        // this might do it
        this._parseAsync();
    }
    /**
     * Notes: I am note sure if the way I have initially setup this function is too restrictive by
     * assuming we are only editing one cell at a time.
     * 
     * @param row -index of the row in which we are making a change
     * @param column -index of the column in which we are making a change
     */
    changeCell(row: number, column: number) {
        // index of the first char of entry in question
        const index: number = this._getOffsetIndex(row, column);

        // find the index to the first char of the next entry.
        let nextIndex: number;



    }


}