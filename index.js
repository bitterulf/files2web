var _ = require('underscore');
_.s = require('underscore.string');

var fs = require('fs');

var marked = require('meta-marked');
marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false
});

var yaml = require('js-yaml');

var sizeOf = require('image-size');

var jade = require('jade');

var getDataForImage = function(file) {
  var type = _.s.strRightBack(file, '.');
  var webname = _.s.strRightBack(file, '-');
  var data = sizeOf(__dirname+'/content/'+file);
  var tags =  _.s.words(_.s.strLeft (file, '.'+type), '-');
  tags.pop();

  data.webname = webname;
  data.filename = file;
  data.tags = tags;

  return data;
};

var loadContent = function(cb) {
  var content = {};
  fs.readdir(__dirname+'/content', function(err, files) {
    _.each(files, function(file) {
      var type;
      var webname;
      var tags;
      var result;
      if (!_.s.startsWith(file, '_')) {
        if (_.s.endsWith(file, '.md')) {
          type = _.s.strRightBack(file, '.');
          webname = _.s.strRightBack(file, '-');
          tags =  _.s.words(_.s.strLeft (file, '.'+type), '-');
          tags.pop();

          result = {};

          result.filename = file;
          result.webname = webname.replace('md', 'html');
          result.tags = tags;
          result.data = marked(fs.readFileSync(__dirname+'/content/'+file, 'utf8'));

          content[file] = result;
        }
        else if (_.s.endsWith(file, '.yaml')) {
          content[file] = yaml.safeLoad(fs.readFileSync(__dirname+'/content/'+file, 'utf8'));
        }
        else if (_.s.endsWith(file, '.jade')) {
          type = _.s.strRightBack(file, '.');
          webname = _.s.strRightBack(file, '-');
          tags =  _.s.words(_.s.strLeft (file, '.'+type), '-');
          tags.pop();

          result = {};

          result.filename = file;
          result.webname = webname.replace('jade', 'html');
          result.tags = tags;

          content[file] = result;
        }
        else if (_.s.endsWith(file, '.jpg') || _.s.endsWith(file, '.jpeg')) {
          content[file] = getDataForImage(file);
        }
        else if (_.s.endsWith(file, '.csv')) {
          var csv = fs.readFileSync(__dirname+'/content/'+file, 'utf8').split('\r\n');
          csv.pop();

          type = _.s.strRightBack(file, '.');
          webname = _.s.strRightBack(file, '-');
          tags =  _.s.words(_.s.strLeft (file, '.'+type), '-');
          tags.pop();

          result = {};

          result.data = _.map(csv, function(line){ return line.split(','); });
          result.filename = file;
          result.webname = webname;
          result.tags = tags;

          content[file] = result;
        }
        else {
          console.log('i do not know how to handle '+file);
        }
      }
    });

    cb(null, content);
  });
};

var renderTemplates = function(content, cb) {
  _.each(content, function(data, file) {
    var output;
    if (_.s.endsWith(file, '.jade')) {
      output = jade.renderFile(__dirname+'/content/'+file, {content: content, _:_, pretty: true});
      console.log(file, data, output);
      fs.writeFileSync(__dirname+'/output/'+data.webname, output);
    }
    else if (_.s.endsWith(file, '.md')) {
      var template = data.data.meta.template;
      output = jade.renderFile(__dirname+'/content/_'+template+'.jade', {content: content, _:_, pretty: true, renderedHtml: data.data.html});
      console.log(file, data, output);
      fs.writeFileSync(__dirname+'/output/'+data.webname, output);
    }
  });
  cb(null);
};

var cleanup = function(cb) {
  var dirPath = __dirname+'/output';
  var files = fs.readdirSync(dirPath);
  if (files.length > 0) {
    for (var i = 0; i < files.length; i++) {
      if (!_.s.startsWith(files[i], '.')) {
        var filePath = dirPath + '/' + files[i];
        fs.unlinkSync(filePath);
      }
    }
  }
  cb(null);
};

loadContent(function(err, content) {
  cleanup(function() {
    renderTemplates(content, function(err) {
      console.log('end');
    });
  });
});
