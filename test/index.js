const path = require('path');

const scssVarsToJs = require('../lib');
scssVarsToJs({ entry: path.resolve(__dirname, './src/main.scss') }).then(
  (data) => {
    const testPassed =
      data['dep-var1'] === '10px' &&
      data['dep-var2'] === '20px' &&
      data['main-var'] === '30px';

    if (testPassed) {
      console.log('Test passed');
    } else {
      console.log('Test failed');
    }
  },
  () => {
    console.log('Test failed');
  }
);
