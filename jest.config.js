let tsConfig = require('./tsconfig.json');
var tsOptions = tsConfig['compilerOptions'];
// Need as the test folder is not visible from the src folder
tsOptions['rootDir'] = null;
tsOptions['inlineSourceMap'] = true;

module.exports = {
  preset: 'ts-jest',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['/lib/', '/node_modules/'],
  transformIgnorePatterns: ['/node_modules/(?!(@jupyterlab/.*)/)'],
  globals: {
    'ts-jest': {
      tsConfig: tsOptions
    }
  }
};
