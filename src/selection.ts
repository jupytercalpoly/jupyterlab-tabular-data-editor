import { h, VirtualDOM } from '@lumino/virtualdom';
import { Drag } from 'tde-dragdrop';
import { MimeData } from '@lumino/coreutils';

const SHADOW = 'lm-DataGrid-select-shadow';
const LINE = 'lm-DataGrid-select-line';

function createRectange(height: number, width: number): HTMLElement {
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
    type === 'line' ? createLine(height, width) : createRectange(height, width);
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
  }

  moveDragImage(clientX: number, clientY: number): void {
    // see if we lack a drag image or if drag image is udpdate-less
    if (!this.dragImage) {
      return;
    }
    if (this._boundingRegion || this._initializing) {
      let sudoClientX = clientX - this._mouseOffsetX;
      let sudoClientY = clientY - this._mouseOffsetY;
      [sudoClientX, sudoClientY] = this.bound(sudoClientX, sudoClientY);
      const style = this.dragImage.style;
      style.top = `${sudoClientY}px`;
      style.left = `${sudoClientX}px`;
      this._initializing = false;
    }
  }

  bound(x: number, y: number): Array<number> {
    if (!this._boundingRegion) {
      return [x, y];
    }
    // unpack the bounding region
    const {
      upperBound,
      lowerBound,
      leftBound,
      rightBound
    } = this._boundingRegion;

    x = Math.min(x, rightBound);
    x = Math.max(x, leftBound);
    y = Math.max(y, upperBound);
    y = Math.min(y, lowerBound);
    return [x, y];
  }

  manualPositionUpdate(xLocation: number, yLocation: number) {
    // Bail early if there is already a bounding region
    if (this._boundingRegion) {
      return;
    }
    const style = this.dragImage.style;
    style.top = `${yLocation}px`;
    style.left = `${xLocation}px`;
  }
  private _boundingRegion: IBoundingRegion | null;
}

export interface IBoundingRegion {
  upperBound: number;
  lowerBound: number;
  leftBound: number;
  rightBound: number;
}
export namespace BoundedDrag {
  export interface IOptions extends Drag.IOptions {
    boundingRegion: IBoundingRegion;
    mouseOffsetX: number;
    mouseOffsetY: number;
  }
}
