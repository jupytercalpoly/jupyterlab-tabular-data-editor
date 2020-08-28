# jupyterlab-tabular-data-editor

### Manipulate your tabular data responsively and effectively within JupyterLab.

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/jupytercalpoly/jupyterlab-tabular-data-editor/master?urlpath=lab) ![Github Actions Status](https://github.com/jupytercalpoly/jupyterlab-tabular-data-editor/workflows/Build/badge.svg) [![Documentation Status](https://readthedocs.org/projects/jupyterlab-tabular-data-editor/badge/?version=latest)](https://jupyterlab-tabular-data-editor.readthedocs.io/en/latest/?badge=latest)
 ![npm](https://img.shields.io/npm/v/jupyterlab-tabular-data-editor) ![npm](https://img.shields.io/npm/dt/jupyterlab-tabular-data-editor?color=orange)

### EXPERIMENTAL: This extension is still in alpha. The API is subject to frequent changes.

![](design/gifs/showcase.gif)

Try our extension [here](https://mybinder.org/v2/gh/jupytercalpoly/jupyterlab-tabular-data-editor/master?urlpath=lab)!

Read more about the Jupyter Tabular Data Editor Extension in our [press release](https://github.com/jupytercalpoly/jupyterlab-tabular-data-editor/blob/master/PRESS_RELEASE.md)!

- _Note: This is a forward-looking press release and serves to provide a vision of the final product. Not all features in this press release are currently implemented._

Check out our [current progress and future plans](https://github.com/jupytercalpoly/jupyterlab-tabular-data-editor/blob/master/PROGRESS.md)!

See our progress as of 08/27/2020 from these [slides](https://docs.google.com/presentation/d/12M3riXxlj1GouMA5mIt6B1QbdA7MSt_KNf8h545I2oI/edit?usp=sharing)!

## Feature Showcase
<details>
<summary>View Extension Highlights</summary>
<br>
  <h3>Launch new files and quickly add rows and columns</h3>
  <img src="design/gifs/csvlauncher.gif" alt="gif of launching a new csv file within JupyterLab">
  
  <br>
  <br>
  
  <h3>Seamlessly rearrange your data table</h3>
  <img src="design/gifs/moving.gif" alt="gif of moving rows and columns within JupyterLab">
  
   <br>
   <br>
   
  <h3>Insert and remove multiple rows and columns</h3>
  <img src="design/gifs/multiremoveandinsert.gif" alt="gif of removing and inserting multiple rows and columns within JupyterLab">
  
   <br>
   <br>
   
  <h3>Format your data with a click of a button</h3>
  <img src="design/gifs/auto-format.gif" alt="gif of toggling on a mode that formats data based on data types within JupyterLab">
  
   <br>
   <br>
   
  <h3>Search and replace with ease</h3>
  <img src="design/gifs/searchandreplace.gif" alt="gif of searching and replacing a word within a large file within JupyterLab">
</details>

## Requirements

- JupyterLab >= 2.0

## Install

```bash
jupyter labextension install jupyterlab-tabular-data-editor
```

## Contributing

### Install

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Move to jupyterlab-tabular-data-editor directory

# Install dependencies
jlpm
# Build Typescript source
jlpm build
# Link your development version of the extension with JupyterLab
jupyter labextension install .
# Rebuild Typescript source after making changes
jlpm build
# Rebuild JupyterLab after making any changes
jupyter lab build
```

You can watch the source directory and run JupyterLab in watch mode to watch for changes in the extension's source and automatically rebuild the extension and application.

```bash
# Watch the source directory in another terminal tab
jlpm watch
# Run jupyterlab in watch mode in one terminal tab
jupyter lab --watch
```

Now every change will be built locally and bundled into JupyterLab. Be sure to refresh your browser page after saving file changes to reload the extension (note: you'll need to wait for webpack to finish, which can take 10s+ at times).

### Uninstall

```bash

jupyter labextension uninstall jupyterlab-tabular-data-editor
```
