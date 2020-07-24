# Jupyter Tabular Data Editor Extension Progress
An account of tasks and features planned and completed

## Features To Be Added (listed in order of highest priority)
- [x] Edit cells (text editing only)
- [x] Save
- [x] Add rows/columns
- [x] Delete rows/columns
- [x] Move rows/columns
- [x] Undo/redo capabilities
- [x] Copy, paste, cut
- [ ] Toolbar for editing functions
- [ ] Search and Replace
---
**Potential Future Features**
- [ ] Filter
- [ ] Sort
- [ ] Creating a new csv from launcher
- [ ] Referencing other cells in formulas (relative positioning)

## Current Progress

### 07/20/20 - 07/24/20
- Search and replace functionality - Kalen
- Theme manager (light/dark) - Kalen
- CSS Styling changes to dark theme - Ryan
- CSS Styling changes to moving row/column shadow - Ryan

**Design Exploration - Ryan**
- Ghost columns/ rows
- No formula bar
- Insert drop down menu toolbar
- Simplified context menus

### 07/13/20 - 07/17/20
- Set up Jest framework for testing - Kalen, Logan
- Implemented Litestore (simplified version of Lumino Datastore) to manage model data - Kalen
- Able to undo and redo basic cell functions (cell editing, additions/removals of rows/columns) - Kalen
- Able to copy/cut and paste - Logan
- Created a new npm package for our slightly modified version of lumino - Logan
- Started designing the UX/UI for writing code (i.e. code editor) for a cell in a table (Phase 2 Exploration) - Ryan
- Added a toolbar with clickable buttons (functionality still needs to be implementted) - Ryan

### 07/06/20 - 07/10/20
#### [Demo - Initial Progress](https://docs.google.com/presentation/d/1b-cH0wQz6oAtlLLPSqETVqasltpMQd9ceNx0LXjgJyU/edit?usp=sharing)

- Set up pre-commit hook (Husky/Lint-Staged) for linting and formatting code - Kalen
- Able to add rows and columns - Logan
- Able to delete rows and columns - Kalen, Logan
- Able to save file after editing in our extension - Kalen, Logan
- Alphabetic column header - Kalen
- Added UI/UX for user story issues - Ryan

**Completed Prototypes - Ryan**
- Sorting Data
- Search and Replace

### 06/29/20 - 07/02/20
- Created a fork of JupyterLab CSVViewer package (renaming of some attributes/methods to protected/public) - Logan
- Cells are now editable (text editing only) - Kalen, Logan

**Completed Prototypes - Ryan**
- Editing datagrid
- Saving datagrid
- Moving cells, rows, and columns
- Inserting rows and columns
- Filtering data

### 06/22/20 - 06/26/20
- Initial repo setup - Kalen, Logan, Ryan
- Linked extension to JupyterLab - Kalen, Logan
- Completed heuristic evaluation - Ryan
- Finished personas, user journeys, and user stories - Ryan
