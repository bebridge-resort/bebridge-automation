// Firebase Realtime Database REST API
// 서비스 계정 없이 규칙(.read/.write: true)으로 동작
const axios = require('axios');
require('dotenv').config();

const DB_URL = process.env.FIREBASE_DB_URL;

async function fbSet(path, data) {
  await axios.put(`${DB_URL}/${path}.json`, data);
}

async function fbGet(path) {
  const res = await axios.get(`${DB_URL}/${path}.json`);
  return res.data;
}

async function fbPush(path, data) {
  await axios.post(`${DB_URL}/${path}.json`, data);
}

// 예약 처리 완료 표시
async function markDone(reservationId, detail) {
  await fbSet(`automation/done/${reservationId}`, {
    ...detail,
    at: new Date().toISOString(),
  });
}

// 이미 처리됐는지 확인
async function isDone(reservationId) {
  const data = await fbGet(`automation/done/${reservationId}`);
  return data !== null;
}

// 취소 처리 완료 표시
async function markCancelled(reservationId) {
  await fbSet(`automation/cancelled/${reservationId}`, { at: new Date().toISOString() });
}

async function isCancelled(reservationId) {
  const data = await fbGet(`automation/cancelled/${reservationId}`);
  return data !== null;
}

// 실행 로그
async function log(action, detail) {
  await fbPush('automation/logs', {
    action,
    detail,
    at: new Date().toISOString(),
  });
}

// 오류 로그
async function logErr(id, error) {
  await fbPush('automation/errors', {
    id,
    msg: error.message || String(error),
    at: new Date().toISOString(),
  });
}

module.exports = { markDone, isDone, markCancelled, isCancelled, log, logErr };
