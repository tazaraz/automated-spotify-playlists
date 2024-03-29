import express from 'express';
import fs from 'fs';
import cors from 'cors';

import api from './api';
import Users from './stores/users';
import Database from './tools/database';
import Fetch from './tools/fetch';
import Updater from './tools/updater';
import Metadata from './stores/metadata';
import Cache from './stores/cache';

const logfile = fs.createWriteStream('output.log', { flags: 'a+' });

export function LOG(...log: any[]){
    return new Promise(resolve => {
        console.error(log.join(' '));
        logfile.write(log.join(' ') + "\n", () => { resolve(true) });
    })
}

export async function LOG_DEBUG(...log: any[]){
    if (process.env.NODE_ENV === "development") {
        return new Promise(resolve => {
            console.log(log.join(' '));
            logfile.write(log.join(' ') + "\n", () => { resolve(true) });
        })
    }
}

export function THROW_DEBUG_ERROR(...log: any[]){
    if (process.env.NODE_ENV === "development") {
        LOG_DEBUG(log);
        try {
            throw new Error(log.join(' '));
        } catch (e) {
            console.error(e.stack);
            throw e;
        }
    }
}

const app       = express();
const database  = new Database();
const fetch     = new Fetch();
const users     = new Users();

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors({ origin: '*' }));
app.disable('x-powered-by'); // Remove "X-Powered-By: Express" header
// Use the API router
app.use('/', api);

(async () => {
    LOG_DEBUG('Connecting to db');
    await Database.connect();
    LOG('Connecting to cache');
    await Cache.connect();
    LOG_DEBUG('Starting updater');
    Updater.schedule();
    LOG_DEBUG('Starting server');
    app.listen(3000, () => {
        LOG_DEBUG('API listening on port 3000');
    });
})();
