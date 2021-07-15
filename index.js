const name = 'WebpackEntrypointsPlugin'
const fs = require('fs');
const { dirname, relative, resolve } = require('path');
const schema = require('./plugin.json');
const { validate } = require('schema-utils');
const webpack = require('webpack');
const { RawSource } = webpack.sources || require('webpack-sources');

class WebpackEntrypointsPlugin {
  constructor(options) {
    validate(schema, options, { name: 'Entrypoints Plugin' });

    this.path = options.path || 'entrypoints.json';
    this.change = options.change;
    this.merge = options.merge || false;
    this.writeToFileEmit = options.writeToFileEmit || false;
  }
  apply(compiler) {
    const emit = (compilation) => {
      const stats = compilation.getStats();
      const chunkOnlyConfig = {
        assets: false,
        cached: false,
        children: true,
        chunks: true,
        chunkModules: false,
        chunkOrigins: false,
        errorDetails: false,
        hash: false,
        modules: false,
        reasons: false,
        source: false,
        timings: false,
        version: false
      };
      const statsObject = stats.toJson(chunkOnlyConfig);
      const entrypoints = statsObject.entrypoints;
      const path = resolve(compiler.options.output.path, this.path);
      let data = {};

      if (this.merge && fs.existsSync(path)) {
        data = JSON.parse(fs.readFileSync(path).toString());
      }
      for (let en in entrypoints) {
        entrypoints[en].chunks = entrypoints[en].chunks.map(chunkId => {
          const chunk = statsObject.chunks.find(chunk => chunk.id === chunkId);
          if (!chunk) {
            return chunkId;
          }
          return {
            id: chunkId,
            files: chunk.files,
            size: chunk.size,
          }
        })
        data[en] = {
          chunks: entrypoints[en].chunks,
          assets: entrypoints[en].assets,
        }
      }
      const output = JSON.stringify(data, null, '  ');
      
      const assetId = relative(compiler.options.output.path, path);
      compilation.emitAsset(assetId, new RawSource(output));

      if (this.writeToFileEmit) {
        fs.mkdirSync(dirname(path), { recursive: true });
        fs.writeFileSync(path, output);
      }

      this.change && this.change(data);
    };

    if (webpack.version.startsWith('4')) {
      compiler.hooks.emit.tap(name, emit);
    } else {
      compiler.hooks.thisCompilation.tap(name, (compilation) => {
        compilation.hooks.afterProcessAssets.tap(name, () => emit(compilation));
      });
    }
  }
}

module.exports = WebpackEntrypointsPlugin;
