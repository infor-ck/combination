var mongoose=require('mongoose');
var Schema=mongoose.Schema;

var User_Attr=new Schema({
	account: String,
	allow_to_room: {type: Boolean,default: true}
});

module.exports=mongoose.model('User_Attr',User_Attr);