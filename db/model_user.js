var mongoose=require('mongoose');
var Schema=mongoose.Schema;

var User=new Schema({
	account: String,
	pwd: String,
	rooms: [String],
	friends: [String],
	allow_add_friend: {type: Boolean,default: true}
})

module.exports=mongoose.model('User',User);