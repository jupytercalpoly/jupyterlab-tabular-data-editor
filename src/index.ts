import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';
import {
  TextRenderConfig
  // TSVViewerFactory
} from 'tde-csvviewer';
import {
  WidgetTracker,
  IThemeManager
  // ICommandPalette
  // InputDialog
} from '@jupyterlab/apputils';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { ISearchProviderRegistry } from '@jupyterlab/documentsearch';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { ILauncher } from '@jupyterlab/launcher';
import { /*IEditMenu,*/ IMainMenu } from '@jupyterlab/mainmenu';
import { Contents } from '@jupyterlab/services';
import {
  undoIcon,
  redoIcon,
  cutIcon,
  copyIcon,
  pasteIcon,
  saveIcon,
  spreadsheetIcon
} from '@jupyterlab/ui-components';
import { DataGrid } from '@lumino/datagrid';
import { DSVEditor, EditableCSVViewerFactory } from './widget';
import { CSVSearchProvider } from './searchprovider';

/**
 * The name of the factories that creates widgets.
 */
const FACTORY_CSV = 'Tabular Data Editor';
// const FACTORY_TSV = 'TSVTable';

/**
 * Initialization data for the jupyterlab-tabular-data-editor extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-tabular-data-editor',
  autoStart: true,
  activate: activateCsv,
  requires: [IFileBrowserFactory],
  optional: [
    ILauncher,
    ILayoutRestorer,
    IThemeManager,
    IMainMenu,
    ISearchProviderRegistry
  ]
};

function activateCsv(
  app: JupyterFrontEnd,
  browserFactory: IFileBrowserFactory,
  launcher: ILauncher | null,
  restorer: ILayoutRestorer | null,
  themeManager: IThemeManager | null,
  mainMenu: IMainMenu | null,
  searchregistry: ISearchProviderRegistry | null
): void {
  const factory = new EditableCSVViewerFactory(
    {
      name: FACTORY_CSV,
      fileTypes: ['csv'],
      defaultFor: ['csv'],
      readOnly: true
    },
    app.commands
  );
  const tracker = new WidgetTracker<IDocumentWidget<DSVEditor>>({
    namespace: 'editablecsvviewer'
  });

  // The current styles for the data grids.
  let style: DataGrid.Style = Private.LIGHT_STYLE;
  let rendererConfig: TextRenderConfig = Private.LIGHT_TEXT_CONFIG;

  if (restorer) {
    // Handle state restoration.
    void restorer.restore(tracker, {
      command: 'docmanager:open',
      args: widget => ({ path: widget.context.path, factory: FACTORY_CSV }),
      name: widget => widget.context.path
    });
  }

  app.docRegistry.addWidgetFactory(factory);
  const ft = app.docRegistry.getFileType('csv');
  factory.widgetCreated.connect((sender, widget) => {
    // Track the widget.
    void tracker.add(widget);
    // Notify the widget tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => {
      void tracker.save(widget);
    });

    if (ft) {
      widget.title.icon = ft.icon;
      widget.title.iconClass = ft.iconClass || '';
      widget.title.iconLabel = ft.iconLabel || '';
    }
    // Set the theme for the new widget.
    widget.content.style = style;
    widget.content.rendererConfig = rendererConfig;
  });

  // Keep the themes up-to-date.
  const updateThemes = (): void => {
    const isLight =
      themeManager && themeManager.theme
        ? themeManager.isLight(themeManager.theme)
        : true;
    style = isLight ? Private.LIGHT_STYLE : Private.DARK_STYLE;
    rendererConfig = isLight
      ? Private.LIGHT_TEXT_CONFIG
      : Private.DARK_TEXT_CONFIG;
    tracker.forEach(grid => {
      grid.content.style = style;
      grid.content.rendererConfig = rendererConfig;
    });
  };
  if (themeManager) {
    themeManager.themeChanged.connect(updateThemes);
  }

  //TODO: Error with main menu
  // if (mainMenu) {
  //   addMenuEntries(mainMenu, tracker);
  // }

  if (searchregistry) {
    searchregistry.register('csv', CSVSearchProvider);
  }

  addCommands(app, tracker, browserFactory);

  if (launcher) {
    launcher.add({ command: CommandIDs.createNewCSV });
  }
}

/*
Creates commands, adds them to the context menu, and adds keybindings for common functionality
*/
function addCommands(
  app: JupyterFrontEnd,
  tracker: WidgetTracker<IDocumentWidget<DSVEditor>>,
  browserFactory: IFileBrowserFactory
): void {
  const { commands } = app;
  const GLOBAL_SELECTOR = '.jp-CSVViewer-grid';
  const BODY_SELECTOR = '.jp-background';
  const COLUMN_HEADER_SELECTOR = '.jp-column-header';
  const ROW_HEADER_SELECTOR = '.jp-row-header';

  commands.addCommand(CommandIDs.createNewCSV, {
    label: args => (args['isPalette'] ? 'New CSV File' : 'CSV File'),
    caption: 'Create a new CSV file',
    icon: args => (args['isPalette'] ? null : spreadsheetIcon),
    execute: async args => {
      // Get the directory in which the CSV file must be created;
      // otherwise take the current filebrowser directory
      const cwd = args['cwd'] || browserFactory.defaultBrowser.model.path;

      // Create a new untitled csv file
      const model: Contents.IModel = await commands.execute(
        'docmanager:new-untitled',
        {
          path: cwd,
          type: 'file',
          ext: 'csv'
        }
      );

      // Open the newly created file with the Tabular Data Editor
      return commands.execute('docmanager:open', {
        path: model.path,
        factory: FACTORY_CSV
      });
    }
  });

  commands.addCommand(CommandIDs.insertRowAbove, {
    label: 'Insert Row Above',
    execute: () => {
      // emit a signal to the EditableDSVModel
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit(
          'insert-row-above'
        );
    }
  });

  commands.addCommand(CommandIDs.insertRowBelow, {
    label: 'Insert Row Below',
    execute: () => {
      // emit a signal to the EditableDSVModel
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit(
          'insert-row-below'
        );
    }
  });

  commands.addCommand(CommandIDs.removeRow, {
    label: 'Remove Row',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit('remove-row');
    }
  });

  commands.addCommand(CommandIDs.insertColumnLeft, {
    label: 'Insert Column Left',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit(
          'insert-column-left'
        );
    }
  });

  commands.addCommand(CommandIDs.insertColumnRight, {
    label: 'Insert Column Right',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit(
          'insert-column-right'
        );
    }
  });

  commands.addCommand(CommandIDs.removeColumn, {
    label: 'Remove Column',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit('remove-column');
    }
  });

  commands.addCommand(CommandIDs.copyToolbar, {
    icon: copyIcon,
    iconLabel: 'Copy',
    className: 'jp-toolbar-copy',
    caption: 'Copy',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit('copy-cells');
    }
  });

  commands.addCommand(CommandIDs.cutToolbar, {
    icon: cutIcon,
    iconLabel: 'Cut',
    className: 'jp-toolbar-cut',
    caption: 'Cut',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit('cut-cells');
    }
  });

  commands.addCommand(CommandIDs.pasteToolbar, {
    icon: pasteIcon,
    iconLabel: 'Paste',
    className: 'jp-toolbar-paste',
    caption: 'Paste',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit('paste-cells');
    }
  });

  commands.addCommand(CommandIDs.copyContextMenu, {
    label: 'Copy',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit('copy-cells');
    }
  });

  commands.addCommand(CommandIDs.cutContextMenu, {
    label: 'Cut',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit('cut-cells');
    }
  });

  commands.addCommand(CommandIDs.pasteContextMenu, {
    label: 'Paste',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit('paste-cells');
    }
  });

  commands.addCommand(CommandIDs.undo, {
    icon: undoIcon,
    iconLabel: 'Undo',
    className: 'jp-toolbar-undo',
    caption: 'Undo',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit('undo');
    }
  });

  commands.addCommand(CommandIDs.redo, {
    icon: redoIcon,
    iconLabel: 'Redo',
    className: 'jp-toolbar-redo',
    caption: 'Redo',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit('redo');
    }
  });

  commands.addCommand(CommandIDs.save, {
    icon: saveIcon,
    iconLabel: 'Save',
    className: 'jp-toolbar-save',
    caption: 'Redo',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit('save');
    }
  });

  commands.addCommand(CommandIDs.clearContents, {
    label: 'Clear Contents',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit('clear-contents');
    }
  });

  // these commands are standard for every context menu
  const standardContextMenu = [
    'cutContextMenu',
    'copyContextMenu',
    'pasteContextMenu',
    'separator'
  ];

  // extending the standard context menu for different parts of the data
  const bodyContextMenu = [
    ...standardContextMenu,
    'insertRowAbove',
    'insertRowBelow',
    'separator',
    'removeRow',
    'clearContents'
  ];
  const columnHeaderContextMenu = [
    ...standardContextMenu,
    'insertColumnLeft',
    'insertColumnRight',
    'separator',
    'removeColumn',
    'clearContents'
  ];
  const rowHeaderContextMenu = [
    ...standardContextMenu,
    'insertRowAbove',
    'insertRowBelow',
    'separator',
    'removeRow',
    'clearContents'
  ];

  // build the different context menus
  buildContextMenu(app, bodyContextMenu, BODY_SELECTOR);
  buildContextMenu(app, columnHeaderContextMenu, COLUMN_HEADER_SELECTOR);
  buildContextMenu(app, rowHeaderContextMenu, ROW_HEADER_SELECTOR);

  // add keybindings
  app.commands.addKeyBinding({
    command: CommandIDs.copyContextMenu,
    args: {},
    keys: ['Accel C'],
    selector: GLOBAL_SELECTOR
  });

  app.commands.addKeyBinding({
    command: CommandIDs.cutContextMenu,
    args: {},
    keys: ['Accel X'],
    selector: GLOBAL_SELECTOR
  });

  app.commands.addKeyBinding({
    command: CommandIDs.undo,
    args: {},
    keys: ['Accel Z'],
    selector: GLOBAL_SELECTOR
  });
  app.commands.addKeyBinding({
    command: CommandIDs.redo,
    args: {},
    keys: ['Accel Shift Z'],
    selector: GLOBAL_SELECTOR
  });
  // app.commands.addKeyBinding({
  //   command: CommandIDs.clearContents,
  //   args: {},
  //   keys: ['Backspace'],
  //   selector: GLOBAL_SELECTOR
  // });
}

/**
 * Builds a context menu for specific portion of the datagrid
 * @param app The JupyterFrontEnd which contains the context menu
 * @param commands An array of commands, use 'separator' for dividers (see CommandIDs dictionary in index.ts)
 * @param selector The current portion of the datagrid BODY_SELECTOR | COLUMN_HEADER_SELECTOR | ROW_HEADER_SELECTOR
 */
function buildContextMenu(
  app: JupyterFrontEnd,
  commands: Array<string>,
  selector: string
): void {
  // iterate over every command adding it to the context menu
  commands.forEach(
    (command: string): void => {
      // if the command is a separator, add a separator
      command === 'separator'
        ? app.contextMenu.addItem({
            type: 'separator',
            selector: selector
          })
        : app.contextMenu.addItem({
            command: CommandIDs[command],
            selector: selector
          });
    }
  );
}

export default [extension];

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * The light theme for the data grid.
   */
  export const LIGHT_STYLE: DataGrid.Style = {
    ...DataGrid.defaultStyle,
    voidColor: '#F3F3F3',
    backgroundColor: 'white',
    headerBackgroundColor: '#EEEEEE',
    gridLineColor: 'rgba(20, 20, 20, 0.15)',
    headerGridLineColor: 'rgba(20, 20, 20, 0.25)',
    selectionBorderColor: 'rgb(33,150,243)',
    cursorBorderColor: 'rgb(33,150,243)', //selected cell border color
    headerSelectionBorderColor: 'rgb(33,150,243, 0)' //made transparent

    //rowBackgroundColor: i => (i % 2 === 0 ? '#F5F5F5' : 'white')
  };

  /**
   * The dark theme for the data grid.
   */
  export const DARK_STYLE: DataGrid.Style = {
    ...DataGrid.defaultStyle,
    voidColor: 'black',
    backgroundColor: '#111111',
    headerBackgroundColor: '#424242',
    gridLineColor: 'rgba(235, 235, 235, 0.15)',
    headerGridLineColor: 'rgba(235, 235, 235, 0.25)',
    headerSelectionFillColor: 'rgba(20, 20, 20, 0.25)'
    //rowBackgroundColor: i => (i % 2 === 0 ? '#212121' : '#111111')
  };

  /**
   * The light config for the data grid renderer.
   */
  export const LIGHT_TEXT_CONFIG: TextRenderConfig = {
    textColor: '#111111',
    matchBackgroundColor: '#FAE480',
    currentMatchBackgroundColor: '#F5C800',
    horizontalAlignment: 'center'
  };

  /**
   * The dark config for the data grid renderer.
   */
  export const DARK_TEXT_CONFIG: TextRenderConfig = {
    textColor: '#F5F5F5',
    matchBackgroundColor: '#F99C3D',
    currentMatchBackgroundColor: '#F57C00',
    horizontalAlignment: 'center'
  };
}

export const CommandIDs: { [key: string]: string } = {
  createNewCSV: 'tde-create-new-csv',
  insertColumnLeft: 'tde:insert-column-left',
  insertColumnRight: 'tde:insert-column-right',
  insertRowAbove: 'tde:insert-row-above',
  insertRowBelow: 'tde:insert-row-below',
  removeRow: 'tde-remove-row',
  removeColumn: 'tde:remove-column',
  copyContextMenu: 'tde:copy',
  cutContextMenu: 'tde:cut',
  pasteContextMenu: 'tde:paste-cm',
  copyToolbar: 'tde:copy-tb',
  cutToolbar: 'tde:cut-tb',
  pasteToolbar: 'tde:paste-tb',
  undo: 'tde:undo',
  redo: 'tde:redo',
  save: 'tde-save',
  clearContents: 'tde-clear-contents'
};
