import { DataGrid } from 'tde-datagrid';
import { LabIcon, addIcon } from '@jupyterlab/ui-components';

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
    const cellW = this.headerWidth;
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
    const { icon, color, height } = iconArgs;

    // Parse the icon path from the icon string.
    const { defaultHeight, viewBoxSize, path } = Private.parseSVG(icon.svgstr);

    // Create a path 2d object from the path string.
    const canvasPath = new Path2D(path);

    // Solve for the scaling factor using the provided width or the default.
    const scale = (height * Math.min(cellW, cellH)) / defaultHeight;

    // Orient the canvas to the desired origin for the icon.
    this.canvasGC.translate(
      cellW / 2 - (viewBoxSize * scale) / 2,
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

    // Reset the canvas to it's default position.
    this.canvasGC.setTransform(transform);
  }

  private _drawColumnIcon(): void {
    // Get the dimensions for the cell.
    const cellW = this.defaultSizes.columnWidth;
    const cellH = this.headerHeight;

    // Get the icon arguments.
    const iconArgs = this._extraStyle.icons['ghost-column'];

    // Bail early if there are no icon arguments.
    if (!iconArgs) {
      return;
    }

    // Get the current transform state.
    const transform = this.canvasGC.getTransform();

    // Unpack the icon arguments.
    const { icon, color, height, left, top } = iconArgs;

    // Parse the icon path from the icon string.
    const { defaultHeight, viewBoxSize, path } = Private.parseSVG(icon.svgstr);

    // Create a path 2d object from the path string.
    const canvasPath = new Path2D(path);

    // Solve for the scaling factor using the provided width or the default.
    const scale = (height * Math.min(cellH, cellW)) / defaultHeight;

    // Orient to the desired origin for the icon.
    this.canvasGC.translate(
      this.headerWidth +
        this.bodyWidth -
        this.scrollX -
        left * cellW -
        (viewBoxSize * scale) / 2,
      top * cellH - (viewBoxSize * scale) / 2
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
     * Height of icon in pixcels.
     */
    height?: number;
  };
}

/**
 * Namespace for module implementation details.
 */
namespace Private {
  export interface ISVGInfo {
    defaultHeight: number;
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
    const defaultHeight = parseInt(svgstr.match(regex)[1]);

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

    return { defaultHeight, viewBoxSize, path };
  }
  export const defaultExtraStyle = {
    ghostRowColor: 'rgba(243, 243, 243, 0.80)',
    ghostColumnColor: 'rgba(243, 243, 243, 0.80)',
    icons: {
      'ghost-column': {
        icon: addIcon,
        color: '#616161',
        height: 18,
        left: 63,
        top: 9
      },
      'ghost-row': {
        icon: addIcon,
        color: '#616161',
        height: 18,
        left: 63,
        top: 9
      }
    }
  };
}
