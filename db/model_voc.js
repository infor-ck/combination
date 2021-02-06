var mongoose=require('mongoose');
var Schema=mongoose.Schema;

var Voc=new Schema({
	word: String,
	content: Object
});

module.exports=mongoose.model('Voc',Voc);