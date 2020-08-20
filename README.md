# jupyterlab-tabular-data-editor

### Manipulate your tabular data responsively and effectively within JupyterLab.

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/jupytercalpoly/jupyterlab-tabular-data-editor/master?urlpath=lab) ![Github Actions Status](https://github.com/jupytercalpoly/jupyterlab-tabular-data-editor/workflows/Build/badge.svg)

### EXPERIMENTAL: This extension is still in alpha. The API is subject to frequent changes.

### Please contact [Kalen](https://github.com/kgoo124), [Logan](https://github.com/lmcnichols), or [Ryan](https://github.com/ryuntalan) if you would like to contribute!

Try our extension [here](https://mybinder.org/v2/gh/jupytercalpoly/jupyterlab-tabular-data-editor/master?urlpath=lab)!

Read more about the Jupyter Tabular Data Editor Extension in our [press release](https://github.com/jupytercalpoly/jupyterlab-tabular-data-editor/blob/master/PRESS_RELEASE.md)!

- _Note: This is a forward-looking press release and serves to provide a vision of the final product. Not all features in this press release are currently implemented._

Check out our [current progress and future plans](https://github.com/jupytercalpoly/jupyterlab-tabular-data-editor/blob/master/PROGRESS.md)!

See our progress as of 08/07/2020 from these [slides](https://docs.google.com/presentation/d/1ZGjFb3RkoR5Cc39DDdtU-AYAoYMNVMyUM9g80qgNzos/edit?usp=sharing)!

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
