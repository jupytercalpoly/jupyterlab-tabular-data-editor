import { CellEditor } from '@lumino/datagrid';
import { getKeyboardLayout } from '@lumino/keyboard';

/**
 * Example custom cell editor which implements editing
 * JSON cell data.
 */
export default class JSONCellEditor extends CellEditor {
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    super.dispose();

    document.body.removeChild(this._textarea);
  }

  protected startEditing() {
    this._createWidgets();
  }

  protected getInput(): any {
    return JSON.parse(this._textarea.value);
  }

  protected validate() {
    let value;
    try {
      value = this.getInput();
    } catch (error) {
      console.log(`Input error: ${error.message}`);
      this.setValidity(false);
      return;
    }

    if (this.validator) {
      const result = this.validator.validate(this.cell, value);
      if (result.valid) {
        this.setValidity(true);
      } else {
        this.setValidity(false, result.message || 'Invalid JSON input');
      }
    } else {
      this.setValidity(true);
    }
  }

  private _createWidgets() {
    const cell = this.cell;
    const grid = this.cell.grid;
    if (!grid.dataModel) {
      this.cancel();
      return;
    }

    let data = grid.dataModel.data('body', cell.row, cell.column);

    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('cell-editor');
    button.style.width = '100%';
    button.style.height = '100%';
    button.style.whiteSpace = 'nowrap';
    button.style.overflow = 'hidden';
    button.style.textOverflow = 'ellipsis';

    button.textContent = this._deserialize(data);
    this.editorContainer.appendChild(button);

    this._button = button;

    const width = 200;
    const height = 50;
    const textarea = document.createElement('textarea');
    textarea.style.pointerEvents = 'auto';
    textarea.style.position = 'absolute';
    textarea.style.outline = 'none';
    const buttonRect = this._button.getBoundingClientRect();
    const top = buttonRect.bottom + 2;
    const left = buttonRect.left;

    textarea.style.top = top + 'px';
    textarea.style.left = left + 'px';
    textarea.style.width = width + 'px';
    textarea.style.height = height + 'px';

    textarea.value = JSON.stringify(data);

    textarea.addEventListener('keydown', (event: KeyboardEvent) => {
      const key = getKeyboardLayout().keyForKeydownEvent(event);
      if (key === 'Enter' || key === 'Tab') {
        const next =
          key === 'Enter'
            ? event.shiftKey
              ? 'up'
              : 'down'
            : event.shiftKey
            ? 'left'
            : 'right';
        if (!this.commit(next)) {
          this.setValidity(false);
        }
        event.preventDefault();
        event.stopPropagation();
      } else if (key === 'Escape') {
        this.cancel();
      }
    });

    textarea.addEventListener('blur', (event: FocusEvent) => {
      if (this.isDisposed) {
        return;
      }

      if (!this.commit()) {
        this.setValidity(false);
      }
    });

    textarea.addEventListener('input', (event: Event) => {
      this.inputChanged.emit(void 0);
    });

    this._textarea = textarea;

    document.body.appendChild(this._textarea);
    this._textarea.focus();
  }

  private _deserialize(value: any): any {
    return JSON.stringify(value);
  }

  private _button: HTMLButtonElement;
  private _textarea: HTMLTextAreaElement;
}
