var requirejs = require('requirejs');
var async = require('async');

module.exports = function(grunt){
  var LOG_LEVEL_TRACE = 0, LOG_LEVEL_WARN = 2;

  // TODO: extend this to send build log to grunt.log.ok / grunt.log.error
  // by overriding the r.js logger (or submit issue to r.js to expand logging support)
  requirejs.define('node/print', [], function() {
    return function print(msg) {
      if (msg.substring(0, 5) === 'Error') {
        grunt.log.errorlns(msg);
        grunt.fail.warn('RequireJS failed.');
      } else {
        grunt.log.oklns(msg);
      }
    };
  });

  var trimSuffix = function(name){
    return name.replace(/\.js$/, '');
  };

  // The following catches errors in the user-defined `done` function and outputs them.
  var tryCatch = function(fn, done, output) {
    try {
      fn(done, output);
    } catch(e) {
      grunt.fail.warn('There was an error while processing your done function: "' + e + '"');
    }
  };

  grunt.registerMultiTask('amd_id', 'add module id to anonymous module define', function(){
    var done = this.async();
    var options = this.options({
      logLevel: grunt.option('verbose') ? LOG_LEVEL_TRACE : LOG_LEVEL_WARN,
      done: function(done, response){
        done();
      },
      replace: function(name){
        return name;
      },
      exclude: [],
      baseUrl: './'
    });

    var paths = {};
    options.exclude.forEach(function(name){
      paths[name] = 'empty:';
    });

    var baseUrl = options.baseUrl;
    if(baseUrl[baseUrl.length - 1] !== '/'){
      baseUrl += '/';
    }

    var requireOptions = [];

    this.files.forEach(function(f){
      var src = f.src.filter(function(filePath){
        if(!grunt.file.exists(filePath)){
          grunt.log.warn('Source file ' + chalk.cyan(filePath) + ' not found');
          return false;
        }else{
          return true;
        }
      });

      if(src.length === 0){
        return;
      }

      src
        .map(function(path){
          return {
            name: path,
            out: path
          };
        })
        .map(function(item){
          item.name = trimSuffix(item.name);
          return item;
        })
        .map(function(item){
          item.name = item.name.replace(baseUrl, '');
          return item;
        })
        .map(function(item){
          item.name = options.replace(item.name);
          return item;
        })
        .map(function(item){
          item.baseUrl = options.baseUrl;
          item.optimize = 'none';
          item.paths = paths;
          return item;
        })
        .forEach(function(item){
          item.done = options.done;
          item.logLevel = options.logLevel;
          requireOptions.push(item);
        });
    });

    async.each(requireOptions, function(requireOption, cbk){
      requirejs.optimize(requireOption, tryCatch.bind(null, requireOption.done, cbk));
    }, done);

  });
}