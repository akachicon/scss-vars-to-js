const postcss = require('postcss');
const scssSyntax = require('postcss-scss');
const { __SCSS_TO_LESS_VARS__ } = require('./constants');

function ScssToCssVarsLoader(source) {
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
      const appendix = `\n\n${__SCSS_TO_LESS_VARS__} {\n${storedVars.join(
        ';\n'
      )}}\n`;

      callback(null, source + appendix);
    });
}

module.exports = ScssToCssVarsLoader;
