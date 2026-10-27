(function(){
/* ================= Road to Life: party game =================
   One screen hosts (a TV, laptop or phone everyone can see). Phones join with the room code.
   The host holds the game; phones send what they tap and get the whole game back.
   Phones connect to the host directly (WebRTC through PeerJS), so no server or account is needed. */

/* ---------------- data ---------------- */
var DECKS=[
 {id:'lot',n:1,name:'Cast Your Lot',c:'#FF7F00',t:'#fff',art:'art/lot.jpg',slot:[320,343,111,151]},
 {id:'so',n:2,name:'Is That Really So?',c:'#C90018',t:'#fff',art:'art/so.jpg',slot:[446,343,111,151]},
 {id:'last',n:3,name:'The First Shall Be Last',c:'#58A410',t:'#fff',art:'art/last.jpg',slot:[573,343,112,151]},
 {id:'written',n:4,name:'For It Is Written',c:'#A3DEFF',t:'#12305C',art:'art/written.jpg',slot:[387,510,111,151]},
 {id:'dumb',n:5,name:'Remain Dumb',c:'#AC1FAC',t:'#fff',art:'art/dumb.jpg',slot:[514,510,111,151]}
];
var PATCH={lot:'#FDD6A6',so:'#FDD6A9',last:'#FFDDB7',written:'#FFD4A7',dumb:'#FFD4A8'};
var DK={};DECKS.forEach(function(d){DK[d.id]=d;var cx=d.slot[0]+d.slot[2]/2,cy=d.slot[1]+d.slot[3]/2,H=152,W=Math.round(H*9/16);d.card=[cx-W/2,cy-H/2-3,W,H]});
var TEAMC={0:'var(--ink-soft)',1:'var(--t1)',2:'var(--t2)'};
var TEAMHEX={1:['#13939E','#0A5C64'],2:['#B8366E','#731B41']};
var LENS={short:10,standard:16,long:24};
var PREFIX='roadtolife-jw-';
var SITE=/^https?:/.test(location.protocol)?location.origin+location.pathname.replace(/index\.html$/,''):'https://jwmap3.github.io/ROADTOLIFE/';
var EMBED=!!window.RTL_SEED;
var DISPLAY=!!window.RTL_DISPLAY;   // the TV picture the phone app sends to a cast screen
var CODECHARS='BCDFGHJKLMNPQRSTVWXZ';
var $=function(id){return document.getElementById(id)};
function h(tag,attrs,kids){var e=document.createElement(tag);if(attrs)for(var k in attrs){var v=attrs[k];if(v==null||v===false)continue;if(k==='text')e.textContent=v;else if(k==='on'){for(var ev in v)e.addEventListener(ev,v[ev])}else if(k==='style')e.style.cssText=v;else e.setAttribute(k,v===true?'':v)}(kids||[]).forEach(function(c){if(c)e.appendChild(typeof c==='string'?document.createTextNode(c):c)});return e}
var SVGNS='http://www.w3.org/2000/svg';
function s(tag,attrs,kids){var e=document.createElementNS(SVGNS,tag);for(var k in attrs||{})e.setAttribute(k,attrs[k]);(kids||[]).forEach(function(c){if(c)e.appendChild(c)});return e}
function load(k,f){try{var v=localStorage.getItem(k);return v?JSON.parse(v):f}catch(e){return f}}
function save(k,v){if(window.RTL_DISPLAY)return;try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function shuffled(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
function rid(){return Math.random().toString(36).slice(2,10)}
function makeCode(){var c='';for(var i=0;i<4;i++)c+=CODECHARS[Math.floor(Math.random()*CODECHARS.length)];return c}
function toast(msg){var t=$('toast');t.textContent=msg;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove('on')},2600)}
function isWho(c){return !!c&&/^\s*who am i\??/i.test(c.prompt||'')}
function hintsOf(c){var p=String(c.prompt||'').replace(/^\s*who am i\??\s*/i,'');return p.split(/(?:^|\n)\s*\d+\s*\.\s*/).map(function(x){return x.trim()}).filter(Boolean)}
// Remain Dumb and Is That Really So? cards are private: only the person who drew one sees what is on it
function secret(c){return !!c&&(c.deck==='dumb'||c.deck==='so')&&G.hideDumb!==false}
function reduced(){return matchMedia('(prefers-reduced-motion:reduce)').matches}

/* ---------------- road path traced over the printed board (1000 x 1000) ---------------- */
var WP=[[152,460],[215,508],[255,546],[287,584],[298,640],[262,700],[300,740],[378,801],[443,831],[520,875],[610,905],[702,915],[770,875],[800,815],[788,750],[752,700],[722,660],[742,618],[778,600],[812,572],[818,528],[790,480],[758,440],[786,418],[818,398],[825,345]];
var CURVE=(function(pts,n){var out=[],P=[pts[0]].concat(pts,[pts[pts.length-1]]);for(var i=1;i<P.length-2;i++){var p0=P[i-1],p1=P[i],p2=P[i+1],p3=P[i+2];for(var k=0;k<n;k++){var t=k/n,t2=t*t,t3=t2*t;out.push([0,1].map(function(j){return .5*(2*p1[j]+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3)}))}}out.push(pts[pts.length-1]);return out})(WP,24);
var CL=[0];for(var ci=1;ci<CURVE.length;ci++)CL.push(CL[ci-1]+Math.hypot(CURVE[ci][0]-CURVE[ci-1][0],CURVE[ci][1]-CURVE[ci-1][1]));
var LTOT=CL[CL.length-1];
function at(d){d=Math.max(0,Math.min(LTOT,d));var lo=0,hi=CL.length-1;while(hi-lo>1){var m=(lo+hi)>>1;if(CL[m]<d)lo=m;else hi=m}var f=(d-CL[lo])/((CL[hi]-CL[lo])||1);var a=CURVE[lo],b=CURVE[hi];return {x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f,dx:b[0]-a[0],dy:b[1]-a[1]}}
function spaceD(i,n){return LTOT*i/n}

/* ---------------- state ---------------- */
var myId=load('rtl.cid',null);if(!myId){myId='p'+rid();save('rtl.cid',myId)}
var me=DISPLAY?{team:0,name:'TV',tv:true}:load('rtl.me',null);   // {team:0|1|2,name}
var role=DISPLAY?'display':load('rtl.role',null);  // 'host' | 'client' | 'local' | 'display' | null
var code=load('rtl.code',null);
var baseCards={},myCards=load('rtl.mycards',{}),cards={};
var piles=load('rtl.piles',{});
var G=load('rtl.game',null)||newGame();
function newGame(){return {e:rid(),v:0,phase:'lobby',mode:'digital',len:'standard',players:[],turn:{team:1,idx:{1:0,2:0}},pos:{1:0,2:0},score:{1:0,2:0},card:null,roll:null,hints:1,timer:null,anim:null,result:null,winner:null,dice:'digital',hideDumb:true}}
function N(){return LENS[G.len]||16}
function amHost(){return role==='host'||role==='local'}
function isTV(){return (role==='client'||role==='display')&&!!me&&!!me.tv}
function realDie(){return G.mode!=='digital'||G.dice==='real'}
function teamPlayers(t){return G.players.filter(function(p){return p.team===t})}
function activePlayer(){var l=teamPlayers(G.turn.team);return l.length?l[G.turn.idx[G.turn.team]%l.length]:null}
function iAmActor(){
  if(role==='local')return true;
  var ap=activePlayer();
  if(ap&&!ap.manual&&ap.id!==myId&&!(amHost()&&ap.off))return false;
  if(ap&&ap.id===myId)return true;
  if(amHost())return true;                       // host acts for players without a phone
  return !ap&&me&&me.team===G.turn.team;
}
// Is this device the drawer's own private phone? A screen everyone can see never counts:
// the host screen only counts when the Android app is sending a separate picture to the TV.
function iDrew(){var ap=activePlayer();if(!ap||ap.id!==myId)return false;if(role==='client')return !isTV();if(role==='host')return hubOn;return false}
function actorName(){var ap=activePlayer();return ap?ap.name:('Team '+G.turn.team)}

/* ---------------- cards ---------------- */
function sameCard(x,y){return !!x&&!!y&&x.deck===y.deck&&x.prompt===y.prompt&&String(x.answer||'')===String(y.answer||'')&&String(x.note||'')===String(y.note||'')&&JSON.stringify(x.options||[])===JSON.stringify(y.options||[])}
function mergeCards(){
  if(EMBED){cards=load('rtl.local',{})||{};return}
  cards={};Object.keys(baseCards).forEach(function(k){cards[k]=baseCards[k]});Object.keys(myCards).forEach(function(k){if(myCards[k]&&myCards[k].deleted)delete cards[k];else cards[k]=myCards[k]});
}
function loadCards(){
  if(EMBED){
    // the phone app keeps its own card list (including cards added on the phone); bring in new and corrected cards without touching the phone's own
    var store=load('rtl.local',null)||{},seen=load('rtl.seeded',{})||{},seed=window.RTL_SEED||{},old=window.RTL_OLD||{};
    Object.keys(seed).forEach(function(k){
      if(!store[k]){if(!seen[k])store[k]=seed[k]}
      else if(old[k]&&sameCard(store[k],old[k]))store[k]=seed[k];
      seen[k]=1;
    });
    save('rtl.local',store);save('rtl.seeded',seen);cards=store;return;
  }
  fetch('cards.json',{cache:'no-cache'}).then(function(r){return r.json()}).then(function(j){baseCards=j||{};save('rtl.basecards',baseCards);mergeCards();if(sheetView==='cards')openCards()})
  .catch(function(){baseCards=load('rtl.basecards',{});mergeCards()});
}
function saveCard(id,data){if(EMBED){cards[id]=data;save('rtl.local',cards)}else{myCards[id]=data;save('rtl.mycards',myCards);mergeCards()}}
function deleteCard(id){if(EMBED){delete cards[id];save('rtl.local',cards)}else{myCards[id]={deleted:true};save('rtl.mycards',myCards);mergeCards()}}
baseCards=load('rtl.basecards',{});mergeCards();
function idsOf(deck){return Object.keys(cards).filter(function(id){return cards[id]&&cards[id].deck===deck})}
function drawFrom(deck){
  var p=(piles[deck]||[]).filter(function(id){return cards[id]});
  if(!p.length)p=shuffled(idsOf(deck));
  if(!p.length)return null;
  var id=p.pop();piles[deck]=p;save('rtl.piles',piles);
  var c=cards[id];return {id:id,deck:c.deck,prompt:c.prompt,options:c.options||[],answer:c.answer||'',note:c.note||'',k:rid()};
}

/* ---------------- host: the rules ---------------- */
function commit(){G.v++;save('rtl.game',G);broadcast();hubPush();render();if(sheetView==='settings'&&settingsPaint)settingsPaint()}
function handle(from,a){
  if(!a||typeof a!=='object')return;
  var isHost=from===myId;
  var ap=activePlayer();
  var actorOK=isHost||(ap?ap.id===from:playerTeam(from)===G.turn.team);
  switch(a.t){
    case 'mode': if(!isHost)return;if(a.mode==='board'||a.mode==='digital')G.mode=a.mode;if(LENS[a.len])G.len=a.len;if(a.dice==='digital'||a.dice==='real')G.dice=a.dice;if(typeof a.hideDumb==='boolean')G.hideDumb=a.hideDumb;break;
    case 'start': if(!isHost)return;G.pos={1:0,2:0};G.score={1:0,2:0};G.turn={team:1,idx:{1:0,2:0}};G.winner=null;G.result=null;G.card=null;G.roll=null;G.anim=null;G.timer=null;G.phase='turn';break;
    case 'lobby': if(!isHost)return;G.phase='lobby';G.card=null;G.roll=null;G.timer=null;G.result=null;break;
    case 'addp': if(!isHost)return;G.players.push({id:'m'+rid(),name:String(a.name).slice(0,24),team:a.team===2?2:1,manual:true});break;
    case 'delp': if(!isHost)return;G.players=G.players.filter(function(p){return p.id!==a.id});break;
    case 'roll': case 'pick':
      if(!actorOK||G.phase!=='turn')return;
      if(a.t==='roll'&&!(G.mode==='digital'&&G.dice!=='real'))return;
      var n=a.t==='roll'?1+Math.floor(Math.random()*5):Number(a.n);var d=DECKS[n-1];if(!d)return;
      var c=drawFrom(d.id);if(!c){toast(d.name+' has no cards yet');return}
      G.roll={n:n,deck:d.id,k:rid(),dice:a.t==='roll'};G.card=c;G.hints=1;G.timer=null;G.result=null;G.phase='card';break;
    case 'skip': if(!actorOK||G.phase!=='card')return;var c2=drawFrom(G.card.deck);if(!c2)return;G.card=c2;G.hints=1;G.roll={n:DK[c2.deck].n,deck:c2.deck,k:rid(),dice:false,skip:true};break;
    case 'hint': if(!actorOK||G.phase!=='card'||!isWho(G.card))return;G.hints=Math.min(hintsOf(G.card).length,G.hints+1);break;
    case 'timer': if(!actorOK)return;var dur=Math.max(0,Math.min(600,Number(a.dur)||0));G.timer=dur?{dur:dur,end:Date.now()+dur*1000,k:rid()}:null;break;
    case 'judge':
      if(!actorOK||G.phase!=='card')return;
      var t=G.turn.team,steps=0;
      if(a.right){steps=isWho(G.card)?Math.max(1,hintsOf(G.card).length-G.hints+1):1;G.score[t]+=1}
      var from=G.pos[t],to=G.mode==='digital'?Math.min(N(),from+steps):from;
      G.pos[t]=to;G.anim={team:t,from:from,to:to,k:rid(),right:!!a.right};
      G.result={right:!!a.right,team:t,who:actorName(),steps:steps,answer:G.card.answer||'',deck:G.card.deck,whoAmI:isWho(G.card),hints:G.hints,secretPrompt:secret(G.card)?G.card.prompt:'',priv:secret(G.card),drawer:(activePlayer()||{}).id||null};
      G.timer=null;G.phase='result';
      if(G.mode==='digital'&&to>=N())G.winner=t;
      break;
    case 'next':
      if(!actorOK||G.phase!=='result')return;
      if(G.winner){G.phase='won';break}
      var tt=G.turn.team;G.turn.idx[tt]+=1;G.turn.team=tt===1?2:1;G.card=null;G.roll=null;G.result=null;G.phase='turn';break;
    case 'again': if(!isHost)return;G.pos={1:0,2:0};G.score={1:0,2:0};G.turn={team:1,idx:{1:0,2:0}};G.winner=null;G.result=null;G.card=null;G.roll=null;G.anim=null;G.timer=null;G.phase='turn';break;
    case 'sketch': if(!actorOK||G.phase!=='card'||!isDrawCard(G.card))return;if(!G.sketch){G.sketch={k:rid()};inkReset()}break;
    default: return;
  }
  if(G.phase!=='card'||(G.sketch&&a.t==='skip')){if(G.sketch){G.sketch=null;inkReset()}}
  commit();
}
function playerTeam(id){var p=G.players.find(function(x){return x.id===id});return p?p.team:0}
function act(t,extra){
  var a=Object.assign({t:t},extra||{});
  if(amHost()){handle(myId,a);return}
  if(hostConn&&hostConn.open){try{hostConn.send({type:'act',a:a})}catch(e){toast('Lost the host. Reconnecting…')}}
  else toast('Not connected to the host yet');
}
function upsertPlayer(id,team,name){
  team=team===1||team===2?team:0;name=String(name||'Player').slice(0,24);
  var ex=G.players.find(function(p){return p.id===id});
  if(!team){if(ex){G.players=G.players.filter(function(p){return p.id!==id});commit()}return}
  if(ex){if(ex.name===name&&ex.team===team&&!ex.off)return;ex.name=name;ex.team=team;ex.off=false}
  else G.players.push({id:id,name:name,team:team});
  commit();
}
function hostSelf(){if(!amHost())return;upsertPlayer(myId,me?me.team:0,me?me.name:'')}

/* ---------------- network (PeerJS, host-authoritative) ---------------- */
var peer=null,conns={},hostConn=null,net='',hostTries=0;
function stateFor(){var g=JSON.parse(JSON.stringify(G));if(g.timer){g.timer.left=g.timer.end-Date.now();delete g.timer.end}return g}
function hubPush(){if(window.AndroidHub&&amHost()){try{window.AndroidHub.state(JSON.stringify(stateFor()))}catch(e){}}}
function broadcast(){if(role!=='host')return;var g=stateFor();Object.keys(conns).forEach(function(id){var c=conns[id];if(c&&c.open){try{c.send({type:'state',g:g})}catch(e){}}})}
setInterval(function(){if(role==='host')broadcast()},4000);
function startHost(){
  role='host';save('rtl.role',role);
  code=load('rtl.hostcode',null)||code||makeCode();save('rtl.hostcode',code);save('rtl.code',code);
  if(G.code!==code){G.code=code;save('rtl.game',G)}
  hostSelf();
  if(!window.Peer){net='offline';render();return}
  if(peer)try{peer.destroy()}catch(e){}
  net='opening';render();
  peer=new Peer(PREFIX+code,{debug:0});
  peer.on('open',function(){net='open';hostTries=0;render()});
  peer.on('connection',function(c){
    c.on('data',function(m){
      if(!m||typeof m!=='object')return;
      if(m.type==='hello'&&typeof m.id==='string'){
        var id=m.id.slice(0,40);c._id=id;
        if(conns[id]&&conns[id]!==c)try{conns[id].close()}catch(e){}
        conns[id]=c;upsertPlayer(id,m.team,m.name);try{c.send({type:'state',g:stateFor()});if(G.sketch)c.send({type:'inkall',k:G.sketch.k,strokes:ink})}catch(e){}
        render();
      }else if(m.type==='me'&&c._id){upsertPlayer(c._id,m.team,m.name)}
      else if(m.type==='act'&&c._id){handle(c._id,m.a)}
      else if(m.type==='ink'&&c._id&&m.m&&G.sketch&&canDraw(c._id)){inkApply(m.m);relayInk(m.m,c._id)}
    });
    c.on('close',function(){if(c._id&&conns[c._id]===c){delete conns[c._id];var p=G.players.find(function(x){return x.id===c._id});if(p){p.off=true;commit()}else render()}});
  });
  peer.on('disconnected',function(){net='reconnecting';render();setTimeout(function(){try{if(peer&&peer.disconnected&&!peer.destroyed)peer.reconnect()}catch(e){}},2000)});
  peer.on('error',function(err){
    if(err&&err.type==='unavailable-id'){ // the code is still held by this screen's last session; wait, then try again
      hostTries++;try{peer.destroy()}catch(e){}
      if(hostTries>24){code=makeCode();save('rtl.hostcode',code);save('rtl.code',code);hostTries=0;toast('Started a new room code')}
      setTimeout(startHost,2500);return}
    if(err&&(err.type==='network'||err.type==='server-error'||err.type==='socket-error'||err.type==='socket-closed')){net='reconnecting';render();setTimeout(function(){try{if(peer&&!peer.destroyed&&peer.disconnected)peer.reconnect();else if(peer&&peer.destroyed)startHost()}catch(e){}},3000)}
  });
}
function startClient(c){
  role='client';code=c;save('rtl.role',role);save('rtl.code',code);
  if(!window.Peer){net='offline';render();return}
  net='connecting';render();
  if(!peer||peer.destroyed){
    peer=new Peer({debug:0});
    peer.on('open',dial);
    peer.on('disconnected',function(){setTimeout(function(){try{if(peer&&peer.disconnected&&!peer.destroyed)peer.reconnect()}catch(e){}},2000)});
    peer.on('error',function(err){
      if(err&&err.type==='peer-unavailable'){net='nohost';render();setTimeout(function(){if(role==='client')dial()},4000);return}
      net='reconnecting';render();setTimeout(function(){if(role==='client'&&(!hostConn||!hostConn.open)){if(peer&&peer.destroyed){peer=null;startClient(code)}else dial()}},4000);
    });
  }else dial();
}
function dial(){
  if(role!=='client'||!peer||peer.destroyed||peer.disconnected)return;
  if(hostConn&&hostConn.open)return;
  var c=peer.connect(PREFIX+code,{reliable:true});hostConn=c;
  c.on('open',function(){net='open';sendMe();render()});
  c.on('data',function(m){if(!m)return;if(m.type==='state'&&m.g&&typeof m.g==='object')applyState(m.g);else if(m.type==='ink'&&m.m)inkApply(m.m);else if(m.type==='inkall'&&Array.isArray(m.strokes))inkAll(m.k,m.strokes)});
  c.on('close',function(){if(hostConn===c){net='lost';render();setTimeout(dial,2500)}});
}
function sendMe(){if(role==='client'&&hostConn&&hostConn.open){try{hostConn.send({type:'hello',id:myId,team:me?me.team:0,name:me?me.name:'',tv:!!(me&&me.tv)})}catch(e){}}else if(amHost())hostSelf()}
function applyState(g){
  if(g&&g.code)code=g.code;
  if(g.timer&&typeof g.timer.left==='number'){var old=G.timer;g.timer.end=(old&&old.k===g.timer.k&&old.end)?old.end:Date.now()+g.timer.left}
  G=g;save('rtl.game',G);render();
}
function dropNet(){try{if(peer)peer.destroy()}catch(e){}peer=null;conns={};hostConn=null;net=''}
function leave(){
  try{if(peer)peer.destroy()}catch(e){}
  peer=null;conns={};hostConn=null;net='';role=null;save('rtl.role',null);
  closeSheet();render();
}

/* ---------------- digital board ---------------- */
var boardEl=null,svgEl=null,pieceEls={},shownPos={1:0,2:0},animK=undefined,dieEl=null,rollK=null,boardN=0,running=0;
function buildBoard(){
  boardEl=h('div',{'class':'board',id:'board'});
  boardEl.appendChild(h('img',{'class':'art',src:'board.jpg',alt:'Road to Life game board'}));
  svgEl=s('svg',{viewBox:'0 0 1000 1000'});
  var defs=s('defs',{});
  [1,2].forEach(function(t){var g=s('radialGradient',{id:'pg'+t,cx:'35%',cy:'30%',r:'75%'});g.appendChild(s('stop',{offset:'0%','stop-color':'#fff','stop-opacity':'.85'}));g.appendChild(s('stop',{offset:'28%','stop-color':TEAMHEX[t][0]}));g.appendChild(s('stop',{offset:'100%','stop-color':TEAMHEX[t][1]}));defs.appendChild(g)});
  var cg=s('radialGradient',{id:'cg'});cg.appendChild(s('stop',{offset:'0%','stop-color':'#FFE27A','stop-opacity':'.95'}));cg.appendChild(s('stop',{offset:'100%','stop-color':'#FFE27A','stop-opacity':'0'}));defs.appendChild(cg);
  DECKS.forEach(function(d){var cp=s('clipPath',{id:'cl'+d.id});cp.appendChild(s('rect',{x:d.card[0],y:d.card[1],width:d.card[2],height:d.card[3],rx:7}));defs.appendChild(cp)});
  svgEl.appendChild(defs);
  svgEl.appendChild(s('circle',{'class':'crownglow',cx:825,cy:345,r:120}));
  svgEl.appendChild(s('path',{'class':'trail',d:'M'+CURVE.map(function(p){return p[0].toFixed(1)+' '+p[1].toFixed(1)}).join(' L')}));
  svgEl.appendChild(s('g',{id:'spaces'}));
  var slots=s('g',{id:'slots'});
  DECKS.forEach(function(d){
    var c=d.card,g=s('g',{'class':'slot','data-deck':d.id});
    g.appendChild(s('rect',{x:d.slot[0]-6,y:d.slot[1]-6,width:d.slot[2]+12,height:d.slot[3]+12,rx:12,fill:PATCH[d.id]}));
    g.appendChild(s('rect',{'class':'glow',x:c[0]-6,y:c[1]-6,width:c[2]+12,height:c[3]+16,rx:11}));
    g.appendChild(s('rect',{x:c[0],y:c[1]+7,width:c[2],height:c[3],rx:7,fill:d.c,stroke:'#2B1707','stroke-width':2}));
    g.appendChild(s('rect',{x:c[0],y:c[1]+3.5,width:c[2],height:c[3],rx:7,fill:d.c,stroke:'#2B1707','stroke-width':2}));
    g.appendChild(s('image',{href:d.art,x:c[0],y:c[1],width:c[2],height:c[3],preserveAspectRatio:'xMidYMid meet','clip-path':'url(#cl'+d.id+')'}));
    g.appendChild(s('rect',{'class':'frame',x:c[0],y:c[1],width:c[2],height:c[3],rx:7}));
    g.appendChild(s('circle',{cx:c[0]+2,cy:c[1]+2,r:16,fill:'#2B1707',stroke:'#fff','stroke-width':3}));
    var tx=s('text',{x:c[0]+2,y:c[1]+3});tx.textContent=d.n;g.appendChild(tx);
    g.addEventListener('click',function(){if(g.classList.contains('pickable'))act('pick',{n:d.n})});
    slots.appendChild(g);
  });
  svgEl.appendChild(slots);
  var pg=s('g',{id:'pieces'});
  [1,2].forEach(function(t){
    var g=s('g',{'class':'piece'});
    var sh=s('ellipse',{cx:0,cy:0,rx:24,ry:8,fill:'rgba(43,23,7,.38)'});
    var body=s('g',{});
    body.appendChild(s('ellipse',{cx:0,cy:-6,rx:22,ry:8,fill:'url(#pg'+t+')',stroke:'#fff','stroke-width':3}));
    body.appendChild(s('path',{d:'M-17,-7 C-17,-16 -9,-20 -7,-30 C-13,-32 -13,-40 -6,-42 C-14,-48 -13,-64 0,-66 C13,-64 14,-48 6,-42 C13,-40 13,-32 7,-30 C9,-20 17,-16 17,-7 Z',fill:'url(#pg'+t+')',stroke:'#fff','stroke-width':3,'stroke-linejoin':'round'}));
    var n=s('text',{x:0,y:-51,'text-anchor':'middle','dominant-baseline':'central','font-family':'Bowlby One, Arial Black, sans-serif','font-size':16,fill:'#fff'});n.textContent=t;body.appendChild(n);
    g.appendChild(sh);g.appendChild(body);pg.appendChild(g);pieceEls[t]={g:g,body:body,sh:sh};
  });
  svgEl.appendChild(pg);
  boardEl.appendChild(svgEl);
  dieEl=h('button',{'class':'die idle',type:'button','aria-label':'Roll the die',on:{click:function(){if(dieEl.classList.contains('can'))act('roll')}}});
  var cube=h('div',{'class':'cube'});
  var PIPS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
  var FACE={1:'rotateY(0deg)',2:'rotateY(90deg)',3:'rotateX(90deg)',4:'rotateX(-90deg)',5:'rotateY(-90deg)',6:'rotateY(180deg)'};
  [1,2,3,4,5,6].forEach(function(f){var face=h('div',{'class':'f',style:'transform:'+FACE[f]+' translateZ(var(--hz,20px))'});for(var c=1;c<=9;c++){face.appendChild(PIPS[f].indexOf(c)>-1?h('i',{style:'grid-area:'+Math.ceil(c/3)+'/'+(((c-1)%3)+1)}):h('span'))}cube.appendChild(face)});
  dieEl.appendChild(cube);dieEl._cube=cube;
  boardEl.appendChild(dieEl);
  if(window.ResizeObserver)new ResizeObserver(function(){dieEl.style.setProperty('--hz',(dieEl.offsetWidth/2)+'px')}).observe(dieEl);
}
function drawSpaces(){
  var g=svgEl.querySelector('#spaces');g.textContent='';var n=N();boardN=n;
  for(var i=1;i<n;i++){
    var p=at(spaceD(i,n));
    var sg=s('g',{'class':'space','data-i':i});
    sg.appendChild(s('circle',{'class':'ring',cx:p.x,cy:p.y,r:17}));
    sg.appendChild(s('circle',{'class':'dot',cx:p.x,cy:p.y,r:17,fill:i%2?'#EE6A12':'#C7570B'}));
    var tx=s('text',{x:p.x,y:p.y});tx.textContent=i;sg.appendChild(tx);
    g.appendChild(sg);
  }
}
function piecePoint(t,d){
  var p=at(d),len=Math.hypot(p.dx,p.dy)||1,nx=-p.dy/len,ny=p.dx/len;
  if(d<=1)return {x:p.x+(t===1?-26:26),y:p.y+30};
  if(d>=LTOT-1)return {x:p.x+(t===1?-24:24),y:p.y+22};
  var other=t===1?2:1,same=Math.abs(spaceD(shownPos[other],N())-d)<24,off=same?(t===1?-17:17):0;
  return {x:p.x+nx*off,y:p.y+ny*off+8};
}
function placePiece(t,d,hop,squash){
  var pt=piecePoint(t,d),el=pieceEls[t];hop=hop||0;squash=squash||0;
  el.g.setAttribute('transform','translate('+pt.x.toFixed(1)+','+pt.y.toFixed(1)+')');
  var sc=1+hop/230;
  el.body.setAttribute('transform','translate(0,'+(-hop).toFixed(1)+') scale('+(sc+squash*.14).toFixed(3)+','+(sc-squash*.18).toFixed(3)+')');
  el.sh.setAttribute('transform','scale('+Math.max(.4,1-hop/100).toFixed(3)+')');el.sh.setAttribute('opacity',Math.max(.25,1-hop/90).toFixed(2));
}
function placePieces(){
  [1,2].forEach(function(t){placePiece(t,spaceD(shownPos[t],N()))});
  var front=G.turn&&G.turn.team;var pg=svgEl.querySelector('#pieces');if(front&&pieceEls[front])pg.appendChild(pieceEls[front].g);
}
function animateMove(an,done){
  running++;var fin=function(){running--;done&&done()};
  var t=an.team,n=N();
  if(an.from===an.to){
    if(an.right===false&&!reduced()){var t0=performance.now();(function f(now){var k=(now-t0)/520;if(k>=1){placePiece(t,spaceD(an.to,n));fin();return}var pt=piecePoint(t,spaceD(an.to,n));pieceEls[t].g.setAttribute('transform','translate('+(pt.x+Math.sin(k*Math.PI*6)*8*(1-k)).toFixed(1)+','+pt.y.toFixed(1)+')');requestAnimationFrame(f)})(t0)}else fin();
    return}
  if(reduced()){shownPos[t]=an.to;placePieces();fin();return}
  var step=an.from;
  (function hopOne(){
    if(step>=an.to){fin();return}
    var a=spaceD(step,n),b=spaceD(step+1,n),t0=performance.now(),dur=640;
    (function f(now){
      var k=Math.min(1,(now-t0)/dur),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
      placePiece(t,a+(b-a)*e,Math.sin(Math.PI*k)*48);
      if(k<1){requestAnimationFrame(f);return}
      step++;shownPos[t]=step;
      var t1=performance.now();(function g(now2){var q=Math.min(1,(now2-t1)/200);placePiece(t,b,0,Math.sin(Math.PI*q));if(q<1)requestAnimationFrame(g);else{placePieces();setTimeout(hopOne,110)}})(t1);
    })(t0);
  })();
}
function rollDie(n,done){
  dieEl.classList.remove('idle');var cube=dieEl._cube;
  var face={1:[0,0],2:[0,-90],3:[-90,0],4:[90,0],5:[0,90],6:[0,180]}[n];
  if(reduced()){cube.style.transition='none';cube.style.transform='rotateX('+face[0]+'deg) rotateY('+face[1]+'deg)';setTimeout(done,300);return}
  var spins=2+Math.floor(Math.random()*2);
  cube.style.transition='none';cube.style.transform='rotateX(-22deg) rotateY(28deg)';void cube.offsetWidth;
  cube.style.transition='transform 1.3s cubic-bezier(.15,.7,.25,1)';
  cube.style.transform='rotateX('+(face[0]+360*spins)+'deg) rotateY('+(face[1]+360*(spins+1))+'deg)';
  if(dieEl.animate)dieEl.animate([{transform:'translate(-50%,-50%)'},{transform:'translate(-50%,-120%)'},{transform:'translate(-50%,-50%)'},{transform:'translate(-50%,-64%)'},{transform:'translate(-50%,-50%)'}],{duration:1300,easing:'ease-out'});
  setTimeout(done,1450);
}
function hotSlot(deck){if(!svgEl)return;svgEl.querySelectorAll('.slot').forEach(function(g){g.classList.toggle('hot',g.getAttribute('data-deck')===deck)})}

/* ---------------- table version: the five piles ---------------- */
function pilesEl(canPick){
  var wrap=h('div',{'class':'piles'});
  DECKS.forEach(function(d){
    wrap.appendChild(h('div',{'class':'pbox'},[h('button',{type:'button','class':'pile',disabled:!canPick,'data-deck':d.id,style:'--c:'+d.c,'aria-label':'Draw from '+d.name,on:{click:function(){act('pick',{n:d.n})}}},[h('span',{'class':'num',text:String(d.n)}),h('span',{'class':'lay'}),h('span',{'class':'top',style:'background-image:url('+d.art+')'})])]));
  });
  return wrap;
}

/* ---------------- the card ---------------- */
var shownCardK=null,cardEl=null,peek=false,flipTimer=null,flipped=false,peekCard=false;
function cardFace(c,showAnswer){
  var d=DK[c.deck]||DECKS[0];
  var body=h('div',{'class':'body'});
  if(isWho(c)){
    var hs=hintsOf(c);
    body.appendChild(h('p',{'class':'prompt',style:'--ps:26px',text:'Who am I?'}));
    body.appendChild(h('ol',{'class':'hints'},hs.map(function(x,i){return i<G.hints?h('li',null,[h('b',{text:String(i+1)}),h('span',{text:x})]):h('li',{'class':'locked'},[h('b',{text:String(i+1)}),h('span',{text:'Hint '+(i+1)+' is hidden'})])})));
  }else{
    var len=(c.prompt||'').length+(c.options||[]).join('').length;
    var ps=len>260?16:len>170?18:len>110?20:len>60?23:27;
    body.appendChild(h('p',{'class':'prompt',style:'--ps:'+ps+'px',text:c.prompt}));
    if(c.options&&c.options.length)body.appendChild(h('ul',{'class':'opts'},c.options.map(function(o,i){return h('li',null,[h('b',{text:'ABCDEF'[i]+'.'}),h('span',{text:o})])})));
  }
  if(c.note)body.appendChild(h('p',{'class':'note',text:c.note}));
  if(showAnswer&&c.answer)body.appendChild(h('div',{'class':'ans',text:c.answer}));
  return h('div',{'class':'side face',style:'--c:'+d.c+';--t:'+d.t},[body,h('div',{'class':'label',text:d.name})]);
}
function showCardLayer(){renderWB();showCardLayer2()}
function showCardLayer2(){
  var L=$('cardLayer'),c=G.card,spot=$('spot');
  if(!(G.phase==='card'&&c)){L.classList.remove('on');spot.textContent='';$('cctl').textContent='';shownCardK=null;cardEl=null;clearTimeout(flipTimer);return}
  if(c.k!==shownCardK){
    shownCardK=c.k;peek=false;peekCard=false;flipped=false;clearTimeout(flipTimer);spot.textContent='';
    cardEl=h('div',{'class':'card'});spot.appendChild(cardEl);
    var startFly=function(){
      if(shownCardK!==c.k)return;
      L.classList.add('on');paintCard();paintControls();
      var onBoard=boardEl&&document.body.contains(boardEl);
      var src=onBoard?svgEl.querySelector('.slot[data-deck="'+c.deck+'"] image'):document.querySelector('.pile[data-deck="'+c.deck+'"]');
      var sr=src&&src.getBoundingClientRect(),dr=spot.getBoundingClientRect();
      if(sr&&sr.width&&dr.width&&!reduced()){
        cardEl.style.transition='none';cardEl.style.transformOrigin='0 0';
        cardEl.style.transform='translate('+(sr.left-dr.left)+'px,'+(sr.top-dr.top)+'px) scale('+(sr.width/dr.width)+','+(sr.height/dr.height)+')';
        void cardEl.offsetWidth;
        cardEl.style.transition='transform .8s cubic-bezier(.22,1,.36,1)';cardEl.style.transform='';
        setTimeout(function(){if(cardEl){cardEl.style.transition='';cardEl.style.transformOrigin=''}},820);
      }
      flipTimer=setTimeout(function(){flipped=true;paintCard()},(G.roll&&G.roll.skip)?900:800+1500);
    };
    if(G.roll&&G.roll.dice&&G.roll.k!==rollK&&boardEl&&document.body.contains(boardEl)){rollK=G.roll.k;rollDie(G.roll.n,function(){hotSlot(c.deck);setTimeout(startFly,350)})}
    else{rollK=G.roll&&G.roll.k;hotSlot(c.deck);startFly()}
    return;
  }
  if(L.classList.contains('on')){paintCard();paintControls()}
}
function paintCard(){
  if(!cardEl||!G.card)return;
  var c=G.card,actor=iAmActor(),d=DK[c.deck];
  // the drawer's own phone shows the card; a shared screen acting for someone shows it only while they tap Show card
  var hide=secret(c)&&!(iDrew()||(actor&&peekCard));
  var cap=isWho(c)?('Who am I? · '+actorName()+' has the hints'):(actorName()+' has this card');
  if(hide&&actor)cap='Tap Show card when only '+actorName()+' is looking';
  var back=h('div',{'class':'side back',style:'--c:'+d.c+';background-image:url('+d.art+')'},[hide&&flipped?h('div',{'class':'cap',text:cap}):null]);
  var face=cardFace(c,actor&&peek);
  if(G.timer&&G.timer.end)face.appendChild(h('div',{'class':'tbar'},[h('i',{id:'tbarFill'})]));
  cardEl.textContent='';cardEl.appendChild(back);cardEl.appendChild(face);
  cardEl.classList.toggle('flip',flipped&&!hide);
  tickTimer();
}
function paintControls(){
  var box=$('cctl');box.textContent='';var c=G.card;if(!c)return;
  if(!iAmActor()){box.appendChild(h('div',{'class':'waiting',style:'color:#fff',text:isWho(c)?'Guess who it is! '+actorName()+' reads the hints.':secret(c)?(c.deck==='dumb'?actorName()+' is acting it out. Watch and guess!':actorName()+' is asking the question'):actorName()+' is reading the card'}));return}
  if(secret(c)&&!iDrew())box.appendChild(h('div',{'class':'row'},[h('button',{type:'button','class':'btn go',text:peekCard?'Hide card':'Show card',on:{click:function(){peekCard=!peekCard;if(!peekCard)peek=false;paintCard();paintControls()}}})]));
  if(isDrawCard(c))box.appendChild(h('div',{'class':'row'},[h('button',{type:'button','class':'btn go',text:G.sketch?'Back to drawing':'Draw it on the TV',on:{click:function(){if(!G.sketch)act('sketch');wbOpen=true;renderWB()}}})]));
  var tr=h('div',{'class':'timers'},[h('span',{'class':'lbl',text:'Timer'})]);
  if(G.timer&&G.timer.end){tr.appendChild(h('button',{type:'button','class':'btn big',id:'tbig',text:'0:00','aria-label':'Stop the timer',on:{click:function(){act('timer',{dur:0})}}}));tr.appendChild(h('button',{type:'button','class':'btn',text:'Stop',on:{click:function(){act('timer',{dur:0})}}}))}
  else [30,40,60,90].forEach(function(n){tr.appendChild(h('button',{type:'button','class':'btn',text:n<60?n+'s':(n/60|0)+':'+('0'+n%60).slice(-2),on:{click:function(){act('timer',{dur:n})}}}))});
  box.appendChild(tr);
  if(isWho(c)){
    var total=hintsOf(c).length,worth=Math.max(1,total-G.hints+1);
    box.appendChild(h('div',{'class':'waiting',style:'color:#fff;padding:2px',text:'A right guess now moves '+worth+(worth===1?' space':' spaces')}));
  }
  var row=h('div',{'class':'row'});
  if(isWho(c)&&G.hints<hintsOf(c).length)row.appendChild(h('button',{type:'button','class':'btn',text:'Next hint',on:{click:function(){act('hint')}}}));
  if(c.answer&&(!secret(c)||iDrew()||peekCard))row.appendChild(h('button',{type:'button','class':'btn',text:peek?'Hide answer':'Show answer',on:{click:function(){peek=!peek;paintCard();paintControls()}}}));
  row.appendChild(h('button',{type:'button','class':'btn',text:'Skip card',on:{click:function(){act('skip')}}}));
  box.appendChild(row);
  box.appendChild(h('div',{'class':'row'},[h('button',{type:'button','class':'btn bad',text:'Missed it',on:{click:function(){act('judge',{right:false})}}}),h('button',{type:'button','class':'btn good',text:'Got it right',on:{click:function(){act('judge',{right:true})}}})]));
}

/* ---------------- whiteboard for drawing cards ----------------
   The drawer's phone becomes a drawing pad; every stroke is sent through the host to every screen.
   Points are stored 0..1 across a square pad so phones and TVs of any size draw the same picture. */
function isDrawCard(c){return !!c&&/\bdraw\b/i.test(c.prompt||'')}
var ink=[],inkById={},wbOpen=false,wbK=null,wbEl=null,wbCanvas=null,wbCtx=null,wbSize=0,cur=null,pend=[],flushT=null,penColor='#2B1707',penW=.012;
var PENS=['#2B1707','#C90018','#1565C0','#2E8B3A','#EE6A12','#8E4A08'];
function inkReset(){ink=[];inkById={};redraw()}
function inkAll(k,strokes){wbK=k;ink=strokes.filter(function(x){return x&&Array.isArray(x.p)});inkById={};ink.forEach(function(x){inkById[x.id]=x});redraw()}
function inkApply(m){
  if(!m||typeof m!=='object')return;
  if(m.op==='add'&&Array.isArray(m.p)){
    var st=inkById[m.id];if(!st){st={id:String(m.id),c:String(m.c||'#2B1707'),w:Math.min(.05,Math.max(.002,Number(m.w)||.012)),p:[]};inkById[st.id]=st;ink.push(st)}
    var from=st.p.length;st.p=st.p.concat(m.p.map(Number).filter(function(v){return isFinite(v)}));drawStroke(st,Math.max(0,from-2));
  }else if(m.op==='undo'){var i=ink.length-1;while(i>=0&&ink[i].id.indexOf(String(m.by||''))!==0)i--;if(i>=0){delete inkById[ink[i].id];ink.splice(i,1)}redraw()}
  else if(m.op==='clear'){ink=[];inkById={};redraw()}
}
function relayInk(m,except){
  if(role==='host')Object.keys(conns).forEach(function(id){var c=conns[id];if(id!==except&&c&&c.open){try{c.send({type:'ink',m:m})}catch(e){}}});
  if(window.AndroidHub&&window.AndroidHub.ink&&amHost()){try{window.AndroidHub.ink(JSON.stringify(m))}catch(e){}}
}
function hubInkAll(){if(window.AndroidHub&&window.AndroidHub.ink&&amHost()){try{window.AndroidHub.ink(JSON.stringify({op:'all',k:G.sketch?G.sketch.k:null,strokes:ink}))}catch(e){}}}
window.hubInk=function(m){if(m&&m.op==='all')inkAll(m.k,m.strokes||[]);else inkApply(m)};
function canDraw(id){var ap=activePlayer();return ap?ap.id===id:playerTeam(id)===G.turn.team}
function sendInk(m){inkApply(m);if(amHost())relayInk(m,null);else if(hostConn&&hostConn.open){try{hostConn.send({type:'ink',m:m})}catch(e){}}}
function drawStroke(st,from){
  if(!wbCtx||!wbSize)return;var p=st.p,S=wbSize;if(p.length<2)return;
  wbCtx.strokeStyle=st.c;wbCtx.lineWidth=Math.max(1.5,st.w*S);wbCtx.lineCap='round';wbCtx.lineJoin='round';
  from=from-(from%2);
  wbCtx.beginPath();wbCtx.moveTo(p[from]*S,p[from+1]*S);
  if(p.length===2){wbCtx.lineTo(p[0]*S+.1,p[1]*S+.1)}
  for(var i=from+2;i<p.length;i+=2)wbCtx.lineTo(p[i]*S,p[i+1]*S);
  wbCtx.stroke();
}
function redraw(){if(!wbCtx)return;wbCtx.clearRect(0,0,wbSize,wbSize);ink.forEach(function(st){drawStroke(st,0)})}
function flushInk(){flushT=null;if(cur&&pend.length){sendInk({op:'add',id:cur,c:penColor,w:penW,p:pend});pend=pend.slice(-2)}}
function buildWB(){
  wbEl=h('div',{id:'wb'});
  var bar=h('div',{'class':'wbbar'},[h('b',{id:'wbTitle'}),h('span',{'class':'chip timer',id:'wbTimer',hidden:true})]);
  var pad=h('div',{'class':'wbpad'});wbCanvas=h('canvas',{'aria-label':'Drawing'});pad.appendChild(wbCanvas);
  var stage=h('div',{'class':'wbstage'},[pad]);
  var tools=h('div',{'class':'wbtools',id:'wbTools'});
  PENS.forEach(function(c){tools.appendChild(h('button',{type:'button','class':'pen','aria-label':'Pen color','data-c':c,style:'--c:'+c,on:{click:function(){penColor=c;paintTools()}}}))});
  tools.appendChild(h('button',{type:'button','class':'pen size',id:'penSize','aria-label':'Pen size',on:{click:function(){penW=penW<.01?.012:penW<.02?.026:.006;paintTools()}}},[h('i')]));
  tools.appendChild(h('button',{type:'button','class':'btn small',text:'Undo',on:{click:function(){sendInk({op:'undo',by:myId})}}}));
  tools.appendChild(h('button',{type:'button','class':'btn small',text:'Clear',on:{click:function(){sendInk({op:'clear'})}}}));
  tools.appendChild(h('button',{type:'button','class':'btn small go',text:'Done',on:{click:function(){wbOpen=false;renderWB();paintControls()}}}));
  wbEl.appendChild(bar);wbEl.appendChild(stage);wbEl.appendChild(tools);
  document.body.appendChild(wbEl);
  wbCtx=wbCanvas.getContext('2d');
  var fit=function(){var r=pad.getBoundingClientRect(),dpr=window.devicePixelRatio||1;if(!r.width)return;wbSize=r.width;wbCanvas.width=Math.round(r.width*dpr);wbCanvas.height=Math.round(r.width*dpr);wbCtx.setTransform(dpr,0,0,dpr,0,0);redraw()};
  if(window.ResizeObserver)new ResizeObserver(fit).observe(pad);window.addEventListener('resize',fit);wbEl._fit=fit;
  var pt=function(e){var r=wbCanvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))].map(function(v){return Math.round(v*1000)/1000})};
  wbCanvas.addEventListener('pointerdown',function(e){if(!wbEl.classList.contains('me'))return;e.preventDefault();wbCanvas.setPointerCapture(e.pointerId);cur=myId+'-'+rid();pend=pt(e);flushInk();if(!flushT)flushT=setTimeout(flushInk,40)});
  wbCanvas.addEventListener('pointermove',function(e){if(!cur)return;e.preventDefault();var p=pt(e);pend.push(p[0],p[1]);if(!flushT)flushT=setTimeout(flushInk,40)});
  var up=function(){if(!cur)return;clearTimeout(flushT);flushInk();cur=null;pend=[]};
  wbCanvas.addEventListener('pointerup',up);wbCanvas.addEventListener('pointercancel',up);
}
function paintTools(){if(!wbEl)return;wbEl.querySelectorAll('.pen[data-c]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-c')===penColor))});var sz=$('penSize');if(sz)sz.style.setProperty('--s',(penW*600)+'px')}
function renderWB(){
  var active=G.phase==='card'&&!!G.sketch&&!!G.card&&role!==null;
  if(active&&G.sketch.k!==wbK){wbK=G.sketch.k;if(!amHost())inkReset()}
  if(G.phase!=='card'||!G.card||!isDrawCard(G.card))wbOpen=false;
  var drawer=active&&iAmActor();
  var show=active&&(!drawer||wbOpen);
  if(!show){if(wbEl)wbEl.classList.remove('on');return}
  if(!wbEl)buildWB();
  wbEl.classList.add('on');wbEl.classList.toggle('me',drawer);
  $('wbTitle').textContent=drawer?'Draw it! Everyone is watching':actorName()+' is drawing. Guess what it is!';
  paintTools();if(wbEl._fit)wbEl._fit();
}

/* ---------------- timer ---------------- */
var overShown=null;
function tickTimer(){
  var chip=$('timerChip'),t=G.timer;
  if(!t||!t.end||G.phase!=='card'){chip.hidden=true;var wt0=$('wbTimer');if(wt0)wt0.hidden=true;return}
  var left=Math.max(0,Math.ceil((t.end-Date.now())/1000)),txt=(left/60|0)+':'+('0'+left%60).slice(-2);
  chip.hidden=false;chip.textContent=left?txt:'Time!';chip.classList.toggle('low',left>0&&left<=10);chip.classList.toggle('over',!left);
  var big=$('tbig');if(big)big.textContent=left?txt:'Time!';
  var wt=$('wbTimer');if(wt){wt.hidden=false;wt.textContent=left?txt:'Time!'}
  var f=$('tbarFill');if(f)f.style.transform='scaleX('+Math.max(0,(t.end-Date.now())/(t.dur*1000)).toFixed(3)+')';
  if(!left&&overShown!==t.k){overShown=t.k;toast('Time is up!');try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}}
}
setInterval(tickTimer,250);

/* ---------------- confetti ---------------- */
function confetti(){
  if(reduced())return;
  var cv=$('fx'),ctx=cv.getContext('2d'),dpr=window.devicePixelRatio||1,W=cv.width=innerWidth*dpr,H=cv.height=innerHeight*dpr;
  var cols=['#FF7F00','#C90018','#A3DEFF','#AC1FAC','#58A410','#FFD54A','#fff'],P=[];
  for(var i=0;i<170;i++)P.push({x:W/2+(Math.random()-.5)*W*.3,y:H*.35,vx:(Math.random()-.5)*W*.018,vy:-Math.random()*H*.02-H*.006,r:Math.random()*Math.PI,vr:(Math.random()-.5)*.3,s:(6+Math.random()*8)*dpr,c:cols[i%cols.length]});
  var t0=performance.now();
  (function f(now){ctx.clearRect(0,0,W,H);var k=(now-t0)/3400;P.forEach(function(p){p.vy+=H*.0006;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r);ctx.globalAlpha=Math.max(0,1-k);ctx.fillStyle=p.c;ctx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);ctx.restore()});if(k<1)requestAnimationFrame(f);else ctx.clearRect(0,0,W,H)})(t0);
}
var wonShown=null,hubOn=false;
window.hubTv=function(on){hubOn=!!on;document.body.classList.toggle('hubtv',hubOn);if(hubOn){hubPush();hubInkAll()}render()};
window.hubInkAll=function(){hubInkAll()};
function celebrate(){if(wonShown===G.e)return;wonShown=G.e;confetti();toast('Team '+G.winner+' wins!')}

/* ---------------- screens ---------------- */
function render(){
  var mc=$('meChip');mc.style.setProperty('--tc',TEAMC[me?me.team:0]);
  mc.lastChild.textContent=!me?'Pick a team':(me.team?('Team '+me.team+(me.name?' · '+me.name:'')):'Host screen');
  mc.hidden=!role||isTV();$('menuBtn').hidden=!role||DISPLAY;
  document.body.classList.toggle('digi',G.mode==='digital'&&G.phase!=='lobby'&&!!role);
  document.body.classList.toggle('tv',isTV());
  var cc=$('codeChip');cc.hidden=!((role==='host'||isTV())&&code&&G.phase!=='lobby');cc.textContent='Join: '+SITE.replace(/^https?:\/\//,'').replace(/\/$/,'')+' · '+code;
  var stage=$('stage'),panel=$('panel');
  $('main').classList.toggle('homeMain',!role);
  if(!role){renderHome(stage,panel);showCardLayer();return}
  if(role==='client'&&net!=='open'&&!G.v){renderWait(stage,panel);showCardLayer();return}
  if(G.phase==='lobby'){renderLobby(stage,panel);showCardLayer();return}
  var digital=G.mode==='digital';
  if(digital){
    if(!boardEl)buildBoard();
    if(!stage.contains(boardEl)){stage.textContent='';stage.appendChild(boardEl)}
    if(boardN!==N())drawSpaces();
    if(animK===undefined){animK=G.anim&&G.anim.k;shownPos={1:G.pos[1],2:G.pos[2]}}
    if(G.anim&&G.anim.k!==animK){
      var an=G.anim;animK=an.k;var other=an.team===1?2:1;shownPos[other]=G.pos[other];shownPos[an.team]=an.from;placePieces();
      setTimeout(function(){animateMove(an,function(){shownPos[an.team]=an.to;placePieces();if(G.winner)celebrate()})},450);
    }else if(!running){shownPos={1:G.pos[1],2:G.pos[2]}}
    if(!running)placePieces();
    boardEl.classList.toggle('won',G.phase==='won'||(G.phase==='result'&&!!G.winner));
    var target=G.phase==='turn'?G.pos[G.turn.team]+1:-1;
    svgEl.querySelectorAll('.space').forEach(function(g){var on=+g.getAttribute('data-i')===target;g.classList.toggle('target',on);g.style.setProperty('--tc',TEAMHEX[G.turn.team][0])});
    if(G.phase!=='card')hotSlot(null);
    var canPick=G.phase==='turn'&&iAmActor();
    dieEl.hidden=realDie();
    dieEl.classList.toggle('can',canPick&&!realDie());if(G.phase==='turn')dieEl.classList.add('idle');
    svgEl.querySelectorAll('.slot').forEach(function(g){g.classList.toggle('pickable',canPick&&realDie())});
  }else{
    stage.textContent='';stage.appendChild(pilesEl(G.phase==='turn'&&iAmActor()));
  }
  panel.textContent='';
  var t=G.turn.team,ap=activePlayer(),won=G.phase==='won';
  panel.appendChild(h('div',{'class':'banner',style:'--tc:'+TEAMC[won?G.winner:t]},[
    h('div',{'class':'who'},won?[h('b',{text:'Team '+G.winner+' reached the crown!'}),h('span',{text:'Game over'})]:[h('b',{text:ap?ap.name+'’s turn':'Team '+t+'’s turn'}),h('span',{text:'Team '+t+(role==='client'&&iAmActor()?' · that’s you':'')})]),
    h('div',{'class':'score'},[1,2].map(function(k){return h('div',{'class':'sc'+(k===t&&!won?' on':''),style:'--tc:'+TEAMC[k]},[h('b',{text:digital?(G.pos[k]+'/'+N()):String(G.score[k])}),h('span',{text:'Team '+k})])}))
  ]));
  if(G.phase==='turn'){
    if(iAmActor()){
      if(!realDie()){
        panel.appendChild(h('div',{'class':'row'},[h('button',{type:'button','class':'btn go',text:'Roll the die',on:{click:function(){act('roll')}}})]));
        panel.appendChild(h('div',{'class':'hintline',text:'Roll 1 to 5. The number picks the pile.'}));
      }else if(digital){
        panel.appendChild(h('div',{'class':'hintline',text:'Roll your die, then tap the number you rolled'}));
        panel.appendChild(h('div',{'class':'nums'},DECKS.map(function(d){return h('button',{type:'button','class':'num',style:'--c:'+d.c+';--t:'+d.t,'aria-label':d.n+': '+d.name,on:{click:function(){act('pick',{n:d.n})}}},[h('b',{text:String(d.n)}),h('span',{text:d.name})])})));
      }else panel.appendChild(h('div',{'class':'hintline',text:'Roll your die, then tap the pile you landed on'}));
    }else panel.appendChild(h('div',{'class':'waiting',text:(realDie()?'Waiting for '+actorName()+' to pick a pile':'Waiting for '+actorName()+' to roll')}));
  }else if(G.phase==='result'&&G.result){
    var r=G.result;
    var line=r.right?(digital?('Team '+r.team+' moves '+r.steps+(r.steps===1?' space':' spaces')):(r.whoAmI?('Move '+r.steps+(r.steps===1?' space':' spaces')+' on the board'):'Point for Team '+r.team)):'No move this time';
    var mine=!r.priv||r.drawer===myId||role==='local';
    var extra=mine?((r.secretPrompt?'\nThe card: '+r.secretPrompt.replace(/\n+/g,' '):'')+(r.answer?'\nAnswer: '+r.answer:'')):'';
    panel.appendChild(h('div',{'class':'result',style:'--rc:'+(r.right?'var(--good)':'var(--bad)')},[h('b',{text:r.right?'Correct!':'Missed it'}),line+extra]));
    if(iAmActor()||amHost())panel.appendChild(h('div',{'class':'row'},[h('button',{type:'button','class':'btn go',text:G.winner?'See the winner':'Next turn',on:{click:function(){act('next')}}})]));
    else panel.appendChild(h('div',{'class':'waiting',text:'Waiting for '+actorName()+' to continue'}));
  }else if(won){
    if(amHost())panel.appendChild(h('div',{'class':'row'},[h('button',{type:'button','class':'btn',text:'Back to setup',on:{click:function(){act('lobby')}}}),h('button',{type:'button','class':'btn go',text:'Play again',on:{click:function(){act('again')}}})]));
    else panel.appendChild(h('div',{'class':'waiting',text:'Waiting for the host to start again'}));
    celebrate();
  }
  var ns=netLine();if(ns)panel.appendChild(h('div',{'class':'hintline',text:ns}));
  if(hubOn)panel.appendChild(h('div',{'class':'hintline',text:'The board is showing on the TV'}));
  showCardLayer();
}
function netLine(){
  if(role==='host'){var n=Object.keys(conns).length;return net==='open'?('Room '+code+' · '+n+(n===1?' phone':' phones')+' connected'):net==='offline'?'Could not open the room. Check the internet connection.':'Opening room '+code+'…'}
  if(role==='client')return net==='open'?'':net==='nohost'?'Room '+code+' isn’t open. Check the code with the host.':'Connecting to room '+code+'…';
  return '';
}
function renderHome(stage,panel){
  stage.textContent='';panel.textContent='';
  var hashCode=(location.hash||'').replace('#','').toUpperCase();
  var box=h('div',{'class':'home'});
  box.appendChild(h('img',{src:'board.jpg',alt:'The Road to Life board','class':'homeart'}));
  box.appendChild(h('h2',{'class':'homet',text:'Road to Life'}));
  box.appendChild(h('p',{'class':'fine',style:'text-align:center',text:'One screen hosts. Everyone else joins on their phone with the room code.'}));
  var inp=h('input',{id:'joincode',placeholder:'ABCD',maxlength:4,autocomplete:'off',autocapitalize:'characters',spellcheck:'false','aria-label':'Room code',value:/^[A-Z]{4}$/.test(hashCode)?hashCode:'','class':'codein'});
  var join=h('form',{'class':'joinrow',on:{submit:function(e){e.preventDefault();var v=inp.value.trim().toUpperCase();if(!/^[A-Z]{4}$/.test(v)){toast('Room codes are 4 letters');return}G=newGame();save('rtl.game',G);ensureMe(function(){startClient(v)})}}},[inp,h('button',{type:'submit','class':'btn go',text:'Join'})]);
  box.appendChild(h('label',null,['Join a game',join]));
  box.appendChild(h('button',{type:'button','class':'btn small',text:'Use this screen as the TV',on:{click:function(){var v=inp.value.trim().toUpperCase();if(!/^[A-Z]{4}$/.test(v)){toast('Type the 4-letter code from the host phone first');inp.focus();return}me={team:0,name:'TV',tv:true};save('rtl.me',me);G=newGame();save('rtl.game',G);startClient(v)}}}));
  box.appendChild(h('div',{'class':'or',text:'or'}));
  box.appendChild(h('button',{type:'button','class':'btn',text:EMBED?'Host a game from this phone':'Host a game on this screen',on:{click:function(){if(role!=='host'){G=newGame();code=load('rtl.hostcode',null)||makeCode();save('rtl.hostcode',code);save('rtl.code',code)}ensureMe(startHost,true)}}}));
  box.appendChild(h('button',{type:'button','class':'btn small',text:'Play on this one device',on:{click:function(){role='local';save('rtl.role',role);if(G.phase==='lobby'||!G.v)G=newGame();ensureMe(function(){hostSelf();render()},true)}}}));
  stage.appendChild(box);
}
function settingsEl(){
  var box=h('div',{'class':'settings'});
  if(G.mode==='digital')box.appendChild(h('div',{'class':'set'},[h('span',{text:'Dice'}),h('div',{'class':'seg'},[['digital','On-screen die'],['real','Real die']].map(function(o){return h('button',{type:'button','aria-pressed':String((G.dice||'digital')===o[0]),text:o[1],on:{click:function(){act('mode',{dice:o[0]})}}})}))]));
  box.appendChild(h('div',{'class':'set'},[h('span',{text:'Remain Dumb and Is That Really So? cards'}),h('div',{'class':'seg'},[[true,'Only the drawer sees them'],[false,'Show to everyone']].map(function(o){return h('button',{type:'button','aria-pressed':String((G.hideDumb!==false)===o[0]),text:o[1],on:{click:function(){act('mode',{hideDumb:o[0]})}}})}))]));
  box.appendChild(h('p',{'class':'fine',text:G.hideDumb!==false?'The main screen shows only the card art. The person who drew the card sees it, and its answer, on their own phone.':'These cards are shown on every screen.'}));
  return box;
}
function renderWait(stage,panel){
  stage.textContent='';panel.textContent='';
  stage.appendChild(h('div',{'class':'home'},[h('div',{'class':'roomcode',text:code||''}),h('div',{'class':'waiting',text:netLine()||'Connecting…'}),h('button',{type:'button','class':'btn small',text:'Leave',on:{click:leave}})]));
}
function renderLobby(stage,panel){
  stage.textContent='';panel.textContent='';
  var host=amHost();
  var box=h('div',{'class':'lobby'});
  if(role==='host'||isTV()){
    var url=SITE+'#'+code;
    var qr=h('div',{'class':'qr','aria-label':'QR code to join'});
    box.appendChild(h('div',{'class':'codebox'},[h('div',null,[h('span',{'class':'lbl2',text:'Room code'}),h('div',{'class':'roomcode',text:code}),h('span',{'class':'fine',text:'Join at '+SITE.replace(/^https?:\/\//,'')})]),qr]));
    if(window.qrcode){try{var q=qrcode(0,'M');q.addData(url);q.make();qr.innerHTML=q.createSvgTag({cellSize:4,margin:2,scalable:true})}catch(e){}}
  }
  if(host){
    box.appendChild(h('div',{'class':'modes'},[
      h('button',{type:'button','class':'mode','aria-pressed':String(G.mode==='board'),on:{click:function(){act('mode',{mode:'board',len:G.len})}}},[h('b',{text:'Board on the table'}),h('span',{text:'Use your printed board and die. Screens handle turns, cards and the timer.'})]),
      h('button',{type:'button','class':'mode','aria-pressed':String(G.mode==='digital'),on:{click:function(){act('mode',{mode:'digital',len:G.len})}}},[h('b',{text:'Digital board'}),h('span',{text:'No board needed. Roll here, and right answers move your piece toward the crown.'})])
    ]));
    if(G.mode==='digital')box.appendChild(h('div',{'class':'seg'},['short','standard','long'].map(function(k){return h('button',{type:'button','aria-pressed':String(G.len===k),text:k+' · '+LENS[k],on:{click:function(){act('mode',{mode:G.mode,len:k})}}})})));
    box.appendChild(settingsEl());
  }else box.appendChild(h('div',{'class':'waiting',text:(isTV()?'Everyone join with the code above. Waiting for the host to start':'You’re in! Waiting for the host to start')+' · '+(G.mode==='digital'?'Digital board':'Board on the table')}));
  var teams=h('div',{'class':'teams'});
  [1,2].forEach(function(t){
    var col=h('div',{'class':'tcol',style:'--tc:'+TEAMC[t]},[h('h3',{text:'Team '+t})]);
    teamPlayers(t).forEach(function(p){col.appendChild(h('div',{'class':'pl'+(p.off?' off':'')},[h('span',{text:p.name}),p.manual?h('small',{text:'no phone'}):p.id===myId?h('small',{text:'you'}):p.off?h('small',{text:'away'}):null,host&&(p.manual||p.off)?h('button',{type:'button','aria-label':'Remove '+p.name,text:'×',on:{click:function(){act('delp',{id:p.id})}}}):null]))});
    if(!teamPlayers(t).length)col.appendChild(h('div',{'class':'pl'},[h('small',{text:'No players yet'})]));
    if(host){var inp=h('input',{id:'add'+t,placeholder:'Add a name',maxlength:24,'aria-label':'Add a player without a phone to Team '+t});col.appendChild(h('form',{'class':'add',on:{submit:function(e){e.preventDefault();var v=inp.value.trim();if(v){act('addp',{name:v,team:t});inp.value=''}}}},[inp,h('button',{type:'submit',text:'Add'})]))}
    teams.appendChild(col);
  });
  box.appendChild(teams);
  box.appendChild(h('p',{'class':'fine',text:'Turns go back and forth between the teams, one person at a time. Add names for anyone without a phone and this screen will play for them.'}));
  if(host)box.appendChild(h('button',{type:'button','class':'btn go',text:'Start game',on:{click:function(){act('start')}}}));
  var ns=netLine();if(ns)box.appendChild(h('div',{'class':'hintline',text:ns}));
  stage.appendChild(box);
}

/* ---------------- sheets: team pick, menu, cards ---------------- */
var sheetView=null,afterJoin=null,settingsPaint=null;
function openSheet(view,build){sheetView=view;var box=$('sheetIn');box.textContent='';build(box);$('sheet').classList.add('open')}
function closeSheet(){sheetView=null;$('sheet').classList.remove('open')}
$('sheet').addEventListener('click',function(e){if(e.target===this&&sheetView!=='join')closeSheet()});
function ensureMe(then,hostScreen){afterJoin=then;openJoin(hostScreen)}
function openJoin(hostScreen){
  var pick=me?me.team:null;
  openSheet('join',function(box){
    box.appendChild(h('div',{'class':'sh'},[h('h2',{text:'Which team are you?'}),h('button',{type:'button','class':'ghost',text:'Cancel',on:{click:function(){afterJoin=null;closeSheet()}}})]));
    var nm=h('input',{id:'myname',placeholder:'Your name',maxlength:24,value:me&&me.name||''});
    var tp=h('div',{'class':'teampick'},[1,2].map(function(t){return h('button',{type:'button','class':'tp','aria-pressed':String(pick===t),style:'--tc:'+TEAMC[t],on:{click:function(){pick=t;tp.querySelectorAll('.tp').forEach(function(b,i){b.setAttribute('aria-pressed',String(i+1===t))})}}},[h('b',{text:String(t)}),h('span',{text:'Team '+t})])}));
    box.appendChild(tp);
    box.appendChild(h('label',null,['Your name',nm]));
    var done=function(team){me={team:team,name:team?(nm.value.trim()||'Player'):''};if(isTV()&&!team)me.tv=true;save('rtl.me',me);closeSheet();var f=afterJoin;afterJoin=null;if(f)f();else{sendMe();render()}};
    box.appendChild(h('button',{type:'button','class':'btn go',text:'Ready',on:{click:function(){if(!pick){toast('Pick Team 1 or Team 2');return}done(pick)}}}));
    if(hostScreen||amHost())box.appendChild(h('button',{type:'button','class':'btn small',text:'This screen is the TV, not a player',on:{click:function(){done(0)}}}));
  });
}
function openMenu(){
  openSheet('menu',function(box){
    box.appendChild(h('div',{'class':'sh'},[h('h2',{text:'Menu'}),h('button',{type:'button','class':'ghost',text:'Close',on:{click:closeSheet}})]));
    var m=h('div',{'class':'menu'});
    m.appendChild(h('button',{type:'button','class':'btn',text:'Change team or name',on:{click:function(){openJoin()}}}));
    if(amHost()&&G.phase!=='lobby'){
      m.appendChild(h('button',{type:'button','class':'btn',text:'Back to setup',on:{click:function(){closeSheet();act('lobby')}}}));
      m.appendChild(h('button',{type:'button','class':'btn',text:'Restart this game',on:{click:function(){closeSheet();act('again')}}}));
    }
    if(amHost())m.appendChild(h('button',{type:'button','class':'btn',text:'Game settings',on:{click:function(){openSheet('settings',function(b){b.appendChild(h('div',{'class':'sh'},[h('h2',{text:'Game settings'}),h('button',{type:'button','class':'ghost',text:'Done',on:{click:closeSheet}})]));var holder=h('div');b.appendChild(holder);var paint=function(){holder.textContent='';holder.appendChild(settingsEl())};paint();settingsPaint=paint})}}}));
    if(!isTV())m.appendChild(h('button',{type:'button','class':'btn',text:'All cards',on:{click:openCards}}));
    m.appendChild(h('button',{type:'button','class':'btn',text:role==='host'?'Close the room':'Leave this game',on:{click:leave}}));
    m.appendChild(h('p',{'class':'fine',text:role==='host'?'This screen is the host. Keep it open: every phone follows it.':role==='client'?'Connected to room '+code+'.':'Playing on this device.'}));
    box.appendChild(m);
  });
}
var cardsDeck='lot';
function openCards(){
  openSheet('cards',function(box){
    box.appendChild(h('div',{'class':'sh'},[h('h2',{text:'All cards'}),h('button',{type:'button','class':'ghost',text:'Close',on:{click:closeSheet}})]));
    box.appendChild(h('div',{'class':'tabs'},DECKS.map(function(d){return h('button',{type:'button','class':'tab','aria-pressed':String(d.id===cardsDeck),on:{click:function(){cardsDeck=d.id;openCards()}}},[d.name+' · '+idsOf(d.id).length])})));
    var list=h('div',{'class':'list'});
    idsOf(cardsDeck).sort(function(a,b){return (cards[a].n||0)-(cards[b].n||0)}).forEach(function(id){var c=cards[id];list.appendChild(h('button',{type:'button','class':'crow',style:'--c:'+DK[c.deck].c,on:{click:function(){openForm(id)}}},[h('b',{text:String(c.prompt).replace(/\n+/g,' ')}),h('span',{text:c.answer?'Answer: '+String(c.answer).replace(/\n+/g,' '):(c.note||'No answer on this card')})]))});
    if(!idsOf(cardsDeck).length)list.appendChild(h('p',{'class':'fine',text:'No cards in this deck yet.'}));
    box.appendChild(list);
    box.appendChild(h('p',{'class':'fine',text:EMBED?'These are the cards saved in this app. When this phone hosts, every card it deals comes from this list.':'Cards you add or change here are saved on this device only. The host’s device is the one that deals the cards.'}));
    box.appendChild(h('div',{'class':'row'},[h('button',{type:'button','class':'btn small',text:'Back up cards',on:{click:backupCards}}),h('button',{type:'button','class':'btn small',text:'Restore a backup',on:{click:restoreCards}})]));
    box.appendChild(h('button',{type:'button','class':'btn go',text:'Add a card',on:{click:function(){openForm(null)}}}));
  });
}
function backupCards(){
  var txt=JSON.stringify(EMBED?cards:myCards);
  openSheet('backup',function(box){
    box.appendChild(h('div',{'class':'sh'},[h('h2',{text:'Back up cards'}),h('button',{type:'button','class':'ghost',text:'Back',on:{click:openCards}})]));
    var ta=h('textarea',{id:'bk',readonly:true,style:'min-height:180px;font-size:12px'});ta.value=txt;box.appendChild(ta);
    box.appendChild(h('p',{'class':'fine',text:'Copy this text and keep it somewhere safe, like a note or an email to yourself. Restore a backup puts these cards back.'}));
    box.appendChild(h('button',{type:'button','class':'btn go',text:'Copy',on:{click:function(){ta.select();var done=function(){toast('Copied')};try{navigator.clipboard.writeText(txt).then(done,function(){document.execCommand('copy');done()})}catch(e){try{document.execCommand('copy');done()}catch(e2){toast('Select the text and copy it')}}}}}));
  });
}
function restoreCards(){
  openSheet('restore',function(box){
    box.appendChild(h('div',{'class':'sh'},[h('h2',{text:'Restore cards'}),h('button',{type:'button','class':'ghost',text:'Back',on:{click:openCards}})]));
    var ta=h('textarea',{id:'rs',placeholder:'Paste a card backup here',style:'min-height:180px;font-size:12px'});box.appendChild(ta);
    box.appendChild(h('p',{'class':'fine',text:'Cards in the backup are added back. Cards already here stay.'}));
    box.appendChild(h('button',{type:'button','class':'btn go',text:'Restore',on:{click:function(){var j;try{j=JSON.parse(ta.value)}catch(e){toast('That text isn’t a card backup');return}var n=0;Object.keys(j||{}).forEach(function(k){var c=j[k];if(c&&c.deleted&&!EMBED){myCards[k]=c;n++;return}if(c&&DK[c.deck]&&typeof c.prompt==='string'){saveCard(k,{deck:c.deck,prompt:c.prompt,options:Array.isArray(c.options)?c.options.map(String):[],answer:String(c.answer||''),note:String(c.note||''),n:Number(c.n)||Date.now()});n++}});if(!EMBED){save('rtl.mycards',myCards);mergeCards()}toast(n+' cards restored');openCards()}}}));
  });
}
function field(l,el){return h('label',null,[l,el])}
function openForm(id){
  var c=id?cards[id]:{deck:cardsDeck,prompt:'',options:[],answer:'',note:''};
  openSheet('form',function(box){
    box.appendChild(h('div',{'class':'sh'},[h('h2',{text:id?'Edit card':'New card'}),h('button',{type:'button','class':'ghost',text:'Back',on:{click:openCards}})]));
    var sel=h('select',{id:'f-deck'},DECKS.map(function(d){var o=h('option',{value:d.id,text:d.name});if(d.id===c.deck)o.selected=true;return o}));
    var pr=h('textarea',{id:'f-prompt',placeholder:'The question or challenge. For a riddle, start with "Who am I?" and number the hints 1. 2. 3.'});pr.value=c.prompt||'';
    var opts=[0,1,2,3].map(function(i){var e=h('input',{id:'f-opt'+i,placeholder:'ABCD'[i]+' (optional)','aria-label':'Choice '+'ABCD'[i]});e.value=(c.options||[])[i]||'';return e});
    var an=h('textarea',{id:'f-answer',placeholder:'Only the person whose turn it is can show it'});an.value=c.answer||'';
    var no=h('input',{id:'f-note',placeholder:'Always visible, e.g. 40 seconds to guess'});no.value=c.note||'';
    var confirmBar=h('div',{'class':'row',hidden:true});
    var form=h('form',{style:'display:flex;flex-direction:column;gap:10px',on:{submit:function(e){e.preventDefault();
      var data={deck:sel.value,prompt:pr.value.trim(),options:opts.map(function(o){return o.value.trim()}).filter(Boolean),answer:an.value.trim(),note:no.value.trim(),n:id?(cards[id].n||Date.now()):Date.now()};
      if(!data.prompt){toast('Write the question or challenge first');return}
      var key=id||('my-'+rid());saveCard(key,data);cardsDeck=data.deck;toast(id?'Card saved':'Card added');openCards();
    }}},[field('Deck',sel),field('Card text',pr),h('label',null,['Multiple choice',h('div',{'class':'two'},opts)]),field('Answer',an),field('Note on the card',no),h('button',{type:'submit','class':'btn go',text:id?'Save card':'Add card'})]);
    if(id){var del=h('button',{type:'button','class':'btn small bad',text:'Delete this card',on:{click:function(){confirmBar.hidden=false;del.hidden=true}}});
      confirmBar.appendChild(h('button',{type:'button','class':'btn small',text:'Keep it',on:{click:function(){confirmBar.hidden=true;del.hidden=false}}}));
      confirmBar.appendChild(h('button',{type:'button','class':'btn small bad',text:'Yes, delete',on:{click:function(){deleteCard(id);toast('Card deleted');openCards()}}}));
      form.appendChild(del);form.appendChild(confirmBar)}
    box.appendChild(form);
  });
}
$('meChip').addEventListener('click',function(){openJoin()});
$('menuBtn').addEventListener('click',openMenu);

/* the phone's back button closes what is open instead of leaving the game */
try{history.pushState({rtl:1},'')}catch(e){}
window.addEventListener('popstate',function(){if(sheetView&&sheetView!=='join')closeSheet();try{history.pushState({rtl:1},'')}catch(e){}});
function joinFromLink(){
  var hc=(location.hash||'').replace('#','').toUpperCase();
  if(!/^[A-Z]{4}$/.test(hc)||DISPLAY)return false;
  if((role==='client'||role==='host')&&code===hc)return false;
  if(role==='host')return false;                  // the host screen never leaves its own room from a link
  dropNet();G=newGame();save('rtl.game',G);
  if(me&&(me.team===1||me.team===2||me.tv)){startClient(hc)}else{role=null;save('rtl.role',null);closeSheet();render()}
  return true;
}
window.addEventListener('hashchange',function(){if(!joinFromLink()&&!role)render()});

/* ---------------- start ---------------- */
if(DISPLAY){window.hubState=function(g){if(g&&typeof g==='object')applyState(g)};render();return}
loadCards();
var linked=joinFromLink();
render();
if(role==='host')startHost();
else if(role==='client'&&code&&!linked)startClient(code);
else if(role==='local'){hostSelf();render()}
hubPush();
})();
