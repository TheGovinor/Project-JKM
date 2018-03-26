console.log("Running Main");

var express = require('express');
var app = express();
var serv = require ('http').Server(app);

app.get('/', function(req, res){
   res.sendFile(__dirname + '/client/index.html'); 
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(2000);
console.log('server started')

var SOCKET_LIST = {};

var Entity = function(param) {
    var self = {
        x:250,
        y:250,
        spdX:0,
        spdY:0,
        id:"",
        map:'test',
        
    }
    if(param)
    {
        if (param.x)
            self.x = param.x;
        if(param.y)
            self.y = param.y;
        if(param.map)
            self.map = param.map;
        if(param.id)
            self.id = param.id;
    }
    
    
    self.update = function(){
        self.updatePosition();
    }
    self.updatePosition = function(){
        self.x += self.spdX;
        self.y += self.spdY;
    }
    self.getDistance = function(pt){
        return Math.sqrt(Math.pow(self.x-pt.x,2)+Math.pow(self.y-pt.y,2));
    }
    return self;
}

var Player = function(param){
    var self = Entity(param);
    self.number = "" + Math.floor(10 * Math.random());
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.pressingAttack = false;
    self.mouseAngle = 0;
    self.maxSpd = 4;
    self.hp = 5;
    self.hpMax = 5;
    self.score = 0;
    self.usingMelee=true;
    self.dirX = 0;
    self.dirY = 0;
    self.cooldown = 0;
    self.timeToCharge = 2 * 1000/60;

    var super_update = self.update;
    self.update = function(){
        self.updateSpd();
        self.updateCooldown();
        super_update();   
        if(self.pressingAttack && self.cooldown === 0)
        { 
            var timeToFire = 0;
            if(self.usingMelee === false)
            {
                if(timeToFire < self.timeToCharge)
                {
                    self.fireProjectile(self.mouseAngle); 
                    self.cooldown = 10; 
                }
                else 
                    timeToFire +=1;
                      
            }
            else if(self.usingMelee === true)
            {
                self.meleeAttack();
                self.cooldown = 10;
            }
        }
    }
    self.updateCooldown = function()
    {
        if (self.cooldown != 0)
        {
            self.cooldown -= 1;
        }
    }
    self.updateSpd = function() {
        if(self.pressingRight)
            self.spdX = self.maxSpd;
        else if (self.pressingLeft)
            self.spdX = -self.maxSpd;
        else 
            self.spdX = 0;
        if(self.pressingUp)
            self.spdY = -self.maxSpd;
        else if (self.pressingDown)
            self.spdY = self.maxSpd;
        else
            self.spdY = 0;
        if(self.pressingUse)
        {
            var use = function(){

            }
        }    
    }
    self.updateDirection = function()
    {
        if(self.spdX > 0)
        {
            self.dirX = 1;
            self.dirY = 0;
        }
        else if (self.spdX < 0)
        {
            self.dirX = -1;
            self.dirY = 0;
        }
        else if (self.dirY < 0)
        {
            self.dirX = 0;
            self.dirY = 1;
        }
        else if (self.spdY > 0)
        {
            self.dirX = 0;
            self.dirY = -1;
        }             
    }
    self.meleeAttack = function(){

    }

    self.fireProjectile = function(angle){
        Projectile({
            
            parent:self.id,
            angle:angle,
            x:self.x,
            y:self.y,
            map:self.map
        })
    }

    self.getInitPack = function() {
        return {
            id:self.id,
			x:self.x,
			y:self.y,	
			number:self.number,	
			hp:self.hp,
			hpMax:self.hpMax,
			score:self.score,
			map:self.map,
        };
    }
    self.getUpdatePack = function(){
        return {
            id:self.id,
			x:self.x,
			y:self.y,
			hp:self.hp,
			score:self.score,
        }  
    }

    Player.list[self.id] = self;
    
    initPack.player.push(self.getInitPack());
    return self;
}
Player.list = {};
Player.onConnect = function(socket)
{
    var map = 'test';
    //set function to change map here
    var player = Player({
        id:socket.id,
        map:map,
    });
    
    socket.on('keyPress',function(data)
    {
        if(data.inputId === 'left')
            player.pressingLeft = data.state;
        else if(data.inputId === 'right')
            player.pressingRight = data.state;
        else if(data.inputId === 'up')
            player.pressingUp = data.state;
        else if(data.inputId === 'down')
            player.pressingDown = data.state;
        else if(data.inputId === 'use')
            player.pressingUse = data.state;
        else if(data.inputId === 'attack')
            player.pressingAttack = data.state;
        else if(data.inputId === 'melee')
            player.usingMelee = data.state;
        else if(data.inputId === 'mouseAngle')
            player.mouseAngle = data.state;
        player.updateDirection();
    });
    socket.emit('init',{
        selfId:socket.id,
        player:Player.getAllInitPack(),
        projectile:Projectile.getAllInitPack(),
    })
}
Player.getAllInitPack = function(){
    var players = [];
    for(var i in Player.list)
        players.push(Player.list[i].getInitPack());
    return players;
}
Player.onDisconnect = function(socket){
    delete Player.list(socket.id);
    removePack.player.push(socket.id);
}
Player.update = function(){
    var pack = [];
    for(var i in Player.list){
        var player = Player.list[i];
        player.update();
        pack.push(player.getUpdatePack());    
    }
    return pack
}

var Melee = function(direction){

}

var Projectile = function(param)
{
    var self = Entity(param);
    self.id = Math.random();
    self.angle = param.angle;
    self.spdX = Math.cos(param.angle/180*Math.PI) * 10;
    self.spdY = Math.sin(param.angle/180*Math.PI) * 10;
    self.parent = param.parent;

    self.timer = 0;
    self.toRemove = false;
    var super_update = self.update;
    self.update = function(){
        if(self.timer++ > 100)
            self.toRemove = true;
        super_update();

        for (var i in Player.List)
        {
            var p = Player.list[i];
            if(self.map === p.map && self.getDistance(p)< 32 && self.parent !== p.id){
                p.hp -= 1;               
                if(p.hp <= 0){
                    var shooter = Player.list[self.parent];
                    if(shooter)
                        shooter.score += 1;
                    p.hp = p.hpMax;
                    p.x = Math.random() * 500;
                    p.y = Math.random() * 500;                 
                }
                //hand collision
                self.toRemove = true;
            }
        }
    }
    self.getInitPack = function() 
    {
        return {
            id:self.id,
            x:self.x,
            y:self.y,
            map:self.map,
        };
    }
    self.getUpdatePack = function()
    {
        return {
            id:self.id,
            x:self.x,
            y:self.y,
        };
    }

    Projectile.list[self.id] = self;
    initPack.projectile.push(self.getInitPack());
    return self;
}
Projectile.list = {};

Projectile.update = function()
{  
    var pack = [];
    for(var i in Projectile.list)
    {
        var projectile = Projectile.list[i];
        projectile.update();
        if(projectile.toRemove)
        {
            delete Projectile.list[i];
            removePack.projectile.push(projectile.id);
        }
        else
        {
            pack.push(projectile.getUpdatePack());    
        }
    }
    return pack;
}
Projectile.getAllInitPack = function(){
    var projectiles = [];
    for(var i in Projectile.list)
        projectiles.push(Projectile.list[i].getInitPack());
    return projectiles;
}

var DEBUG = true;

var Users = {
    //username:password
    "admin":"jkm",
    
}

var isValidPassword = function(data, cb){
    setTimeout(function()
    {
        cb(Users[data.username] === data.password);
    }, 10);
}
var isUsernameTaken = function(data, cb){
    setTimeout(function()
    {
        cb(Users[data.username]);
    }, 10);
}
var addUser = function(data, cb){
    setTimeout(function()
    {
        Users[data.username] = data.password;
        cb();
    }, 10);
}

var io = require ('socket.io') (serv,{});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    if(Player.list.length >= 4)
    {
        console.log('server is full');
    }
        
    SOCKET_LIST[socket.id] = socket;

    
    socket.on('signIn', function(data){
        isValidPassword(data, function(res){
            if(res)
            {
                Player.onConnect(socket);
                socket.emit('signInResponse', {success:true});
            }
            else{
                socket.emit('signInResponse', {success:false});
            }  
        });
        
    });
    socket.on('signUp',function(data){
		isUsernameTaken(data,function(res){
			if(res){
				socket.emit('signUpResponse',{success:false});		
			} else {
				addUser(data,function(){
					socket.emit('signUpResponse',{success:true});					
				});
			}
		});		
	});

    
    socket.on('diconnect', function(){
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);
        
    });
    socket.on('sendMsgToServer',function(data)
    {
        var playerName = ("" + socket.id).slice(2,7);
        for(var i in SOCKET_LIST){
            SOCKET_LIST[i].emit('addToChat',playerName + ': ' + data);
        }
    });
    socket.on('evalServer',function(data)
    {
        if(!DEBUG)
            return;
        var ev = eval(data);
        socket.emit('evalAnswer', ev);
    });
    
});

var initPack = {player:[], projectile:[]};
var removePack = {player:[], projectile:[]};

setInterval(function(){
    var pack = {
        player:Player.update(),
        projectile:Projectile.update(),
    }
    
    for(var i in SOCKET_LIST)
    {
        var socket = SOCKET_LIST[i];
        socket.emit('update',pack);
        socket.emit('init',initPack);
        socket.emit('remove',removePack);
    }
    initPack.player = [];
    initPack.projectile = [];
    removePack.player = [];
    removePack.projectile = [];
        
}, 1000/60);



