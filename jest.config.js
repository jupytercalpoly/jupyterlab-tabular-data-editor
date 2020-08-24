module.exports = {
  preset: 'ts-jest/presets/js-with-babel',
  moduleNameMapper: { 
    '\\.(svg)$': '<rootDir>/testutils/jest-file-mock.js',
    '^!!to-string-loader!css-loader!.+\\.css':
    '<rootDir>/testutils/jest-style-mock.js' 
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFiles: ['<rootDir>/testutils/jest-setup-files.js'],
  testPathIgnorePatterns: ['/lib/', '/node_modules/'],
  transformIgnorePatterns: [
    '/node_modules/(?!(@jupyterlab/.*|tde-csvviewer)/)'
  ],

  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.test.json'
    }
  }
};
