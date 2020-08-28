import { h, VirtualDOM } from '@lumino/virtualdom';
import { Drag } from 'tde-dragdrop';
import { MimeData } from '@lumino/coreutils';

// Class names for the shadow/line
const SHADOW = 'lm-DataGrid-select-shadow';
const LINE = 'lm-DataGrid-select-line';

function createRectangle(height: number, width: number): HTMLElement {
  return VirtualDOM.realize(
    h.div({
      className: SHADOW,
      style: {
        width: width.toString() + 'px',
        height: height.toString() + 'px'
      }
    })
  );
}

function createLine(height: number, width: number): HTMLElement {
  return VirtualDOM.realize(
    h.div({
      className: LINE,
      style: {
        width: `${width}px`,
        height: `${height}px`
      }
    })
  );
}

export function renderSelection(
  r1: number,
  r2: number,
  c1: number,
  c2: number,
  x: number,
  y: number,
  boundingRegion: IBoundingRegion | null = null,
  type: 'line' | 'shadow' = 'line'
): BoundedDrag {
  const height = r2 - r1;
  const width = c2 - c1;
  const mouseOffsetX = x - c1;
  const mouseOffsetY = y - r1;
  const target =
    type === 'line'
      ? createLine(height, width)
      : createRectangle(height, width);
  const dragSelection = new BoundedDrag({
    mimeData: new MimeData(),
    dragImage: target,
    proposedAction: 'move',
    boundingRegion,
    mouseOffsetX,
    mouseOffsetY
  });
  dragSelection.start(x, y).then(() => {
    return;
  });
  return dragSelection;
}

export class BoundedDrag extends Drag {
  private _mouseOffsetX: number;
  private _mouseOffsetY: number;
  private _initializing: boolean;
  constructor(options: BoundedDrag.IOptions) {
    super(options);
    this._boundingRegion = options.boundingRegion;
    this._mouseOffsetX = options.mouseOffsetX;
    this._mouseOffsetY = options.mouseOffsetY;
    this._initializing = true;
    this.moveDragImage;
  }
  moveDragImage(clientX: number, clientY: number): void {
    // see if we lack a drag image or if drag image is update-less
    if (!this.dragImage) {
      return;
    }
    if (this._boundingRegion || this._initializing) {
      const { left, top } = this.bound(clientX, clientY);
      const style = this.dragImage.style;
      style.left = `${left}px`;
      style.top = `${top}px`;
      this._initializing = false;
    }
  }

  bound(clientX: number, clientY: number): { left: number; top: number } {
    // Adjust the position of there are mouse offsets.
    let left = clientX - this._mouseOffsetX;
    let top = clientY - this._mouseOffsetY;

    // Return early if we do not have a bounding region.
    if (!this._boundingRegion) {
      return { left, top };
    }

    // Unpack the bounding region.
    const {
      topBound,
      bottomBound,
      leftBound,
      rightBound
    } = this._boundingRegion;

    // Fetch the style.
    const style = this.dragImage.style;

    // Fetch the image dimensions.
    const width = parseFloat(style.width);
    const height = parseFloat(style.height);

    // Bound.
    left = Math.max(leftBound, Math.min(left, rightBound - width));
    top = Math.max(topBound, Math.min(top, bottomBound - height));
    return { left, top };
  }

  manualPositionUpdate(xLocation?: number, yLocation?: number): void {
    // Bail early if there is already a bounding region
    if (this._boundingRegion) {
      return;
    }
    const style = this.dragImage.style;
    if (xLocation) {
      style.left = `${xLocation}px`;
    }
    if (yLocation) {
      style.top = `${yLocation}px`;
    }
  }
  private _boundingRegion: IBoundingRegion | null;
}
/**
 * A region that the upper left corner of the drag object must stay within.
 */
export interface IBoundingRegion {
  topBound: number; // Measured from the top as in the css property top.
  bottomBound: number; // Measured from the top as in the css propert top.
  leftBound: number; // Measured from the left as in the css property left.
  rightBound: number; // Measured from the right as in the css property right.
}
export namespace BoundedDrag {
  export interface IOptions extends Drag.IOptions {
    boundingRegion: IBoundingRegion;
    mouseOffsetX: number;
    mouseOffsetY: number;
  }
}
