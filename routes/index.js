﻿//用于生成口令的散列值
var crypto = require('crypto');
var User = require('../models/user');
var Post = require('../models/post');

module.exports = function (app) { 
	app.get('/', checkLogin);
	app.get('/',function(req, res){
		Post.get( null, function (err, posts) { 
			if (err) {  
				posts = []; 
			} 
			res.render('index', {  
				title: '首页', 
				posts: posts
			}); 
		});
	});

	//异步获取名字
	app.get('/getname',function(req,res){
		res.json({"name":"tonytest"});
	})

	app.get('/checkcode',function(req, res){ 
		//res.json({"code":"tonytest"});
		res.writeHead(200, {'Content-Type': 'text/plain'}); 
		//随机生成 1000-9999 之间四位数 
		//10000-1000 = 9000 1000 =< num < 10000
		Math.random()*9000
		var num = Math.random()*9000 + 1000;
		num = parseInt(num, 10);
		req.session.code = num;
		res.end(''+num);
	});

	app.get('/reg', checkNotLogin);
	app.get('/reg',function(req, res){ 
		res.render('reg', { 
			title: '用户注册'
		}); 
	});

	app.post('/reg',checkNotLogin);
	app.post('/reg',function(req,res){
		//检验用户两次输入的口令是否一致
		if(req.body['password-repeat']!=req.body['password']){
			req.flash('error','两次输入的口令不一致');
			return res.redirect('/reg');
		}
		//生成口令的散列
		var md5 = crypto.createHash("md5");
		var password = md5.update(req.body.password).digest('base64');
		var  newUser =  new  User({ 
			name: req.body.username, 
			password: password
		}); 
   
		//检查用户名是否已经存在 
		User.get(newUser.name, function (err, user) { 
			if (user) 
				err = 'Username already exists.'; 
			if (err) { 
				req.flash('error', err); 
				return res.redirect('/reg'); 
			} 

			// 如果不存在则新增用户 
			newUser.save(function (err) { 
				if (err) { 
					req.flash('error', err); 
					return  res.redirect('/reg'); 
				} 
				req.session.user = newUser; 
				req.flash('success', ' 注册成功'); 
				res.redirect('/'); 
			});
		}); 
	});
	
	app.get('/login', checkNotLogin);
	app.get('/login',  function (req, res) { 
		res.render('crm-login', { 
			title: '用户登入', 
			layout: false
		}); 
	});

	//app.post('/login',checkNotLogin);
	app.post('/loginin', function (req, res) { 
		//生成口令的散列值 
		var  md5 = crypto.createHash('md5'); 
		var  password = md5.update(req.body.password).digest('base64'); 
   
		User.get(req.body.name, function (err, user) { 
			if(req.body.yanzheng != req.session.code) {
				res.json({'status': 1, 'info':'验证码错误'});
				return;
			}
			if (!user) { 
				req.flash('error', ' 用户不存在'); 
				res.json({'status': 1, 'info':'用户不存在'});
				return;
				//return  res.redirect('/login'); 
			} 
			if (user.password != password) { 
				req.flash('error', ' 用户口令错误'); 
				res.json({'status': 1, 'info':'用户口令错误'});
				return;
				//return  res.redirect('/login'); 
			} 
			req.session.user = user; 
			req.flash('success', ' 登入成功'); 
			res.json({'status': 0});
			//res.redirect('/'); 

		}); 
	});
	
	app.get('/logout',checkLogin);
	app.get('/logout', function (req, res) { 
		req.session.user =  null; 
		req.flash('success', '登出成功'); 
		res.redirect('/'); 
	});

	//发表微博
	app.post('/post', checkLogin); 
	app.post('/post',  function (req, res) { 
		var  currentUser = req.session.user; 
		var  post =  new  Post(currentUser.name, req.body.post); 
		post.save(function (err) { 
			if (err) { 
				req.flash('error', err); 
				return  res.redirect('/'); 
			} 
			req.flash('success', ' 发表成功'); 
			res.redirect('/u/' + currentUser.name); 
		}); 
	});

	//用户页面
	app.get('/u/:user', function (req, res) { 
		User.get(req.params.user,  function (err, user) { 
			if (!user) { 
				req.flash('error', ' 用户不存在'); 
				return  res.redirect('/'); 
			} 
			Post.get(user.name, function (err, posts) { 
				if (err) { 
					req.flash('error', err); 
					return  res.redirect('/'); 
				} 
				res.render('user', { 
					title: user.name, 
					posts: posts
				}); 
			}); 
		}); 
	});

	//找回密码
	app.get('/getPwd',checkNotLogin);
	app.get('/getPwd',function(req,res){
		res.render('getpwd', { 
			title: '密码找回', 
		}); 
	})

	app.post('/getPwd',checkNotLogin);
	app.post('/getPwd',function(req,res){
		User.get(req.body.username, function (err, user) { 
			if (!user) { 
				req.flash('error', ' 用户不存在'); 
				return  res.redirect('/getPwd'); 
			} 
			req.flash('success', '成功找回密码:'+user.password); 
			res.redirect('/login'); 
		}); 
	})
}

function  checkLogin(req, res, next) { 
	if (!req.session.user) { 
		req.flash('error', '未登入'); 
		return  res.redirect('/login'); 
	} 
	next(); 
}
 
function checkNotLogin(req, res, next) { 
	if (req.session.user) { 
		req.flash('error', '已登入'); 
		return res.redirect('/'); 
	} 
	var url = req.originalUrl;
	if(url != '/login' && url != '/reg') {
        return res.redirect("/login");
    };
	next();
}