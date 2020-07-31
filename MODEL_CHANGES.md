

# Model Changes
_This document is a work in progress. The model it describes is currently in developement and not implemented yet_.

## Motivation:
TODO
_What improvements and value will the new model provide (both to users/developers)?_

## Original Model:
_How the original model works and what problems it poses_

Our model originally was based on directly changing the data of the csv file on every change to the grid. The data is stored as a string, so if you had an editor open that looked like this
![image](https://user-images.githubusercontent.com/52261474/89075518-41dcbe80-d333-11ea-8cb0-9a9267905812.png)

then the string would look like "1,2,3\n4,5,6\n7,8,9". If you added a row 1, we make this change appear by modifing the string so that it looked like ",,,\n1,2,3\n4,5,6\n7,8,9".


## The New Model:

_How the new model works and the benefits of it_



Our new model doesn't directly modify this string (not until you save the file, anyway). To understand what the new model is doing we have to dig a bit deeper into how the grid displays the correct values in each cell. The grid asks the model what is at each row/column position by calling a function called `data`. So, the `DataGrid` would first call `this._model.data('body', 0, 0)` to figure out what should be in the first row and first column. The `body` argument specifies what **region** the `DataGrid` is looking at. Other regions are `row-header` and `column-header`. This method would return `1`, since 1 is the value in the first row, first column cell. The new model leaves the string as-is, but changes the behavior of `data` to make it more fexible. Basically, when a value is requested at a certain row, column, we map the row and column to the row and column were the value exists in the string. Alternatively, if the value at that row and column was added during editing, we will have it stored in a Javascript object.


### TODOs:
- [x] editing single cell working
- [x] adding/removing/moving rows columns working
- [ ] cut/copy/paste working
- [ ] undo/redo working
- [ ] saving working
- [ ] S & R working
- [ ] clearing working


