var User=require('./db/model_user');
var Message=require('./db/model_message');
var Room=require('./db/model_room');
var User_Attr=require('./db/model_user_attr');
var lib=require("./db/lib");

exports.login=async(name,password)=>{
	if((!name)||(!password)){
		console.log("name or password empty at login");
		return 204;
	}
	let pwd= await lib.create_crypto(password,"jizz7122");
	let user=await User.findOne({account: name});
	if(!user){
		console.log("user not exists at login");
		return 404;
	}
	else if(user.pwd!=pwd){
		console.log("password not correct");
		return 406;
	}
	else{
		return 200;
	}
}

var create_user=async(name,pwd,num)=>{
	let new_user=new User({
		account: name,
		pwd: pwd,
		rooms: [num],
		friends: [name],
		allow_add_friend: true
	});
	await new_user.save((err)=>{
		if(err){
			console.log("can't save new_user at create_user");
		}
	});
	let new_user_attr=new User_Attr({
		account: name,
		allow_to_room: true
	});
	await new_user_attr.save((err)=>{
		if(err){
			console.log("can't save new_user_attr at create_user");
		}
	});
}

exports.register=async(name,password,password_auth)=>{
	if((!name)||(!password)||(!password_auth)){
		console.log("blank empty at register");
		return 204;
	}
	if(password_auth!=password){
		console.log("password confirm fail at register");
		return 406;
	}
	let pwd=await lib.create_crypto(password,"jizz7122");
	let user=await User.findOne({account: name});
	if(user){
		console.log("user exists at register");
		return 302;
	}
	else{
		let num=await lib.createroom([name]);
		await create_user(name,pwd,num);
		return 200;
	}
}


exports.redirect_chat=async(name)=>{
	let user=await User.findOne({account: name});
	if(!user){
		console.log("not found at redirect_chat");
		return 404;
	}
	else{
		return user.rooms[0];
	}
}


exports.chpwd=async(name,old_pwd,new_pwd,new_pwd_again)=>{
	if(new_pwd!=new_pwd_again){
		console.log("new pwd not equal at chpwd");
		return 406;
	}
	else{
		let user=await User.findOne({account: name});
		if(!user){
			console.log("not found at chpwd");
			return 404;
		}
		else{	
			let pwd=await lib.create_crypto(old_pwd,"jizz7122");
			if(user.pwd!=pwd){
				console.log("old_pwd not correct at chpwd");
				return 406;
			}
			else{
				let new_password=await lib.create_crypto(new_pwd,"jizz7122");
				await User.updateOne({account: name},{$set: {pwd: new_password}},(err)=>{
					if(err){
						console.log("error update pwd at chpwd");
					}
				});
				return 200;
			} 
		}
	}
}