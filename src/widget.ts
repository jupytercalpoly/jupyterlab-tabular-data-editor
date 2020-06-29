import { CSVViewer, 
  CSVDocumentWidget,
  CSVViewerFactory,
   GridSearchService } from '@jupyterlab/csvviewer';
import { DocumentRegistry, IDocumentWidget, DocumentWidget } from '@jupyterlab/docregistry';
import EditableDataGrid from './grid';
import { BasicKeyHandler, BasicMouseHandler, DataGrid } from '@lumino/datagrid';
import { PanelLayout } from '@lumino/widgets';
import { ActivityMonitor } from '@jupyterlab/coreutils';


const CSV_GRID_CLASS = 'jp-CSVViewer-grid';
const RENDER_TIMEOUT = 1000;

export class EditableCSVViewer extends CSVViewer {
  constructor(options: CSVViewer.IOptions) {
    super(options);
    this._grid = new EditableDataGrid({
      defaultSizes: {
        rowHeight: 24,
        columnWidth: 144,
        rowHeaderWidth: 64,
        columnHeaderHeight: 36
      }
    });
    const layout = (this.layout = new PanelLayout());
    const context = (this._context = options.context);
    this._grid.addClass(CSV_GRID_CLASS);
    this._grid.headerVisibility = 'all';
    this._grid.keyHandler = new BasicKeyHandler();
    this._grid.mouseHandler = new BasicMouseHandler();
    this._grid.copyConfig = {
      separator: '\t',
      format: DataGrid.copyFormatGeneric,
      headers: 'all',
      warningThreshold: 1e6
    };
    layout.addWidget(this._grid);

    this._searchService = new GridSearchService(this._grid);
    this._searchService.changed.connect(this._updateRenderer, this);

    void this._context.ready.then(() => {
      this._updateGrid();
      this._revealed.resolve(undefined);
      // Throttle the rendering rate of the widget.
      this._monitor = new ActivityMonitor({
        signal: context.model.contentChanged,
        timeout: RENDER_TIMEOUT
      });
      this._monitor.activityStopped.connect(this._updateGrid, this);
    });
  }
}

export class EditableCSVDocumentWidget extends DocumentWidget<CSVViewer> { 
  constructor(options: CSVDocumentWidget.IOptions) {
    let { context, content, reveal } = options;
    content = content || new EditableCSVViewer({ context });
    reveal = Promise.all([reveal, content.revealed]);
    super(Object.assign({context, content, reveal}));
  }
}

export class EditableCSVViewerFactory extends CSVViewerFactory {
  createNewWidget(context: DocumentRegistry.Context): IDocumentWidget<CSVViewer> {
    return new EditableCSVDocumentWidget({ context })
  }
}



