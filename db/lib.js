var User=require('../db/model_user');
var Voc=require("./model_voc");
var Message=require('../db/model_message');
var Room=require('../db/model_room');
var User_attr=require('../db/model_user_attr');
var crypto=require('crypto');
const { v4: uuidv4 } = require('uuid');
const request = require('request');
const cheerio = require('cheerio');
const base_url = 'https://dictionary.cambridge.org/zht/%E8%A9%9E%E5%85%B8/%E8%8B%B1%E8%AA%9E-%E6%BC%A2%E8%AA%9E-%E7%B9%81%E9%AB%94/';


//check if user logined
//cookie_logined,cookie_name
exports.auth=async(cookie_logined,cookie_name)=>{
	if(cookie_logined){
		let user=await User.findOne({account: cookie_name});
		if(user){
			return 200;
		}
		else{
			return 404;
		}
	}
	else{
		return 204;
	}
}

var setname=(member)=>{
	let name=member[0];
	for(let i=1;i<member.length;i++){
		name+=",";
		name+=member[i];
	}
	return name;
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

//input: member(array)
exports.createroom=async(member)=>{
	let num=uuidv4();
	let name=setname(member);
	if(!name){
		console.log("no name at createroom");
		return false;
	}
	if(member.length<=2){
		let new_room=new Room({
			num: num,
			name: name,
			last_msg: Date.now(),
			single: true,
			member: member
		});
		await new_room.save((err)=>{
			if(err){
				console.log("can't save Room at create room");
				return false;
			}
		});
	}
	else{
		let new_room=new Room({
			num: num,
			name: name,
			last_msg: Date.now(),
			single: false,
			member: member
		});
		await new_room.save((err)=>{
			if(err){
				console.log("can't save Room at create room");
				return false;
			}
		});
	}
	init_msg(member,num);
	return num;
}
exports.appendroom=(member,room)=>{
	for(let i=0;i<member.length;i++){
		User.updateOne({account: member[i]},{$push: {rooms: room}},(err)=>{
			if(err){
				console.log(`${member[i]} err at appendroom`);
			}
		})
	}
}
exports.appendfriend=(friend,myname)=>{
	User.updateOne({account: friend},{$push: {friends: myname}},(err)=>{
		if(err){
			console.log("add myname to friend err at appendfriend");
		}
	});
	User.updateOne({account: myname},{$push: {friends: friend}},(err)=>{
		if(err){
			console.log("add friend to myname err at appendfriend");
		}
	});
}

exports.create_crypto=(value,secret)=>{
	let str=crypto.createHmac('sha256',secret).update(value).digest('hex');
	return str;
}

exports.save_msg=async(content,name,room)=>{
	let new_msg=new Message({
		account: name,
		content: content,
		room: room,
		createdate: Date.now(),
		last_read: null
	});
	await new_msg.save((err)=>{
		if(err){
			console.log("save msg error at save_msg");
		}
	});
	await Room.updateOne({num: room},{$set: {last_msg: Date.now()}},(err)=>{
		if(err){
			console.log("error update pwd at chpwd");
		}
	});
	return new_msg;
}

exports.exit_msg=async(room,name)=>{
	let content=name+" has left the room";
	let new_msg=new Message({
		account: "system",
		content: content,
		room: room,
		createdate: Date.now(),
		last_read: null
	});
	await new_msg.save((err)=>{
		if(err){
			console.log("save msg err at exit_msg");
		}
	});
}

var save_voc=async(word,result)=>{
	let new_voc=new Voc({
		word: word,
		content: result
	});
	await new_voc.save((err)=>{
		if(err){
			console.log("can't save voc");
		}
	});
}

var voc_online=(word)=>{
	let url=base_url+word;
	return new Promise((resolve,reject)=>{
		let res=new Object();
		request(url,(err,res,body)=>{
			const $=cheerio.load(body);
			let result=new Object();
			let cnt=[];
	        let def=[];
	        let eg_ex=[];
	        let ch_df=[];
	        let phrase=[];
	        result.part_of_speech=[];
	        let inde;
	        $('#page-content > div.pr.di.superentry > div.di-body > div > div > div').each(async(ind,ele)=>{
	          $('div.posgram.dpos-g.hdib.lmr-5 > span').each((i,el)=>{
	            result.part_of_speech.push($(el).text());
	          })
	          let $2=cheerio.load($(ele).html());
	          $2('div > div.sense-body.dsense_b > div').each((i,el)=>{
	            let $3=cheerio.load($(el).html());
	            $3('span.trans.dtrans.dtrans-se.hdb.break-cj').each((index,elem)=>{
	              cnt.push($(elem).text());
	            });
	            $3('div.ddef_h > div').each((index,elem)=>{
	              def.push($(elem).text());
	            });
	            $3('span.eg.deg').each((index,elem)=>{
	              eg_ex.push($(elem).text());
	            });
	            $3('div.def-body.ddef_b > span').each((index,elem)=>{
	              ch_df.push($(elem).text());
	            });
	            $3('div.phrase-head.dphrase_h').each((index,elem)=>{
	              phrase.push($(elem).text());
	            });
	          });
	          result[ind+"def"]=def;
	          result[ind+"cnt"]=cnt;
	          result[ind+"eg_ex"]=eg_ex;
	          result[ind+"ch_df"]=ch_df;
	          result[ind+"phrase"]=phrase;
	          result.inde=ind;
	          inde=ind;
	          def=[];
	          cnt=[];
	          eg_ex=[];
	          ch_df=[];
	          phrase=[];   
	        });
	        res={word: word,content: result};
			resolve(res);	
		});
	});
			
}

exports.search_voc=async(word)=>{
	let check=await Voc.findOne({word: word});
	if(!check){
		check=await voc_online(word);
		save_voc(word,check.content);
	}
	return check;
}