import { Signal } from '@lumino/signaling';
import { TextRenderConfig } from 'tde-csvviewer';
import { DataGrid, CellRenderer } from 'tde-datagrid';
import { ISignal } from '@lumino/signaling';
import { ISearchMatch } from '@jupyterlab/documentsearch';

/**
 * Responsible for finding matches within the datagrid and handling datagrid UI changes
 *
 * Search service remembers the search state and the location of the last
 * match, for incremental searching.
 * Search service is also responsible of providing a cell renderer function
 * to set the background color of cells matching the search text.
 */
export class GridSearchService {
  constructor(grid: DataGrid) {
    this._grid = grid;
    this._query = null;
    this._row = 0;
    this._column = -1;
  }

  /**
   * A signal fired when the grid changes.
   */
  get changed(): ISignal<GridSearchService, void> {
    return this._changed;
  }

  get row(): number {
    return this._row - 1;
  }
  get column(): number {
    return this._column;
  }

  get matches(): ISearchMatch[] {
    return this._matches;
  }

  get currentMatch(): ISearchMatch {
    return this._currentMatch;
  }

  /**
   * Returns a cellrenderer config function to render each cell background.
   * If cell match, background is matchBackgroundColor, if it's the current
   * match, background is currentMatchBackgroundColor.
   */
  cellBackgroundColorRendererFunc(
    config: TextRenderConfig
  ): CellRenderer.ConfigFunc<string> {
    return ({ value, row, column }): string => {
      if (this._query) {
        if ((value as string).match(this._query)) {
          if (
            this._currentMatch.line === row &&
            this._currentMatch.column === column
          ) {
            return config.currentMatchBackgroundColor;
          }
          return config.matchBackgroundColor;
        }
      }
      return '';
    };
  }

  /**
   * Clear the search.
   */
  clear(): void {
    this._query = null;
    this._row = 0;
    this._column = -1;
    this._changed.emit(undefined);
  }

  /**
   * incrementally look for searchText.
   */
  find(query: RegExp, reverse = false): ISearchMatch[] | boolean {
    const model = this._grid.dataModel;
    const rowCount = model.rowCount('body');
    const columnCount = model.columnCount('body');

    if (this._query !== query) {
      // reset search
      this._row = 0;
      this._column = -1;
      this._matches = [];
    }
    this._query = query;

    // check if the match is in current viewport
    const minRow = this._grid.scrollY / this._grid.defaultSizes.rowHeight;
    const maxRow =
      (this._grid.scrollY + this._grid.pageHeight) /
      this._grid.defaultSizes.rowHeight;
    const minColumn =
      this._grid.scrollX / this._grid.defaultSizes.columnHeaderHeight;
    const maxColumn =
      (this._grid.scrollX + this._grid.pageWidth) /
      this._grid.defaultSizes.columnHeaderHeight;
    const isInViewport = (row: number, column: number): boolean => {
      return (
        row >= minRow &&
        row <= maxRow &&
        column >= minColumn &&
        column <= maxColumn
      );
    };

    const increment = reverse ? -1 : 1;
    this._column += increment;
    for (
      let row = this._row;
      reverse ? row >= 0 : row < rowCount;
      row += increment
    ) {
      for (
        let col = this._column;
        reverse ? col >= 0 : col < columnCount;
        col += increment
      ) {
        const cellData = model.data('body', row, col) as string;
        if (cellData.match(query)) {
          // to update the background of matching cells.

          // TODO: we only really need to invalidate the previous and current
          // cell rects, not the entire grid.
          this._changed.emit(undefined);

          if (!isInViewport(row, col)) {
            this._grid.scrollToRow(row);
          }
          this._row = row;
          this._column = col;

          // create ISearchMatch and push it to the matches array
          const match = {
            text: query.source,
            fragment: cellData,
            line: row,
            column: col,
            index: this._matches.length
          };
          this._matches.push(match);
        }
      }
      this._column = reverse ? columnCount - 1 : 0;
    }

    if (this._matches.length > 0) {
      this._currentMatch = this._matches[0];
    }
    return this._matches;
  }

  get query(): RegExp | null {
    return this._query;
  }

  highlightNext(reverse: boolean): ISearchMatch | undefined {
    if (this._matches.length === 0) {
      return undefined;
    }
    if (!this._currentMatch) {
      this._currentMatch = reverse
        ? this._matches[this.matches.length - 1]
        : this._matches[0];
    } else {
      let nextIndex = reverse
        ? this._currentMatch.index - 1
        : this._currentMatch.index + 1;

      // Cheap way to make this a circular buffer
      nextIndex = (nextIndex + this._matches.length) % this._matches.length;
      this._currentMatch = this._matches[nextIndex];
    }

    this._changed.emit(undefined);
    return this._currentMatch;
  }

  private _grid: DataGrid;
  private _query: RegExp | null;
  private _matches: ISearchMatch[] = [];
  private _row: number;
  private _column: number;
  private _currentMatch: ISearchMatch;
  private _changed = new Signal<GridSearchService, void>(this);
}
