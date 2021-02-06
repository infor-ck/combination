var User=require('../db/model_user');
var Message=require('../db/model_message');
var Room=require('../db/model_room');
var User_Attr=require('../db/model_user_attr');
const { v4: uuidv4 } = require('uuid');
var lib=require('../db/lib');


//check if room & user exist
var check_exist=async(name,room)=>{
	let user=await User.findOne({account: name});
	if(!user){
		//cookie logined=false
		//redirect to login
		console.log("user not exist at init_data");
		return 404;
	}
	else if(!room){
		console.log("no room at init_data");
		//resend room
		return 204;
	}
	else if(!user.rooms.includes(room)){
		//set page 404 not found
		console.log("room not exist at init_data");
		return 404;
	}
	else{
		return user;
	}
}

//retrun object of Room
var load_room=async(user,room)=>{
	let msg;
	let last_msg;
	let rooms=await Room.find({member:user.account});
	/*for(let i=0;i<rooms.length;i++){
		msg=await Message.find({room: rooms[i].num},null,{sort: {createdate:'desc'}});
		last_msg=msg[0].account+": "+msg[0].content;
		rooms[i].message=last_msg;
	}; */
	return rooms;
}

//give origin rooms{rooms[i].num:member}
var check_origin=(rooms)=>{
	let origin_rooms=new Object();
	for(let i=0;i<rooms.length;i++){
		if(rooms[i].single===true){
			origin_rooms[rooms[i].num]=rooms[i].member;
		}
	}
	return origin_rooms;
}

//return user.friends{user.friends[i]:href}
var load_friends=(user,origin_rooms)=>{
	let friends=new Object();
	for(let item in origin_rooms){
		for(let i=0;i<user.friends.length;i++){
			if(origin_rooms[item].includes(user.friends[i])){
				friends[user.friends[i]]=item;
			}
		}
	}
	return friends;
}

//return array[]
exports.friends_to_room=async(user_friends)=>{
	let friends_allow_room=[];
	let user_attrs=await User_Attr.find({account: {$in: user_friends}});
	for(let i=0;i<user_attrs.length;i++){
		if(user_attrs[i].allow_to_room===true){
			friends_allow_room.push(user_attrs[i].account);
		}
	}
	return friends_allow_room;
}

//return array[]
var friends_to_room=async(user_friends)=>{
	let friends_allow_room=[];
	let user_attrs=await User_Attr.find({account:{$in:user_friends}});
	for(let i=0;i<user_attrs.length;i++){
		if(user_attrs[i].allow_to_room===true){
			friends_allow_room.push(user_attrs[i].account);
		}
	}
	return friends_allow_room;
}

//return msg [{},{}]
var load_messages=async(room,start_point)=>{
	let messages=await Message.find({room: room},null,{sort: {createdate:'desc'}});
	let msg=messages.slice(start_point,start_point+30);
	return msg;
}


exports.init_data=async(name,room)=>{
	let user=await check_exist(name,room);
	let data=new Object();
	if(user){
		let rooms=await load_room(user,room);//get rooms
		let origin_rooms=await check_origin(rooms);
		let friends=await load_friends(user,origin_rooms);//get friends
		let friends_allow_to_room=await friends_to_room(user.friends);//get friends(allow_to_room)
		let messages=await load_messages(room,0);//init messages
		if(!rooms){
			console.log("rooms undefined at init_data");
		}
		else if(!origin_rooms){
			console.log("origin_rooms undefined at init_data");
		}
		else if(!friends){
			console.log("friends undefined at init_data");
		}
		else if(!friends_allow_to_room){
			console.log("friends_allow_to_room undefined at init_data");
		}
		else if(!messages){
			console.log("messages undefined at init_data");
		}
		else{
			data.rooms=rooms;
			data.friends=friends;
			data.friends_allow_to_room=friends_allow_to_room;
			data.messages=messages;
		}
		return data;
	}	
}

var create_new_friend=async(friend,myname)=>{
	let user=await User.findOne({account: myname});
	if(!user){
		console.log("user not exist at create_new_friend");
		return 404;
	}
	else if(user.friends.includes(friend)){
		console.log("friend already exists at create_new_friend");
		return 302;
	}
	else{
		let room=await lib.createroom([friend,myname]);
		lib.appendroom([friend,myname],room);
		lib.appendfriend(friend,myname);
		return 200;
	}
}

exports.add_friend=async(friend,myname)=>{
	let new_friend=await User.findOne({account: friend});
	if(!new_friend){
		console.log("not found at find friend in add_friend");
		return 404;
	}
	else if(new_friend.allow_add_friend===false){
		console.log("not allow_add_friend at add_friend");
		return 401;			
	}
	else{
		let res_val=await create_new_friend(friend,myname);
		if(res_val===200){
			return 200;
		}
	}
}

var init_msg=async(member,num)=>{
	let sender="system";
	let msg_base=" has attended the room";
	for(let i=0;i<member.length;i++){
		let content=member[i]+msg_base;
		let new_msg=new Message({
			account: sender,
			content: content,
			room: num,
			createdate: Date.now(),
			last_read: null
		});
		await new_msg.save((err)=>{
			if(err){
				console.log(`can't save ${member[i]} msg at init_msg`);
			}
		})
	}
}

exports.add_member=async(member_add,room)=>{ //bug: will append two the same name at the same time
	let result;
	let member_to_add=[];
	let res_room=await Room.findOne({num: room});
	for(let i=0;i<member_add.length;i++){
		if(!res_room.member.includes(member_add[i])){
			member_to_add.push(member_add[i]);
		}
	}
	await Room.updateOne({num: room},{$push: {member: member_to_add}});
	for(let i=0;i<member_to_add.length;i++){
			await User.updateOne({account: member_to_add[i]},{$push: {rooms: room}});
	}
	await init_msg(member_to_add,room);
	return member_to_add;
}

exports.load_msg=async(room,msg_num)=>{
	let data=new Object();
	data.messages=await load_messages(room,msg_num);
	return data;
}

var cls_empty_room=async(room)=>{
	let res_room=await Room.findOne({num: room});
	if(res_room.member.length===0){
		Message.deleteMany({room: room},(err)=>{
			if(err){
				console.log("deleteMany err message at cls_empty_room");
			}
		});
		Room.deleteOne({num: room},(err)=>{
			if(err){
				console.log("delete error at cls_empty_room");
			}
		});
	}
} 

exports.drop_out_room=async(room,name)=>{
	let res_room=await Room.findOne({num: room});
	if(!res_room){
		console.log("not found at drop_out_room");
		return 404;
	}
	else{
		let user=await User.findOne({account: name});
		if(!user){
			console.log("not found at drop_out_room");
			return 404;
		}
		else{
			await Room.updateOne({num: room},{$pull: {member: name}},(err)=>{
				if(err){
					console.log("update pull err room at drop_out_room");
					}
				});
			await User.updateOne({account: name},{$pull: {rooms: room}},(err)=>{
				if(err){
					console.log("update pull err user at drop_out_room");
				}
			});
			await cls_empty_room(room);
			return 200;
		}
	}
}

exports.friend_data=(user,origin_rooms)=>{
	load_friends(user,origin_rooms);
}