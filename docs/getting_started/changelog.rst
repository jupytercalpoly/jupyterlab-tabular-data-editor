.. _changelog:

Changelog
---------

v0.7.5
^^^^^^
* Bug fixes with moving shadow/line

v0.7.4
^^^^^^
* Backspace keyboard shortcut working
* Fixes small bug with data types not updating on an undo/redo that changes the type
* Save dialog bug fix
* Created a selectCell method in the PaintedGrid
* Draw icon refactor
* Removed serializer and old model files

v0.7.3
^^^^^^
* Datagrid styling changes
* Adjusts the position and style of the icons

v0.7.2
^^^^^^
* Fixed the move line not accounting for scroll
* Package updated from @tde-csvviewer to @jupyterlab/csvviewer + Launcher handled in a way that we don't need to change _computeRowOffsets
* Fixed right-click column header results in move shadow

v0.7.1
^^^^^^
* Added new files to the demo folder
* Ghost row/columns bug fixes
* Refactor data detection to format data

v0.7.0
^^^^^^
* Can now edit headers after scrolling
* Hover feature for ghost row and column
* Clearing rows and columns bug fix
* Pointer cursor for ghost row/column
* Modified icon painting setup to work with absolute positioning rather than relative positioning
* Adding data detection icons
* Styling for data detection icons
* Replace all bug fix
* Makes the text "Column 1" appear on the column header when launching a csv file

v0.6.0
^^^^^^
* Cell data types for the body region
* Multi insert/remove for rows/columns
* WCAG AAA approved search match colors
* Ghost row and column feature added
* Fix the header displaying the wrong value on edit
* Serialization fix for data sets larger than 500 rows
* Inserting/removing column bug fixes
* Fixed console error when searching for a match

v0.5.0
^^^^^^
* Shadow/line fixes when moving + handler.ts refactoring
* Create a new csv file from launcher
* Reduced column header and row height
* Edit Headers
* Save keybinding

v0.4.0
^^^^^^
* Selection UX for Undo/Redo
* Right-click selection fixes
* Litestore refactor

v0.3.0
^^^^^^
* Multiple context menus
* Clear contents (rows, columns, selections)

v0.2.0
^^^^^^
* Copy, cut, and paste
* Undo and redo
* Implemented Litestore
* Move columns and rows
* Theme manager (light/dark)
* Search and replace 
* Command Toolbar
* Binder link setup

v0.1.0
^^^^^^
* Editable cells
* Alphabetic column header
* Save CSV file
* Delete rows and columns
* Add rows and columns




