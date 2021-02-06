var mongoose=require('mongoose');
var Schema=mongoose.Schema;

var Room=new Schema({
	num: String,
	name: String,
	last_msg: Date,
	single: Boolean,
	member: [String]
})

module.exports=mongoose.model('Room',Room);