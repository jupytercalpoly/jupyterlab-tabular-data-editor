# Jupyter Tabular Data Editor Extension Progress
An account of tasks and features planned and completed

## Features To Be Added (listed in order of highest priority)
- [x] Edit cells (text editing only)
- [x] Save
- [x] Add rows/columns
- [x] Delete rows/columns
- [ ] Move rows/columns
- [ ] Undo capabilities
- [ ] Filter
- [ ] Sort
- [ ] Search and Replace
- [ ] Creating a new csv from launcher
- [ ] Referencing other cells in formulas (relative positioning)

## Current Progress
### 06/22/20 - 06/26/20
- Initial repo setup - Kalen, Logan, Ryan
- Linked extension to JupyterLab - Kalen, Logan
- Completed heuristic evaluation - Ryan
- Finished personas, user journeys, and user stories - Ryan

### 06/29/20 - 07/02/20
- Created a fork of JupyterLab CSVViewer package (renaming of some attributes/methods to protected/public) - Logan
- Cells are now editable (text editing only) - Kalen, Logan

**Completed Prototypes - Ryan**
- Editing datagrid
- Saving datagrid
- Moving cells, rows, and columns
- Inserting rows and columns
- Filtering data

### 07/06/20 - 07/10/20
- Set up pre-commit hook (Husky/Lint-Staged) for linting and formatting code - Kalen
- Able to add rows and columns - Logan
- Able to delete rows and columns - Kalen, Logan
- Able to save file after editing in our extension - Kalen, Logan
