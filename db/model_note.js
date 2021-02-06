var mongoose=require('mongoose');
var Schema=mongoose.Schema;

var Note=new Schema({
	type: String,
	num: String,
	name: String,
	account: String,
	content: [String],
	createdate: Date
});

module.exports=mongoose.model('Note',Note);