import express from 'express';
import moment from 'moment';
//import bodyParser from 'body-parser'
import { Subject } from 'rxjs';


var parser = require('body-parser');
var path = require('path');
var fs = require("fs");
const stream = require('stream');


const cors = require('cors');
const request = require('request');
const chalk = require('chalk');
const log = console.log;


const app = express();
app.use(cors());

app.use(parser.urlencoded({ extended: false }))
app.use(parser.json())

app.use(function (req, res, next) {
    res.locals.userValue = null;
    next();
})

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

const PORT = process.env.PORT || 11000;

const time = new Date()
export const logSubject = new Subject<any>();


const wait = async (t) => {
    return new Promise((res, rej) => {
        setTimeout(() => res({ answer: `${t} seconds passed` }), t * 1000)
    })
}


app.get('/', async (req, res) => {

    console.log('Reached /')
    //set the appropriate HTTP header
    res.setHeader('Content-Type', 'application/json');
    //send multiple responses to the client
    for (let i = 0; i <= 5; i++) {
        await wait(1)
        res.write(JSON.stringify({ no: i }));
    }
    //end the response process
    res.end();
});



app.get('/i', (req, res) => {
    let time = moment().format("MMM Do YY")
    res.render('info', {
        title: 'Info',
        text: 'Log Page',
        time: time
    })
})

const sockets: any[] = []

const sendLog = async (socket) => {
    while (sockets.includes(socket.id)) {
        console.log('sending log')
        let time = moment().format("MMM Do YY hh:mm:ss")
        let s = moment().format('ss')
        logSubject.next({ socket, time, s })
        await wait(1)
    }
}

app.get('/video', function (req, res) {
    const path = 'assets/pigeon.mp4'
    const stat = fs.statSync(path)
    const fileSize = stat.size
    const range = req.headers.range
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1]
            ? parseInt(parts[1], 10)
            : fileSize - 1
        const chunksize = (end - start) + 1
        const file = fs.createReadStream(path, { start, end })
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        }
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        }
        res.writeHead(200, head)
        fs.createReadStream(path).pipe(res)
    }

});

const server = require('http').createServer(app);

const options = { /* ... */ };
const io = require('socket.io')(server, options);

io.on('connect', socket => {

    sockets.push(socket.id)

    logSubject.subscribe((v) => {
        // console.log(v)
        if (socket == v.socket) {
            socket.send({ time: v.time, Id: socket.id, s: v.s })
        }
    });

    logSubject.next({ socketId: socket.id });

    sendLog(socket)

    // either with send()
    socket.send('Welcome!');

    // or with emit() and custom event names

    // handle the event sent with socket.send()
    socket.on('message', (data) => {
        console.log(data);
        if (data == 'stop') {
            sockets.splice(sockets.findIndex(s => s == socket.id), 1)
        }
        if (data == 'start') {
            sockets.push(socket.id)
            sendLog(socket)
        }
    });

    socket.on('stop', (data) => {
        console.log('stopping')
        sockets.splice(sockets.findIndex(s => s == socket.id), 1)
    })
});


server.listen(PORT, () => {
    console.log(`Listening on localhost:${PORT}.`)
})

// app.listen(PORT, () => {
//     console.log(`Listening on localhost:${PORT}.`)
// })