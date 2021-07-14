const name = 'WebpackEntrypointsPlugin'
const fs = require('fs');
const schema = require('./plugin.json');
const { validate } = require('schema-utils');
class WebpackEntrypointsPlugin {
  constructor(options) {
    validate(schema, options, { name: 'Entrypoints Plugin' });

    this.path = options.path;
    this.change = options.change;
  }
  apply(compiler) {
    compiler.hooks.done.tap(name, (stats) => {
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
      const path = this.path;
      let data = {};

      if (fs.existsSync(path)) {
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
      fs.writeFileSync(path, JSON.stringify(data, null, '  '));
      this.change && this.change(data);
    })
  }
}

module.exports = WebpackEntrypointsPlugin;
