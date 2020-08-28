.. _codebase:

Codebase Orientation
-----------------
This codebase was adapted from JupyterLab's `csvviewer <https://github.com/jupyterlab/jupyterlab/tree/master/packages/csvviewer>`_ and `csvviewer-extension <https://github.com/jupyterlab/jupyterlab/tree/master/packages/csvviewer-extension>`_ packages.

Directories
~~~~~~~~~~~
The repository contains a number of top-level directories, the contents of which
are described here.

Source Code: ``src/``
^^^^^^^^^^^^^^^^^^^^^^^^^^^
This contains the primary TypeScript files for this extension, which are compiled to JavaScript.

Binder setup: ``binder/``
^^^^^^^^^^^^^^^^^^^^^^^^^
This contains an environment specification for ``repo2docker`` which allows
the repository to be tested on `mybinder.org <https://mybinder.org>`__.

Demo: ``demo/``
^^^^^^^^^^^^^^^^^^^
The ``demo/`` directory contains sample csv files and Jupyter notebooks that highlight some features of this extension.

Design: ``design/``
^^^^^^^^^^^^^^^^^^^
A directory containing a series of design documents and prototypes motivating various
choices made in the course of building the Tabular Data Editor.

Documentation: ``docs/``
^^^^^^^^^^^^^^^^^^^^^^^^
This directory contains the Sphinx project for this documentation.
You can create an environment to build the documentation using ``conda create -f environment.yml``,
and you can build the documentation by running ``make html``.
The entry point to the built docs will then be in ``docs/build/index.html``.

Styling: ``style/``
^^^^^^^^^^^^^^^^^^^
This directory contains the icon assets and css styles for this extension.

Testing: ``test/``
^^^^^^^^^^^^^^^^^^^
Tests for the TypeScript files in the ``src/`` directory.
These test files pull in the TypeScript sources and exercise their APIs.

Run ``jlpm test`` from the root directory to run all tests for this extension

Test Utilities: ``testutils/``
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
A small ``npm`` package which is aids in running the tests in ``tests/``.
