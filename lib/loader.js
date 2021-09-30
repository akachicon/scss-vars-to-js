const postcss = require('postcss');
const scssSyntax = require('postcss-scss');
const { __SCSS_VARS_TO_JS__ } = require('./constants');

function ScssVarsToJsLoader(source) {
  const callback = this.async();

  postcss()
    .process(source, { from: undefined, syntax: scssSyntax })
    .then((ast) => {
      const vars = [];
      for (const node of ast.root.nodes) {
        if (node instanceof postcss.Declaration) {
          vars.push(node.prop.slice(1));
        }
      }
      // Temporarily save variables so we could use them after computation.
      const storedVars = vars.map((v) => `${v}: \$${v}`);
      const appendix = `\n\n${__SCSS_VARS_TO_JS__} {\n${storedVars.join(
        ';\n'
      )}}\n`;

      callback(null, source + appendix);
    });
}

module.exports = ScssVarsToJsLoader;
