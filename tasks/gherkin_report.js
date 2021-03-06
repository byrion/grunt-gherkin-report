'use strict';

module.exports = function(grunt) {

  var path = require('path');
  var _ = require('underscore');

  var parser = require('./parser');

  var createNodeStructure = function(root, nodePath){

    var splittedPath = nodePath.split('/');
    var destPath = root;

    for(var j = 0; j < splittedPath.length - 1; j++){
      if(!destPath.children[splittedPath[j]]){
        destPath.children[splittedPath[j]] = {
          items: [],
          children: {}
        };
      }

      destPath = destPath.children[splittedPath[j]];
    }

    return destPath;
  };

  var getValidFiles = function(filesEntry){
    return filesEntry.src.filter(function(filepath) {
      return grunt.file.exists(path.join(filesEntry.cwd, filepath));
    });
  };

  var getContentTree = function(files, options){

    var contentTree = {
      name: options.title,
      subtitle: options.subtitle,
      items: [],
      children: {}
    };

    files.forEach(function(f) {
      _.forEach(getValidFiles(f), function(filepath, i){
        grunt.log.writeln("Adding " + filepath + " scenarios...");

        var fileContent = grunt.file.read(path.join(f.cwd, filepath)),
            featureName = parser.getFeatureName(fileContent),
            destPath = createNodeStructure(contentTree, filepath);

        if ('type' in options && options.type == 'manual') {
            fileContent = fileContent.match(/(.*?@manual[\s\S]*?)(?:\n\n|$)/g);

            if (fileContent != null) {
                fileContent = 'Feature: ' + featureName + '\n\n' + fileContent.join('');
            }
        } else if ('type' in options && options.type == 'automated') {
            fileContent = fileContent.match(/((?:@|#).*?[\s\S]*?)(?:\n\n|$)/g);

            for(var i=fileContent.length-1; i>=0; i--) {
                if (fileContent[i].indexOf('@manual') > -1) {
                    fileContent.splice(i, 1);
                }
            }

            if (fileContent != null && fileContent.length > 0) {
                fileContent = 'Feature: ' + featureName + '\n\n' + fileContent.join('');
            } else {
                fileContent = null;
            }
        }

        if (fileContent != null) {
            destPath.items.push({
                name: featureName,
                content: fileContent,
                fileName: filepath
            });
        }
      });
    });

    _.each(contentTree.children, function(f, key) {
      if (f.items.length == 0) delete contentTree.children[key];
    });

    return contentTree;
  };

  grunt.registerMultiTask('gherkin_report', 'It saves your Cucumber/Specflow features files in a html format', function() {
    var options = this.options({}),
        data = JSON.stringify(getContentTree(this.files, options)),
        template = grunt.file.read(path.join(__dirname, 'template.html')),
        templateWithData = template.replace("{{ data }}", data);

    grunt.file.write(options.destination, templateWithData, { encoding: 'utf-8' });

    grunt.log.writeln('File "' + options.destination + '" created.');
  });
};
