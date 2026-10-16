import test from 'node:test';
import assert from 'node:assert/strict';
import {roomListState} from './scenario-adventure/room-list-state.mjs';
const room={status:'WAITING',memberCount:1,maxPlayers:2,isMember:false};
test('vacancy is green/open including password rooms',()=>{for(const requiresPassword of [false,true]){const s=roomListState({...room,requiresPassword});assert.equal(s.state,'open');assert.equal(s.canEnter,true);assert.match(s.badge,/มีที่ว่าง/);}});
test('full waiting room is red and blocked',()=>{const s=roomListState({...room,memberCount:2});assert.equal(s.state,'full');assert.equal(s.canEnter,false);assert.match(s.button,/เต็ม/);});
test('playing overrides full and blocks new joiners',()=>{for(const memberCount of [1,2]){const s=roomListState({...room,status:'PLAYING',memberCount});assert.equal(s.state,'playing');assert.equal(s.canEnter,false);assert.match(s.badge,/รอจบเกม/);}});
test('existing members can reconnect to full or playing rooms',()=>{for(const status of ['WAITING','PLAYING','FINISHED']){const s=roomListState({...room,status,memberCount:2,isMember:true});assert.equal(s.canEnter,true);assert.equal(s.button,'กลับเข้าห้องนี้');}});
test('finished vacancy does not falsely promise a join unsupported by server',()=>{const s=roomListState({...room,status:'FINISHED'});assert.equal(s.state,'closed');assert.equal(s.canEnter,false);assert.match(s.button,/รอเจ้าของ/);});
