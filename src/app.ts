import { Console } from "console";

//import ws as WebSocketServer;
const WebSocketServer = require('ws');

// Creating a new websocket server
const wss = new WebSocketServer.Server({
    port: 8787
})
interface PlayerOperation {
    cmd: string;
    player_id: string;
    character: string;
    x: number;
    y: number;
    dir: number;
}
interface Position {
    x: number;
    y: number;
}
interface PlayerInfo {
    player_id: string;
    character: string;
    pos: Position;
    health: number;
}
interface Bullet{
    init_pos: Position;
    pos: Position;
    dir: number;
    player_id: string;
}
///////////////////constant//////////////////
var bullet_speed = 10;
var player_speed = 4;
var bullet_damage = 20;
var bullet_range = 300;
var update_interval = 30;
/////////////////////////////////////////////
//var player_info_list: PlayerInfo[] = [];
var connections: any[] = [];
//var bullets: Bullet[] = [];
interface ServerCommand { player_id: string;  name: "died" | "quit" }
interface GlobalData{
    players: PlayerInfo[];
    bullets: Bullet[];
    srv_cmds: ServerCommand [];
}
var all_data: GlobalData = { players: [], bullets: [], srv_cmds:[] };

function distance(pos1: Position, pos2: Position): number {
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.x - pos2.x, 2));
}
function moveto(from: Position, dir: number, steps: number): Position {
    var newpos: Position = Object.assign({}, from);
    newpos.x += steps * Math.cos(dir);
    newpos.y += steps * Math.sin(dir);
    return newpos;
}

setInterval(update, update_interval);
var last_sent = "";
function update() {
    for (let i = 0; i < all_data.bullets.length; i++) {
        let b = all_data.bullets[i];
        b.pos = moveto(b.pos, b.dir, bullet_speed);
        
        if (distance(b.pos, b.init_pos) > bullet_range) {
            all_data.bullets.splice(i, 1);
            continue;
        }
        let collision = false;
        let j = 0;
        for (let p of all_data.players) {
            if (p.player_id != b.player_id && distance(p.pos, b.pos) < 10) {
                p.health -= bullet_damage;
                if (p.health <= 0) {
                    all_data.players.splice(j, 1);
                    let cmd: ServerCommand = { player_id: p.player_id, name: "died" };
                    all_data.srv_cmds.push(cmd);
                }
                collision = true;
                break;
            }
            j++;
        }
        if (collision) {
            all_data.bullets.splice(i, 1);
        }
    }
    let to_send = JSON.stringify(all_data);
    if(last_sent!=to_send) {
        broadcast_data(JSON.stringify(all_data));
        all_data.srv_cmds = [];
        last_sent = to_send;
    }
}
// Creating connection using websocket
wss.on("connection", (ws: any) => {
    console.log("new client connected");
    //connections.push(ws);
    // sending message
    ws.on("message", (data: string) => {
        //console.log(`Client has sent us: ${data}`);
        var player_opr: PlayerOperation;
        try {
            player_opr = JSON.parse(data);
        } catch (error) {
            console.log(error);
            return;
        }
        let current_player = null;
        switch (player_opr.cmd) {
            case "login":
                console.log(JSON.stringify(player_opr));
                ws.pid = player_opr.player_id;
                connections.push(ws);
                let new_player_info: PlayerInfo = {
                    player_id: player_opr.player_id,
                    character: player_opr.character,
                    health: 100,
                    pos: {x: 100,y: 100}
                };
                all_data.players.push(new_player_info);
                //console.log(new_player_info);
                //console.log(JSON.stringify(all_data));
                break;
            case "move":
                current_player = all_data.players.find(p => p.player_id == player_opr.player_id);
                if (current_player) {
                    current_player.pos = moveto(current_player.pos, player_opr.dir, player_speed);
                }
                break;
            case "shoot":
                current_player = all_data.players.find(p => p.player_id == player_opr.player_id);
                if (current_player) {
                    let new_bullet: Bullet = {
                        init_pos: Object.assign({}, current_player.pos),
                        pos: Object.assign({}, current_player.pos),
                        dir: player_opr.dir,
                        player_id: current_player.player_id
                    }
                    all_data.bullets.push(new_bullet);
                }
                break;
            default:
                break;
        }
    });
    // handling what to do when clients disconnects from server
    ws.on("close", () => {
        console.log("the client has disconnected");
        all_data.players = all_data.players.filter(p => p.player_id != ws.pid);
        connections = connections.filter(c => c.pid != ws.pid);
    });
    // handling client connection error
    ws.onerror = function () {
        console.log("Some Error occurred")
    }
});
console.log("The WebSocket server is running on port 8787");

function broadcast_data(data: string) {
    //console.log(`server broadcast : ${data}`);
    connections.forEach(socket => {
        socket.send(data);
    });
}