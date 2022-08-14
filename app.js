//import ws as WebSocketServer;
const WebSocketServer = require('ws');

// Creating a new websocket server
const wss = new WebSocketServer.Server({ port: 8787 })
var player_info_list = [];
var connections = [];

setInterval(() => {
    if (player_info_list.length > 0)
        broadcast_data(JSON.stringify(player_info_list));
}, 30);
// Creating connection using websocket
wss.on("connection", ws => {
    console.log("new client connected");
    //connections.push(ws);
    // sending message
    ws.on("message", data => {
        console.log(`Client has sent us: ${data}`)
        var player_opr;
        try {
            player_opr = JSON.parse(data);
        } catch (error) {
            console.log(error);
            return;
        }
        let current_player = null;
        switch (player_opr.cmd) {
            case "login":
                ws.pid = player_opr.player_id;
                connections.push(ws);
                var new_player_info = {
                    player_id: player_opr.player_id,
                    character: player_opr.character,
                    pos: { x: 100, y: 100 }
                };
                player_info_list.push(new_player_info);
                break;
            case "move":
                current_player = player_info_list.find(p => p.player_id == player_opr.player_id);
                if (current_player) {
                    current_player.pos.x += 4 * Math.cos(player_opr.dir);// * Math.PI / 180
                    current_player.pos.y += 4 * Math.sin(player_opr.dir);
                    //calc new pos
                    //set player_data new pos
                }
                break;
            case "shoot":
                current_player = player_info_list.find(p => p.player_id == player_opr.player_id);
                if (current_player) {
                    current_player.bullet = {
                        type: "normal",
                        dir: player_opr.dir,
                        range: 200
                    }
                }
                break;
            default:
                break;
        }
        // broadcast_data(JSON.stringify(player_info_list));
        // if (current_player && current_player.bullet) {
        //     delete current_player.bullet;
        // }
    });
    // handling what to do when clients disconnects from server
    ws.on("close", () => {
        console.log("the client has disconnected");
        player_info_list = player_info_list.filter(p => p.player_id != ws.pid);
        connections = connections.filter(c => c.pid != ws.pid);
    });
    // handling client connection error
    ws.onerror = function () {
        console.log("Some Error occurred")
    }
});
console.log("The WebSocket server is running on port 8787");

function broadcast_data(data) {
    //console.log(`server broadcast : ${data}`);
    connections.forEach(socket => {
        socket.send(data);
    })
    player_info_list.forEach(p => {
        if (p && p.bullet) {
            delete p.bullet;
        }
    })
}
