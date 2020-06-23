import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the jupyterlab-tabular-data-editor extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-tabular-data-editor',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyterlab-tabular-data-editor is activated!');
  }
};

export default extension;
