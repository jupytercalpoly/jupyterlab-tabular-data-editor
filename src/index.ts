import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';
import {
  // CSVViewer,
  TextRenderConfig
  // CSVViewerFactory
  // TSVViewerFactory
} from 'tde-csvviewer';
import {
  WidgetTracker,
  IThemeManager
  // ICommandPalette
  // InputDialog
} from '@jupyterlab/apputils';
import { IDocumentWidget } from '@jupyterlab/docregistry';
// import { ISearchProviderRegistry } from '@jupyterlab/documentsearch';
import { /*IEditMenu,*/ IMainMenu } from '@jupyterlab/mainmenu';
import { DataGrid } from '@lumino/datagrid';
import { EditableCSVViewer, EditableCSVViewerFactory } from './widget';

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
  activate: activateCsv
};

function activateCsv(
  app: JupyterFrontEnd,
  restorer: ILayoutRestorer | null,
  themeManager: IThemeManager | null,
  mainMenu: IMainMenu | null
  // searchregistry: ISearchProviderRegistry | null
): void {
  const factory = new EditableCSVViewerFactory({
    name: FACTORY_CSV,
    fileTypes: ['csv'],
    defaultFor: ['csv'],
    readOnly: true
  });
  const tracker = new WidgetTracker<IDocumentWidget<EditableCSVViewer>>({
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

  //TODO: Error when using the search registry
  // if (searchregistry) {
  //   searchregistry.register('csv', CSVSearchProvider);
  // }

  addCommands(app, tracker);
}

/*
Creates commands, adds them to the context menu, and adds keybindings for common functionality
*/
function addCommands(
  app: JupyterFrontEnd,
  tracker: WidgetTracker<IDocumentWidget<EditableCSVViewer>>
): void {
  const { commands } = app;
  const SELECTOR = '.jp-CSVViewer-grid';

  commands.addCommand(CommandIDs.addRow, {
    label: 'Add Row',
    execute: () => {
      // emit a signal to the EditableDSVModel
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit('add-row');
    }
  });

  commands.addCommand(CommandIDs.removeRow, {
    label: 'Remove Row',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit('remove-row');
    }
  });

  commands.addCommand(CommandIDs.addColumn, {
    label: 'Add Column',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit('add-column');
    }
  });

  commands.addCommand(CommandIDs.removeColumn, {
    label: 'Remove Column',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit('remove-column');
    }
  });

  commands.addCommand(CommandIDs.copy, {
    label: 'Copy',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit('copy-cells');
    }
  });

  commands.addCommand(CommandIDs.cut, {
    label: 'Cut',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit('cut-cells');
    }
  });

  commands.addCommand(CommandIDs.undo, {
    label: 'Undo',
    execute: () => {
      tracker.currentWidget &&
        tracker.currentWidget.content.changeModelSignal.emit('undo');
    }
  });

  // Add items to the context menu
  app.contextMenu.addItem({
    command: CommandIDs.addRow,
    selector: SELECTOR,
    rank: 0
  });

  app.contextMenu.addItem({
    command: CommandIDs.removeRow,
    selector: SELECTOR,
    rank: 0
  });

  app.contextMenu.addItem({
    command: CommandIDs.addColumn,
    selector: SELECTOR,
    rank: 0
  });

  app.contextMenu.addItem({
    command: CommandIDs.removeColumn,
    selector: SELECTOR,
    rank: 0
  });

  app.contextMenu.addItem({
    command: CommandIDs.copy,
    selector: SELECTOR,
    rank: 0
  });

  app.contextMenu.addItem({
    command: CommandIDs.cut,
    selector: SELECTOR,
    rank: 0
  });

  // add keybindings
  app.commands.addKeyBinding({
    command: CommandIDs.copy,
    args: {},
    keys: ['Accel C'],
    selector: SELECTOR
  });

  app.commands.addKeyBinding({
    command: CommandIDs.cut,
    args: {},
    keys: ['Accel X'],
    selector: SELECTOR
  });
  app.commands.addKeyBinding({
    command: CommandIDs.undo,
    args: {},
    keys: ['Accel Z'],
    selector: SELECTOR
  });
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
    headerGridLineColor: 'rgba(20, 20, 20, 0.25)'
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
    rowBackgroundColor: i => (i % 2 === 0 ? '#212121' : '#111111')
  };

  /**
   * The light config for the data grid renderer.
   */
  export const LIGHT_TEXT_CONFIG: TextRenderConfig = {
    textColor: '#111111',
    matchBackgroundColor: '#FFFFE0',
    currentMatchBackgroundColor: '#FFFF00',
    horizontalAlignment: 'center'
  };

  /**
   * The dark config for the data grid renderer.
   */
  export const DARK_TEXT_CONFIG: TextRenderConfig = {
    textColor: '#F5F5F5',
    matchBackgroundColor: '#838423',
    currentMatchBackgroundColor: '#A3807A',
    horizontalAlignment: 'right'
  };
}

const CommandIDs = {
  addRow: 'tde:add-row',
  addColumn: 'tde:add-column',
  removeRow: 'tde-remove-row',
  removeColumn: 'tde:remove-column',
  copy: 'tde:copy',
  paste: 'tde:paste',
  cut: 'tde:cut',
  undo: 'tde:undo'
};
