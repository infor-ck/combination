var mongoose=require('mongoose');
var Schema=mongoose.Schema;

var Message=new Schema({
	account: String,
	content: {type: String,text: true},
	room: String,
	createdate: Date,
	last_read: String
});

module.exports=mongoose.model('Message',Message);