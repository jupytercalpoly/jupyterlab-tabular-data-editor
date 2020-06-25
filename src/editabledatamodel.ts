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
        let trimRight = 0;
        let trimLeft = 0;
        // Find the end of the slice (the start of the next field), and how much we
        // should adjust to trim off a trailing field or row delimiter. First check
        // if we are getting the last column.
        if (column === this._columnCount - 1) {
            // Check if we are getting any row but the last.
            if (row < this._rowCount - 1) {
                // Set the next offset to the next row, column 0.
                nextIndex = this._getOffsetIndex(row + 1, 0);
                // Since we are not at the last row, we need to trim off the row
                // delimiter.
                trimRight += this._rowDelimiter.length;
            }
            else {
                // We are getting the last data item, so the slice end is the end of the
                // data string.
                nextIndex = this._data.length;
                // The string may or may not end in a row delimiter (RFC 4180 2.2), so
                // we explicitly check if we should trim off a row delimiter.
                if (this._data[nextIndex - 1] ===
                    this._rowDelimiter[this._rowDelimiter.length - 1]) {
                    trimRight += this._rowDelimiter.length;
                }
            }
        }
        else {
            // The next field starts at the next column offset.
            nextIndex = this._getOffsetIndex(row, column + 1);
            // Trim off the delimiter if it exists at the end of the field
            if (index < nextIndex && this._data[nextIndex - 1] === this._delimiter) {
                trimRight += 1;
            }
        }
        // Check to see if the field begins with a quote. If it does, trim a quote on either side.
        if (this._data[index] === this._quote) {
            trimLeft += 1;
            trimRight += 1;
        }
        const lastCharIndex: number = nextIndex - trimRight;
        const firstCharIndex: number = index + trimLeft;
        
    }


}