var express=require('express');
var app=express();
var path=require('path');
var cookieSession=require('cookie-session');
const server=require("http").Server(app);
var io=require("socket.io")(server,{
	path:"/chat"
});
const multer=require("multer");

var lib=require("./db/lib");
var apis_controller=require("./apis_controller"); 

var fs = require('fs');
app.set('views', './views'); // specify the views directory
app.set('view engine', 'ejs'); // register the template engine


//socket.io
var socket_connection=require("./socket/socket");
socket_connection(io);

//connect to db
var mongoose=require('mongoose');
mongoose.connect( "mongodb://127.0.0.1:27017/together",{ useNewUrlParser: true,useUnifiedTopology: true,useCreateIndex: true },()=>{
  console.log('connected to mongodb');
});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
var User=require('./db/model_user');
var Note=require("./db/model_note");
const { v4: uuidv4 } = require('uuid');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(cookieSession({
  name:'jizz',
  secret: "infor32nd"
}));

//pages
app.get("/",(req,res,next)=>{
  res.sendFile(__dirname+"/views/index.html");
});
app.get("/login",async(req,res,next)=>{
  let auth=await lib.auth(req.session.logined,req.session.name);
  if(auth===200){
  	res.redirect("/list");
  }
  else{
  	res.sendFile(__dirname+"/views/login.html");
  }
});
app.get("/register",async(req,res,next)=>{
  let auth=await lib.auth(req.session.logined,req.session.name);
  if(auth===200){
  	res.redirect("/list");
  }
  else{
  	res.sendFile(__dirname+"/views/register.html");
  }
});
app.get("/list",async(req,res,next)=>{
	let auth=await lib.auth(req.session.logined,req.session.name);
	if(auth===200){
		let notes=await Note.find({account: req.session.name});
		res.render("list",{notes: notes});
  	}
  	else{
  		res.redirect("/login");
  	}
});
app.get("/modify/:num",async(req,res,next)=>{
	let auth=await lib.auth(req.session.logined,req.session.name);
	if(auth===200){
		let note=await Note.findOne({num: req.params.num});
		if(note.type==="word_sheet"){
			res.render("modify",{note: note});
		}
		else if(note.type==="voc_list"){
			res.render("modify_voc",{note: note});
		}
  	}
  	else{
  		res.redirect("/login");
  	}
});
app.get("/note/:num",async(req,res,next)=>{
	let auth=await lib.auth(req.session.logined,req.session.name);
	if(auth===200){
		let note=await Note.findOne({num: req.params.num});
		if(note.type==="word_sheet"){
			res.render("note",{note: note});
		}
		else if(note.type==="voc_list"){			
			res.render("voc_list",{note: note});
		}
  	}
  	else{
  		res.redirect("/login");
  	}
});
app.get("/chat",async(req,res,next)=>{
  let auth=await lib.auth(req.session.logined,req.session.name);
  if(!req.query.room){  	
  	let num=await apis_controller.redirect_chat(req.session.name);
  	if((num!=404)&&(num!=500)){
  		res.redirect("/chat?room="+num);
  	}
  	else{
  		res.redirect("/login");
  	}
  }
  else if(auth===200){
  	let msg_num;
  	if(!req.session.msg_num){
  		msg_num=0;
  	}
  	res.render("main",{name: req.session.name,room: req.query.room,msg_num: msg_num});
  }
  else{
  	res.redirect("/login");
  }
});
app.get("/settings",async(req,res,next)=>{
	let auth=await lib.auth(req.session.logined,req.session.name);
	if(auth===200){
		res.render("settings",{name: req.session.name});
	}
	else{
		res.redirect("/login");
	}
});
app.get("/logout",(req,res,next)=>{
	req.session.name=null;
	req.session.logined=false;
	res.redirect("/login");
});


//apis
app.post("/login",async(req,res,next)=>{
	let result=204;
	if(req.body.user&&req.body.passwd){
		result=await apis_controller.login(req.body.user,req.body.passwd);
	}	
	if(result===200){
		req.session.logined=true;
		req.session.name=req.body.user;
		res.redirect("/list");
	}
	else if(result===404){
		res.redirect("/register");
	}
	else{
		res.redirect("/login");
	}
});
//something went wrong
app.post("/register",async(req,res,next)=>{
	let result=204;
	if(req.body.user&&req.body.passwd&&req.body.passwd_confirm){
		result=await apis_controller.register(req.body.user,req.body.passwd,req.body.passwd_confirm);
	}
	if(result===200){
		res.redirect("/login");
	}
	else{
		res.redirect("/register");
	}
});
app.post("/chpwd",async(req,res,next)=>{
	let result;
	if(req.body.old_pwd&&req.body.new_pwd&&req.body.new_pwd_again){
		let res_val=await apis_controller.chpwd(req.session.name,req.body.old_pwd,req.body.new_pwd,req.body.new_pwd_again);
		if(res_val===200){
			res.redirect("/logout");
		}
		else{
			res.redirect("/settings");
		}
	}
	else{
		res.redirect("/settings");
	}
});
app.post("/newnote",async(req,res,next)=>{
	if(req.body.sheet){
		let num=await uuidv4();
		let new_note= new Note({
			type: req.body.sheet,
			num: num,
			name: num,
			account: req.session.name,
			content: "",
			createdate: Date.now()
		});
		await new_note.save((err)=>{
			if(err){
				console.log("err at create new note");
			}
		});
		res.redirect("/modify/"+num);
	}
	else{
		res.redirect("/list");
	}
});
app.post("/modify/:num",async(req,res,next)=>{
	if(req.body.acc){
		let note=await Note.findOne({num: req.params.num});
		if(!note){
			console.log("note not exists at modify_post");
			res.redirect("/modify"+req.params.num);
		}
		else if(req.session.name!=note.account){
			console.log("no access to the note at modify_post");
			res.redirect("/modify"+req.params.num);
		}
		else{
			if(note.type==="word_sheet"){
				note.name=req.body.acc;
				note.content=req.body.con;
				await note.save((err)=>{
					if(err){
						console.log(err);
						console.log("can't modify note at post");
					}
				});
			}
			else if (note.type==="voc_list"){
				note.name=req.body.acc;
				note.content=req.body.con;
				await note.save((err)=>{
					if(err){
						console.log(err);
						console.log("can't modify note at post");
					}
				});
			}	
			res.redirect("/note/"+req.params.num);
		}
	}
	else{
		res.redirect("/modify/"+req.params.num);
	}
});
app.post("/search/",async(req,res,next)=>{
	let auth=await lib.auth(req.session.logined,req.session.name);
	if(auth===200){
		if(req.body.word){
			console.log(req.body.word);
			let result=await lib.search_voc(req.body.word);
			//console.log(result);
			res.send(result);
		}
		else{
			console.log("search fail");
		}
  	}
  	else{
  		res.redirect("/login");
  	}
});


server.listen(8080,()=>{
  console.log("listening...");
});


