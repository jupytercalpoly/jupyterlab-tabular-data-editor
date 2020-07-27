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
import { /*IEditMenu,*/ IMainMenu } from '@jupyterlab/mainmenu';
import {
  undoIcon,
  redoIcon,
  cutIcon,
  copyIcon,
  pasteIcon,
  saveIcon
} from '@jupyterlab/ui-components';
import { DataGrid } from '@lumino/datagrid';
import { EditableCSVViewer, EditableCSVViewerFactory } from './widget';
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
  requires: [],
  optional: [ILayoutRestorer, IThemeManager, IMainMenu, ISearchProviderRegistry]
};

function activateCsv(
  app: JupyterFrontEnd,
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

  if (searchregistry) {
    searchregistry.register('csv', CSVSearchProvider);
  }

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

  // Add items to the context menu
  app.contextMenu.addItem({
    command: CommandIDs.cutContextMenu,
    selector: SELECTOR,
    rank: 0
  });

  app.contextMenu.addItem({
    command: CommandIDs.copyContextMenu,
    selector: SELECTOR,
    rank: 0
  });

  app.contextMenu.addItem({
    command: CommandIDs.pasteContextMenu,
    selector: SELECTOR,
    rank: 0
  });

  app.contextMenu.addItem({
    selector: SELECTOR,
    rank: 0,
    type: 'separator'
  });

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
    selector: SELECTOR,
    rank: 0,
    type: 'separator'
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

  // add keybindings
  app.commands.addKeyBinding({
    command: CommandIDs.copyContextMenu,
    args: {},
    keys: ['Accel C'],
    selector: SELECTOR
  });

  app.commands.addKeyBinding({
    command: CommandIDs.cutContextMenu,
    args: {},
    keys: ['Accel X'],
    selector: SELECTOR
  });

  app.commands.addKeyBinding({
    command: CommandIDs.pasteContextMenu,
    args: {},
    keys: ['Accel V'],
    selector: SELECTOR
  });

  app.commands.addKeyBinding({
    command: CommandIDs.undo,
    args: {},
    keys: ['Accel Z'],
    selector: SELECTOR
  });
  app.commands.addKeyBinding({
    command: CommandIDs.redo,
    args: {},
    keys: ['Accel Shift Z'],
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
    headerGridLineColor: 'rgba(235, 235, 235, 0.25)'
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

export const CommandIDs = {
  addRow: 'tde:add-row',
  addColumn: 'tde:add-column',
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
  save: 'tde-save'
};
