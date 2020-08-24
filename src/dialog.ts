import { Dialog } from '@jupyterlab/apputils';
import { DSVEditor } from './widget';

export function unsaveDialog(widget: DSVEditor): Dialog<unknown> {
  const path = widget.context.path;
  const n = path.lastIndexOf('/');
  const fileName = path.substring(n + 1);

  const dialog = new Dialog({
    title: 'Save Your Changes?',
    body: `Your changes to "${fileName}" will be lost if you don't save them.`,
    buttons: [
      Dialog.warnButton({ label: "Don't Save" }),
      Dialog.cancelButton(),
      Dialog.okButton({
        label: 'Save'
      })
    ]
  });
  return dialog;
}
