import express from 'express';
//import bodyParser from 'body-parser'
import { Subject } from 'rxjs';


var parser = require('body-parser');
var path = require('path');
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

    res.render('info', {
        title: 'Info',
        text: 'This is info',
        time: '4:20'
    })
})

app.get('/c', (req, res) => {

    // Combine styled and normal strings
    log(chalk.blue('Hello') + ' World' + chalk.red('!'));

    // Compose multiple styles using the chainable API
    log(chalk.blue.bgRed.bold('Hello world!'));

    // Pass in multiple arguments
    log(chalk.blue('Hello', 'World!', 'Foo', 'bar', 'biz', 'baz'));

    // Nest styles
    log(chalk.red('Hello', chalk.underline.bgBlue('world') + '!'));

    // Nest styles of the same type even (color, underline, background)
    log(chalk.green(
        'I am a green line ' +
        chalk.blue.underline.bold('with a blue substring') +
        ' that becomes green again!'
    ));

    res.send('Chalk')
})

const server = require('http').createServer(app);

const options = { /* ... */ };
const io = require('socket.io')(server, options);

io.on('connect', socket => {

    logSubject.subscribe({
        next: (v) => socket.send(v)
    });
    // logSubject.subscribe({
    //     next: (v) => socket.send(`observerB: ${v}`)
    // });

    logSubject.next(socket.id);
    logSubject.next(2);

    // either with send()
    socket.send('Hello!');

    // or with emit() and custom event names
    socket.emit('greetings', 'Hey!', { 'ms': 'jane' }, Buffer.from([4, 3, 3, 1]));

    // handle the event sent with socket.send()
    socket.on('message', (data) => {
        console.log(data);
    });

    // handle the event sent with socket.emit()
    socket.on('salutations', (elem1, elem2, elem3) => {
        console.log(elem1, elem2, elem3);
    });
});

server.listen(PORT, () => {
    console.log(`Listening on localhost:${PORT}.`)
})

// app.listen(PORT, () => {
//     console.log(`Listening on localhost:${PORT}.`)
// })