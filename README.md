# jupyterlab-tabular-data-editor

### Manipulate your tabular data responsively and effectively within JupyterLab.

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/jupytercalpoly/jupyterlab-tabular-data-editor/65607dab56eab7c7352448164340f4f260f6b255?urlpath=lab) ![Github Actions Status](https://github.com/jupytercalpoly/jupyterlab-tabular-data-editor/workflows/Build/badge.svg)

Try our extension [here](https://mybinder.org/v2/gh/jupytercalpoly/jupyterlab-tabular-data-editor/65607dab56eab7c7352448164340f4f260f6b255?urlpath=lab)!

Read more about the Jupyter Tabular Data Editor Extension in our [press release](https://github.com/jupytercalpoly/jupyterlab-tabular-data-editor/blob/master/PRESS_RELEASE.md)!

- _Note: This is a forward-looking press release and serves to provide a vision of the final product. Not all features in this press release are currently implemented._

Check out our [current progress and future plans](https://github.com/jupytercalpoly/jupyterlab-tabular-data-editor/blob/master/PROGRESS.md)!

See our progress as of 07/09/2020 from these [slides](https://docs.google.com/presentation/d/1b-cH0wQz6oAtlLLPSqETVqasltpMQd9ceNx0LXjgJyU/edit?usp=sharing)!

View a report of our code coverage [here](http://htmlpreview.github.io/?https://github.com/jupytercalpoly/jupyterlab-tabular-data-editor/blob/master/coverage/lcov-report/index.html)!

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
