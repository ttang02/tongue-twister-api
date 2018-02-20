var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var LanguageSchema = new Schema({
  language : {
    type : String,
    required : 'The language is required'
  },
  codelang : {
    type :  String,
    require : 'the codelang is required'
  }
});

module.exports = mongoose.model('Languages', LanguageSchema);
