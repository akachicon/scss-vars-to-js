const path = require('path');
const resolve = require('resolve');
const MemoryFs = require('memory-fs');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { cssExt, jsExt } = require('./utils');
const { __SCSS_TO_LESS_VARS__ } = require('./constants');

function resolveModule(id, opts) {
  return new Promise((res, rej) => {
    resolve(id, opts, (err, path) => (err ? rej(err) : res(path)));
  });
}

// Copied from postcss-import to add .scss extension.
function resolver(id, base, options) {
  const paths = options.path;

  const resolveOpts = {
    basedir: base,
    moduleDirectory: ['node_modules'],
    paths,
    extensions: ['.scss', '.css'],
    packageFilter: (pkg) => {
      if (pkg.style) {
        pkg.main = pkg.style;
      } else if (!pkg.main || !/\.css$/.test(pkg.main)) pkg.main = 'index.css';
      return pkg;
    },
    preserveSymlinks: false,
  };

  return resolveModule(`./${id}`, resolveOpts)
    .catch(() => resolveModule(id, resolveOpts))
    .catch(() => {
      if (paths.indexOf(base) === -1) paths.unshift(base);

      throw new Error(
        `Failed to find '${id}'
  in [
    ${paths.join(',\n        ')}
  ]`
      );
    });
}

const getConfig = (entryScss) => ({
  mode: 'none',
  entry: entryScss,
  devtool: false,
  module: {
    rules: [
      {
        test: /\.(scss|css)$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader',
          path.resolve(__dirname, './loader'),
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                from: entryScss,
                parser: 'postcss-scss',
                plugins: [
                  [
                    'postcss-import',
                    {
                      resolve: resolver,
                    },
                  ],
                ],
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: cssExt(__SCSS_TO_LESS_VARS__),
    }),
  ],
  resolve: {
    extensions: ['.css', '.scss'],
  },
  output: {
    filename: jsExt(__SCSS_TO_LESS_VARS__),
    path: path.resolve(__dirname, 'dist'),
  },
});

module.exports = ({ entry: entryScss }) => {
  return new Promise((resolvePromise, rejectPromise) => {
    const memoryFs = new MemoryFs();
    const compiler = webpack(getConfig(entryScss));
    compiler.outputFileSystem = memoryFs;

    compiler.run((err, stats) => {
      if (err) {
        console.error('Failed to parse scss variables from', entryScss);
        console.error(err);
        rejectPromise();
      }
      const info = stats.toJson();

      if (stats.hasErrors()) {
        console.error(info.errors);
      }
      if (stats.hasWarnings()) {
        console.warn(info.warnings);
      }
      const cssAsset = cssExt(__SCSS_TO_LESS_VARS__);
      const cssFile = path.join(compiler.outputPath, cssAsset);
      let src = '';

      try {
        src = memoryFs.readFileSync(cssFile, 'utf8');
      } catch (err) {
        console.error('Converting scss variables to less failed');
        console.error(err);
        rejectPromise();
      }

      const vars = src.match(
        `${__SCSS_TO_LESS_VARS__}\\s*{([\\s\\-_a-zA-Z0-9:;)(]*)`
      );
      if (vars && vars[1]) {
        const varsObj = vars[1]
          .trim()
          .split(';')
          .filter(Boolean)
          .map((v) =>
            v
              .trim()
              .split(':')
              .map((w) => w.trim())
          )
          .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

        resolvePromise(varsObj);
      }
    });
  });
};
