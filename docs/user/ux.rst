.. _ux:

User Experience
---------------

The JupyterLab Tabular Data Editor provides a versatile interface to support your data editing process.

Toolbar
=========
The toolbar has the following functionalities: save, undo, redo, cut, copy, and paste. In addition, you can format your data based on data types by toggling on `Format Data`.

.. image:: ../../design/gifs/Toolbar.png
   :align: center

Context Menus
=========
You can access the context menu by right-clicking. Commands within the context menu adjust depending on what’s selected and where you right-click on the datagrid. 

.. image:: ../../design/gifs/context-menus.gif
   :align: center

Keyboard Shortcuts
=========
You can manipulate your data and navigate the datagrid through keyboard shortcuts.

.. list-table:: General extension shortcuts
   :widths: 30 70
   :header-rows: 1

   * - Keypress
     - Command
   * - Ctrl + X
     - Cut the selected item and copy it to the clipboard
   * - Ctrl + C
     - Copy the selected item to the clipboard
   * - Ctrl + V
     - Paste the contents of the clipboard
   * - Ctrl + Z
     - Undo the previous action
   * - Shift + Ctrl + Z
     - Redo the previous action
   * - Ctrl + S
     - Save the current file
   * - Ctrl + F
     - Open the Find window
   * - Space
     - Edit a cell


.. list-table:: Moving around in the datagrid
   :widths: 30 70
   :header-rows: 1

   * - Keypress
     - Command
   * - Left/Right Arrow
     - Move one cell to the left or right
   * - Ctrl + Left/Right Arrow
     - Move to the farthest cell left or right in the row
   * - Up/Down Arrow
     - Move one cell up or down
   * - Ctrl + Up/Down Arrow
     - Move to the top or bottom cell in the column
   * - Tab
     - Move one cell to the right
   * - Shift + Tab
     - Move one cell to the left
   * - Enter
     - Move one cell down
   * - Shift + Enter
     - Move one cell up
     
.. list-table:: Selecting cells
   :widths: 30 70
   :header-rows: 1

   * - Keypress
     - Command
   * - Shift + Left/Right Arrow
     - Extend the cell selection one cell to the left or right
   * - Shift + Up/Down Arrow 
     - Extend the cell selection one cell up or down
   * - Shift + Ctrl + Left/Right Arrow
     - Extend the cell selection to the farthest cell left or right
   * - Shift + Ctrl + Up/Down Arrow
     - Extend the cell selection to the farthest cell up or down
    
