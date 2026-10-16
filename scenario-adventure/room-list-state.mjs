// Display policy follows the existing server join gate; members may reconnect.
export function roomListState(room){
 const playing=room.status==='PLAYING',full=room.memberCount>=room.maxPlayers;
 const state=playing?'playing':full?'full':room.status==='WAITING'?'open':'closed';
 const badge=playing?'◷ กำลังเล่น · รอจบเกม':full?'⊘ ห้องเต็ม':state==='open'?(room.requiresPassword?'🔒 มีที่ว่าง · ต้องใช้รหัสผ่าน':'✓ มีที่ว่าง · เข้าร่วมได้'):'◷ จบเกมแล้ว · รอเจ้าของจัดห้อง';
 return {state,badge,button:room.isMember?'กลับเข้าห้องนี้':playing?'กำลังเล่น · ยังเข้าร่วมไม่ได้':full?'ห้องเต็ม':state==='open'?'เข้าร่วม':'รอเจ้าของจัดห้อง',canEnter:Boolean(room.isMember)||state==='open'};
}
