import { DataGrid } from 'tde-datagrid';

export default class PaintedGrid extends DataGrid {
  /**
   * @override paints on the ghost row and column as well after painting the other regions.
   * Paint the grid content for the given dirty rect.
   *
   * The rect should be expressed in valid viewport coordinates.
   *
   * This is the primary paint entry point. The individual `_draw*`
   * methods should not be invoked directly. This method dispatches
   * to the drawing methods in the correct order.
   */
  protected paintContent(rx: number, ry: number, rw: number, rh: number): void {
    // Paint in the background, rows, columns, and cells first.
    super.paintContent(rx, ry, rw, rh);

    // Paint addons.
    this._paintAddons(rx, ry, rw, rh);
  }

  /**
   * Primary entry point for painting addition graphics on top of
   * the base data grid graphics.
   */
  private _paintAddons(rx: number, ry: number, rw: number, rh: number): void {
    // Draw the ghost column and row if they are in view.
    this._drawGhostRow(rx, ry, rw, rh);
  }

  /**
   * Draw the ghost row.
   */
  private _drawGhostRow(rx: number, ry: number, rw: number, rh: number): void {
    // Get the visible content dimensions.
    const contentW = this.bodyWidth - this.scrollX;
    const contentH = this.defaultSizes.rowHeight;

    // Bail if there is no content to draw.
    if (contentW <= 0 || contentH <= 0) {
      return;
    }

    // Get the visible content origin.
    const contentX = 0;
    const contentY = this.headerHeight + this.bodyHeight - contentH;

    // Bail if the dirty rect does not intersect the content area.
    if (rx + rw <= contentX) {
      return;
    }
    if (ry + rh <= contentY) {
      return;
    }
    if (rx >= contentX + contentW) {
      return;
    }
    if (ry >= contentY + contentH) {
      return;
    }

    // Fetch the geometry.
    const bw = this.bodyWidth;
    const pw = this.pageWidth;

    // Get the upper and lower bounds of the dirty content area.
    const x1 = Math.max(rx, contentX);
    const y1 = ry;
    const x2 = Math.min(rx + rw - 1, contentX + contentW - 1);
    const y2 = Math.min(ry + rh - 1, contentY + contentH - 1);

    // TODO: this commented pattern appears in the related functions
    // in DataGrid. We need to see how they are used and if we need them.

    // Fill the region with the specified color.
    this.canvasGC.fillStyle = color;
    this.canvasGC.fillRect(xMin, yMin, xMax - xMin + 1, yMax - yMin + 1);
    // // Convert the dirty content bounds into cell bounds.
    // const r1 = this.dataModel.rowCount('body');
    // const c1 = this.columnSections.indexOf(x1 - contentX + this.scrollX);
    // let r2 = r1;
    // let c2 = this.columnSections.indexOf(x2 - contentX + this.scrollX);

    // // Fetch the max row and column.
    // const maxRow = this.rowSections.count - 1;
    // const maxColumn = this.columnSections.count - 1;

    // // Handle a dirty content area larger than the cell count.
    // if (r2 < 0) {
    //   r2 = maxRow;
    // }
    // if (c2 < 0) {
    //   c2 = maxColumn;
    // }

    // // Convert the cell bounds back to visible coordinates.
    // const x = this.columnSections.offsetOf(c1) + contentX - this.scrollX;
    // const y = this.rowSections.offsetOf(r1);

    // // Set up the paint region size variables.
    // let width = 0;
    // const height = 0;

    // // Allocate the section sizes arrays.
    // const rowSizes = [this.rowSections.sizeOf(r1)];
    // const columnSizes = new Array<number>(c2 - c1 + 1).fill(0);

    // // Get the column sizes for the region.
    // for (let i = c1; i <= c2; ++i) {
    //   const size = this.columnSections.sizeOf(i);
    //   columnSizes[i - c1] = size;
    //   width += size;
    // }

    // // Here we assume that ghost row and column will not be stretched.
    // // Need to make sure this is a correct assumption.
    //     // Create the paint region object.
    // let rgn: DataGrid.PaintRegion = {
    //     region: 'body',
    //     xMin: x1, yMin: y1,
    //     xMax: x2, yMax: y2,
    //     x, y, width, height,
    //     row: r1, column: c1,
    //     rowSizes, columnSizes
    // };
  }
}
