const axios = require('axios');
require('dotenv').config();
const DB = process.env.FIREBASE_DB_URL;

const put  = (p, d) => axios.put(`${DB}/${p}.json`, d);
const post = (p, d) => axios.post(`${DB}/${p}.json`, d);
const get  = async p => { const r = await axios.get(`${DB}/${p}.json`); return r.data; };

async function markDone(id, d)   { await put(`automation/done/${id}`, {...d, at: new Date().toISOString()}); }
async function isDone(id)        { return (await get(`automation/done/${id}`)) !== null; }
async function markCancelled(id) { await put(`automation/cancelled/${id}`, {at: new Date().toISOString()}); }
async function isCancelled(id)   { return (await get(`automation/cancelled/${id}`)) !== null; }
async function log(action, d)    { await post('automation/logs', {action, ...d, at: new Date().toISOString()}); }
async function logErr(id, e)     { await post('automation/errors', {id, msg: e.message||String(e), at: new Date().toISOString()}); }

module.exports = { markDone, isDone, markCancelled, isCancelled, log, logErr };
