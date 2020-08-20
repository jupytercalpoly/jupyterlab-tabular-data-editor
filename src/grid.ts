import { DataGrid } from 'tde-datagrid';
import { LabIcon, addIcon } from '@jupyterlab/ui-components';
import { EditorModel } from './newmodel';

export class PaintedGrid extends DataGrid {
  constructor(options: PaintedGrid.IOptions) {
    super(options);
    this._extraStyle = options.extraStyle || Private.defaultExtraStyle;
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
   * Primary entry point for painting additional graphics on top of
   * the base data grid graphics.
   */
  private _paintAddons(rx: number, ry: number, rw: number, rh: number): void {
    // Draw the ghost row.
    this._drawGhostRow(rx, ry, rw, rh);

    // Draw the header region for the ghost row.
    this._drawGhostRowHeader(rx, ry, rw, rh);

    // Draw the ghost column.
    this._drawGhostColumn(rx, ry, rw, rh);

    // Draw the header region for the ghost column.
    this._drawGhostColumnHeader(rx, ry, rw, rh);

    // Draw over the corner to hide it from view.
    this._drawOverCorner(rx, ry, rw, rh);

    // Draw the icons.
    const model = this.dataModel as EditorModel;
    if (model && model.isDataDetection) {
      this._drawIcons(rx, ry, rw, rh);
      this.drawCornerHeaderRegion(0, 0, this.headerWidth, this.headerHeight);
    }
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

    // Get the upper and lower bounds of the dirty content area.
    const x1 = Math.max(rx, contentX);
    const y1 = Math.max(ry, contentY);
    const x2 = Math.min(rx + rw - 1, contentX + contentW - 1);
    const y2 = Math.min(ry + rh - 1, contentY + contentH - 1);

    // Fill the region with the specified color.
    this.canvasGC.fillStyle = this._extraStyle.ghostRowColor;
    this.canvasGC.fillRect(x1, y1, x2 - x1 + 1, y2 - y1 + 1);
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
    this.canvasGC.fillStyle = this._extraStyle.ghostRowColor;
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
    const cellH = this.defaultSizes.rowHeight;

    // Get the icon arguments.
    const iconArgs = this._extraStyle.icons['ghost-row'];

    // Bail early if there are no icon arguments.
    if (!iconArgs) {
      return;
    }
    // Get the current transform state.
    const transform = this.canvasGC.getTransform();

    // Unpack the icon arguments.
    const { icon, color, size, top, left } = iconArgs;

    // Parse the icon path from the icon string.
    const { defaultSize, path } = Private.parseSVG(icon.svgstr);

    // Create a path 2d object from the path string.
    const canvasPath = new Path2D(path);

    // Solve for the scaling factor using the provided width or the default.
    const scale = size / defaultSize;

    // Orient the canvas to the desired origin for the icon.
    this.canvasGC.translate(
      left,
      this.headerHeight + this.bodyHeight - cellH + top - this.scrollY
    );

    // Scale the canvas.
    this.canvasGC.scale(scale, scale);

    // Set the canvas fill style.
    this.canvasGC.fillStyle = color;

    // Draw the icon.
    this.canvasGC.fill(canvasPath, 'nonzero');

    // Reset the canvas to it's default position.
    this.canvasGC.setTransform(transform);
  }

  private _drawColumnIcon(): void {
    // Get the dimensions for the cell.
    const cellW = this.defaultSizes.columnWidth;

    // Get the icon arguments.
    const iconArgs = this._extraStyle.icons['ghost-column'];

    // Bail early if there are no icon arguments.
    if (!iconArgs) {
      return;
    }

    // Get the current transform state.
    const transform = this.canvasGC.getTransform();

    // Unpack the icon arguments.
    const { icon, color, size, left, top } = iconArgs;

    // Parse the icon path from the icon string.
    const { defaultSize, path } = Private.parseSVG(icon.svgstr);

    // Create a path 2d object from the path string.
    const canvasPath = new Path2D(path);

    // Solve for the scaling factor using the provided width or the default.
    const scale = size / defaultSize;

    // Orient to the desired origin for the icon.
    this.canvasGC.translate(
      this.headerWidth + this.bodyWidth - cellW + left - this.scrollX,
      top
    );

    // Scale the canvas.
    this.canvasGC.scale(scale, scale);

    // Set the canvas fill style.
    this.canvasGC.fillStyle = color;

    // Draw the icon.
    this.canvasGC.fill(canvasPath, 'nonzero');

    // Reset the transform to the initial state
    this.canvasGC.setTransform(transform);
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

  private _drawIcons(rx: number, ry: number, rw: number, rh: number): void {
    // Get the visible content dimensions.
    const contentW = this.bodyWidth - this.scrollX;
    const contentH = this.headerHeight;

    // Bail if there is no content to draw.
    if (contentW <= 0 || contentH <= 0) {
      return;
    }
    // Get the visible content origin.
    const contentX = this.headerWidth;
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

    // Fetch the geometry.
    const bw = this.bodyWidth;
    const pw = this.pageWidth;

    // Get the upper and lower bounds of the dirty content area.
    const x1 = Math.max(rx, contentX);
    const y1 = ry;
    let x2 = Math.min(rx + rw - 1, contentX + contentW - 1);
    const y2 = Math.min(ry + rh - 1, contentY + contentH - 1);

    // Convert the dirty content bounds into cell bounds.
    const r1 = this.columnHeaderSections.indexOf(y1);
    const c1 = this.columnSections.indexOf(x1 - contentX + this.scrollX);
    let r2 = this.columnHeaderSections.indexOf(y2);
    let c2 = this.columnSections.indexOf(x2 - contentX + this.scrollX);

    // Fetch the max row and column.
    const maxRow = this.columnHeaderSections.count - 1;
    const maxColumn = this.columnSections.count - 1;

    // Handle a dirty content area larger than the cell count.
    if (r2 < 0) {
      r2 = maxRow;
    }
    if (c2 < 0) {
      c2 = maxColumn;
    }

    // Convert the cell bounds back to visible coordinates.
    const x = this.columnSections.offsetOf(c1) + contentX - this.scrollX;
    const y = this.columnHeaderSections.offsetOf(r1);

    // Set up the paint region size variables.
    let width = 0;
    let height = 0;

    // Allocate the section sizes arrays.
    const rowSizes = new Array<number>(r2 - r1 + 1);
    const columnSizes = new Array<number>(c2 - c1 + 1);

    // Get the row sizes for the region.
    for (let j = r1; j <= r2; ++j) {
      const size = this.columnHeaderSections.sizeOf(j);
      rowSizes[j - r1] = size;
      height += size;
    }

    // Get the column sizes for the region.
    for (let i = c1; i <= c2; ++i) {
      const size = this.columnSections.sizeOf(i);
      columnSizes[i - c1] = size;
      width += size;
    }

    // Adjust the geometry if the last column is stretched.
    if (this.stretchLastColumn && pw > bw && c2 === maxColumn) {
      const dw = this.pageWidth - this.bodyWidth;
      columnSizes[columnSizes.length - 1] += dw;
      width += dw;
      x2 += dw;
    }

    // Create the paint region object.
    const rgn = {
      region: 'column-header',
      xMin: x1,
      yMin: y1,
      xMax: x2,
      yMax: y2,
      x,
      y,
      width,
      height,
      row: r1,
      column: c1,
      rowSizes,
      columnSizes
    };

    for (let x = rgn.x, i = 0, n = rgn.columnSizes.length; i < n; ++i) {
      // Fetch the size of the column.
      const columnSize = rgn.columnSizes[i];

      // Bail if we are on the last column.
      if (rgn.column + i + 1 === this.dataModel.columnCount('body')) {
        return;
      }

      // Skip zero sized columns.
      if (columnSize === 0) {
        continue;
      }

      // Fetch the model.
      const model = this.dataModel as EditorModel;

      // Fetch the data type for the column.
      const metadata = model.metadata('body', 0, rgn.column + i);

      // Fetch the icon spec from the type
      const iconArgs = this._extraStyle.icons[metadata.type];

      // Skip if there is no icon args.
      if (!iconArgs) {
        continue;
      }

      // Unpack the icon arguments.
      const { icon, color, size, left, top } = iconArgs;

      // Parse the icon path from the icon string.
      const { defaultSize, path } = Private.parseSVG(icon.svgstr);

      // Create a path 2d object from the path string.
      const canvasPath = new Path2D(path);

      // Get the default position of the canvas drawer.
      const transform = this.canvasGC.getTransform();

      // Orient to the desired origin for the icon.
      this.canvasGC.translate(x + left, y + top);

      // Solve for the scaling factor using the provided width or the default.
      const scale = size / defaultSize;

      // Scale the canvas.
      this.canvasGC.scale(scale, scale);

      // Set the canvas fill style.
      this.canvasGC.fillStyle = color;

      // Draw the icon.
      this.canvasGC.fill(canvasPath, 'nonzero');

      // Reset the transform to the initial state
      this.canvasGC.setTransform(transform);

      // Increment the running X coordinate.
      x += columnSize;
    }
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
     * A object mapping data types to Icons.
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
     * Distance right in pixcels from the left cell boundary.
     */
    left?: number;
    /**
     * Distance right in pixcels from the top cell boundary.
     */
    top?: number;
    /**
     * Size of icon in pixcels.
     */
    size?: number;
  };
}

/**
 * Namespace for module implementation details.
 */
namespace Private {
  export interface ISVGInfo {
    defaultSize: number;
    path: string;
  }
  /**
   * Parse an svg string into a standard form.
   */
  export function parseSVG(svgstr: string): ISVGInfo {
    // Set up a regular expression to get the size.
    let regex = /viewBox="(.+?)"/;

    const viewBox = svgstr
      .match(regex)[1]
      .split(' ')
      .map(digit => parseInt(digit));

    const defaultSize = viewBox[2];

    // Redefine the regular expression to get the path string.
    regex = /path d="(.+?)"/;

    // Fetch the path string.
    const path = svgstr.match(regex)[1];

    return { defaultSize, path };
  }
  export const defaultExtraStyle = {
    ghostRowColor: 'rgba(243, 243, 243, 0.80)',
    ghostColumnColor: 'rgba(243, 243, 243, 0.80)',
    icons: {
      'ghost-column': {
        icon: addIcon,
        color: '#616161',
        size: 18,
        left: 63,
        top: 9
      },

      'ghost-row': {
        icon: addIcon,
        color: '#bdbdbd',
        size: 12,
        left: 26,
        top: 6
      }
    }
  };
}
