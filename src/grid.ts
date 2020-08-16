import { DataGrid } from 'tde-datagrid';
import { LabIcon, addIcon } from '@jupyterlab/ui-components';

export class PaintedGrid extends DataGrid {
  constructor(options: PaintedGrid.IOptions) {
    super(options);
    this._extraStyle = options.extraStyle || PaintedGrid.defaultExtraStyle;
  }
  /**
   * Get the extra styles of the PaintedGrid.
   */
  get extraStyle(): PaintedGrid.ExtraStyle {
    return this._extraStyle;
  }
  /**
   * Set the styles of the painted grid.
   */
  set extraStyle(value: PaintedGrid.ExtraStyle) {
    // Bail if the style does not change.
    if (this._extraStyle === value) {
      return;
    }

    // Update the internal style.
    this._extraStyle = { ...value };

    // Schedule a repaint of the content.
    this.repaintContent();

    // Schedule a repaint of the overlay.
    this.repaintOverlay();
  }

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
    // Draw the ghost row.
    this._drawGhostRow(rx, ry, rw, rh);

    // Draw the ghost column.
    this._drawGhostColumn(rx, ry, rw, rh);

    // Draw the header region for the ghost row.
    this._drawGhostRowHeader(rx, ry, rw, rh);

    // Draw the header region for the ghost column.
    this._drawGhostColumnHeader(rx, ry, rw, rh);

    // Draw over the corner to hide it from view.
    this._drawOverCorner(rx, ry, rw, rh);
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
    const contentX = this.headerWidth;
    const contentY =
      this.headerHeight + this.bodyHeight - contentH - this.scrollY;

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

    // TODO: figure out where this might be necessary.
    // // Fetch the geometry.
    // const bw = this.bodyWidth;
    // const pw = this.pageWidth;

    // Get the upper and lower bounds of the dirty content area.
    const x1 = Math.max(rx, contentX);
    const y1 = Math.max(ry, contentY);
    const x2 = Math.min(rx + rw - 1, contentX + contentW - 1);
    const y2 = Math.min(ry + rh - 1, contentY + contentH - 1);

    // TODO: this commented pattern appears in the related functions
    // in DataGrid. We need to see how they are used and if we need them.

    // Fill the region with the specified color.
    this.canvasGC.fillStyle = this._extraStyle.ghostRowColor;
    this.canvasGC.fillRect(x1, y1, x2 - x1 + 1, y2 - y1 + 1);

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

  /**
   * Draw the ghost column.
   */
  private _drawGhostColumn(
    rx: number,
    ry: number,
    rw: number,
    rh: number
  ): void {
    // Get the visible content dimensions.
    const contentW = this.defaultSizes.columnWidth;
    const contentH = this.bodyHeight - this.scrollY;

    // Bail if there is no content to draw.
    if (contentW <= 0 || contentH <= 0) {
      return;
    }

    // Get the visible content origin.
    const contentX =
      this.headerWidth + this.bodyWidth - contentW - this.scrollX;
    const contentY = this.headerHeight;

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

    // Get the upper and lower bounds of the dirty content area.
    const x1 = Math.max(rx, contentX);
    const y1 = Math.max(ry, contentY);
    const x2 = Math.min(rx + rw - 1, contentX + contentW - 1);
    const y2 = Math.min(ry + rh - 1, contentY + contentH - 1);

    // Fill the region with the specified color.
    this.canvasGC.fillStyle = this._extraStyle.ghostColumnColor;
    this.canvasGC.fillRect(x1, y1, x2 - x1 + 1, y2 - y1 + 1);
  }

  private _drawGhostRowHeader(
    rx: number,
    ry: number,
    rw: number,
    rh: number
  ): void {
    // Get the visible content dimensions.
    const contentW = this.headerWidth;
    const contentH = this.defaultSizes.rowHeight;

    // Bail if there is no content to draw.
    if (contentW <= 0 || contentH <= 0) {
      return;
    }

    // Get the visible content origin.
    const contentX = 0;
    const contentY =
      this.headerHeight + this.bodyHeight - contentH - this.scrollY;

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

    // Get the upper and lower bounds of the dirty content area.
    const x1 = rx;
    const y1 = Math.max(ry, contentY);
    const x2 = Math.min(rx + rw - 1, contentX + contentW - 1);
    const y2 = Math.min(ry + rh - 1, contentY + contentH - 1);

    // Fill the region with the specified color.
    this.canvasGC.fillStyle = this._extraStyle.ghostColumnColor;
    this.canvasGC.fillRect(x1, y1, x2 - x1 + 1, y2 - y1 + 1);

    this._drawGhostRowIcon();
  }

  private _drawGhostColumnHeader(
    rx: number,
    ry: number,
    rw: number,
    rh: number
  ): void {
    // Get the visible content dimensions.
    const contentW = this.defaultSizes.columnWidth;
    const contentH = this.headerHeight;

    // Bail if there is no content to draw.
    if (contentW <= 0 || contentH <= 0) {
      return;
    }

    // Get the visible content origin.
    const contentX =
      this.headerWidth + this.bodyWidth - contentW - this.scrollX;
    const contentY = 0;

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

    // Get the upper and lower bounds of the dirty content area.
    const x1 = Math.max(rx, contentX);
    const y1 = Math.max(ry, contentY);
    const x2 = Math.min(rx + rw - 1, contentX + contentW - 1);
    const y2 = Math.min(ry + rh - 1, contentY + contentH - 1);

    // Fill the region with the specified color.
    this.canvasGC.fillStyle = this._extraStyle.ghostColumnColor;
    this.canvasGC.fillRect(x1, y1, x2 - x1 + 1, y2 - y1 + 1);
    this._drawColumnIcon();
  }

  private _drawGhostRowIcon(): void {
    // Get the dimensions for the cell.
    const cellW = this.headerWidth;
    const cellH = this.defaultSizes.rowHeight;

    // Get the icon arguments.
    const iconArgs = this._extraStyle.icons['ghost-row'];

    // Bail early if there are no icon arguments.
    if (!iconArgs) {
      return;
    }

    // Unpack the icon arguments.
    const { icon, color, width } = iconArgs;

    // Parse the icon path from the icon string.
    const { defaultWidth, viewBoxSize, path } = Private.parseSVG(icon.svgstr);

    // Create a path 2d object from the path string.
    const canvasPath = new Path2D(path);

    // Solve for the scaling factor using the provided width or the default.
    const scale = (width || cellW / 5) / defaultWidth;

    // Orient to the desired origin for the icon.
    this.canvasGC.translate(
      cellW / 2 - this.scrollX - (viewBoxSize * scale) / 2,
      this.headerHeight +
        this.bodyHeight -
        this.scrollY -
        cellH / 2 -
        (viewBoxSize * scale) / 2
    );

    // Scale the canvas.
    this.canvasGC.scale(scale, scale);

    // Set the canvas fill style.
    this.canvasGC.fillStyle = color;

    // Draw the icon.
    this.canvasGC.fill(canvasPath, 'nonzero');

    // Reset the canvas transforms to the identity.
    this.canvasGC.setTransform(1, 0, 0, 1, 0, 0);
  }

  private _drawColumnIcon(): void {
    // get center of region.
    // const xBar =
    //   this.headerWidth +
    //   this.bodyWidth -
    //   this.defaultSizes.columnWidth / 2 -
    //   this.scrollX;
    // const yBar = this.headerHeight / 2;
    // // Get the size of the Icon.
    // const size = this._extraStyle.columnIconSize;
    // // Draw the outline of the region.
    // const region = new Path2D();
    // region.moveTo(xBar, yBar + size / 2);
    // region.lineTo(xBar + size / 14, yBar + size / 2);
    // region.lineTo(xBar + size / 14, yBar + size / 14);
    // region.lineTo(xBar + size / 2, yBar + size / 14);
    // region.lineTo(xBar + size / 2, yBar - size / 14);
    // region.lineTo(xBar + size / 14, yBar - size / 14);
    // region.lineTo(xBar + size / 14, yBar - size / 2);
    // region.lineTo(xBar - size / 14, yBar - size / 2);
    // region.lineTo(xBar - size / 14, yBar - size / 14);
    // region.lineTo(xBar - size / 2, yBar - size / 14);
    // region.lineTo(xBar - size / 2, yBar + size / 14);
    // region.lineTo(xBar - size / 14, yBar + size / 14);
    // region.lineTo(xBar - size / 14, yBar + size / 2);
    // region.closePath();
    // // Fill the region with the specified color.
    // this.canvasGC.fillStyle = this.extraStyle.iconColor;
    // this.canvasGC.fill(region, 'nonzero');
  }

  private _drawOverCorner(
    rx: number,
    ry: number,
    rw: number,
    rh: number
  ): void {
    // Get the visible content dimensions.
    const contentW = this.defaultSizes.columnWidth;
    const contentH = this.defaultSizes.rowHeight;

    // Bail if there is no content to draw.
    if (contentW <= 0 || contentH <= 0) {
      return;
    }

    // Get the visible content origin.
    const contentX =
      this.headerWidth + this.bodyWidth - contentW - this.scrollX;
    const contentY =
      this.headerHeight + this.bodyHeight - contentH - this.scrollY;

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

    // Get the upper and lower bounds of the dirty content area.
    const x1 = Math.max(rx, contentX);
    const y1 = Math.max(ry, contentY);
    const x2 = Math.min(rx + rw - 1, contentX + contentW - 1);
    const y2 = Math.min(ry + rh - 1, contentY + contentH - 1);

    // Fill the region with the specified color.
    this.canvasGC.fillStyle = this.style.voidColor;
    this.canvasGC.fillRect(x1, y1, x2 - x1 + 1, y2 - y1 + 1);
  }

  private _extraStyle: PaintedGrid.ExtraStyle;
}

/**
 * Namespace for class statics.
 */
export namespace PaintedGrid {
  /**
   * The options for creating a new PaintedGrid.
   */
  export interface IOptions extends DataGrid.IOptions {
    extraStyle?: ExtraStyle;
  }

  /**
   * The extra styling options for a painted grid.
   */
  export type ExtraStyle = {
    /**
     * The color of the ghost row.
     *
     * NOTE: This is painted on top of the last row and so
     * in most cases an opaque color is chosen.
     */
    ghostRowColor?: string;
    /**
     * The color of the ghost column.
     *
     * NOTE: This is painted on top of the last column and so
     * in most cases an opaque color is chosen.
     */
    ghostColumnColor?: string;
    /**
     * An array containing the information for icons.
     */
    icons?: { [key: string]: IIconArgs };
  };

  export type IIconArgs = {
    /**
     * The icon to paint on the grid.
     */
    icon: LabIcon;
    /**
     * The fill color for the icon.
     */
    color: string;
    /**
     * The type of column that should recieve the icon.
     */
    left?: number;
    /**
     * How far down to place the icon from the top of the cell border.
     * The default is to center the icon vertically.
     */
    top?: number;
    /**
     * The desired width of the icon relative to the width of the cell.
     * The default is to make the icon 1/5 of the column width.
     */
    width?: number;
  };

  export const defaultExtraStyle = {
    ghostRowColor: 'rgba(243, 243, 243, 0.80)',
    ghostColumnColor: 'rgba(243, 243, 243, 0.80)',
    icons: {
      'ghost-column': {
        icon: addIcon,
        color: '#616161'
      },
      'ghost-row': {
        icon: addIcon,
        color: '#616161'
      }
    }
  };
}

/**
 * Namespace for module implementation details.
 */
namespace Private {
  export interface ISVGInfo {
    defaultWidth: number;
    viewBoxSize: number;
    path: string;
  }
  /**
   * Parse an svg string into a standard form.
   */
  export function parseSVG(svgstr: string): ISVGInfo {
    // Set up a regular expression to get the width.
    let regex = /width="(.+?)"/;

    // Find the width an parse it to an integer.
    const defaultWidth = parseInt(svgstr.match(regex)[1]);

    // Redefine the regular expression to get the viewbox size.
    regex = /viewBox="(.+?)"/;

    const viewBox = svgstr
      .match(regex)[1]
      .split(' ')
      .map(digit => parseInt(digit));

    const viewBoxSize = viewBox[2];

    // Redefine the regular expression to get the path string.
    regex = /path d="(.+?)"/;

    // Fetch the path string.
    const path = svgstr.match(regex)[1];

    return { defaultWidth, viewBoxSize, path };
  }
}
