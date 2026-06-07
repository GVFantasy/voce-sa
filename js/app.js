/* SUBSTITUIDO POR MODULOS ES - ver js/main.js. Este arquivo e backup. NAO carregar junto com main.js.
const SUPABASE_URL='https://dwazoldkxgscdkpzaqsj.supabase.co';
const SUPABASE_KEY='sb_publishable_O0qMyJ3XNCFisGORFrRdPQ_8e6Bp3VL';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

const ENERGY=['','Baixa','Ok','Alta'];
const ECLASS=['','on-low','on-ok','on-high'];
const DLABELS=['D','S','T','Q','Q','S','S'];
const REFLECTIONS=[
  'Qual foi sua maior conquista hoje?',
  'O que vocÃª aprendeu hoje que pode usar amanhÃ£?',
  'Qual foi sua maior distraÃ§Ã£o hoje?',
  'O que faria diferente se repetisse o dia?',
  'Como seu corpo e mente estÃ£o se sentindo?',
  'O que vocÃª estÃ¡ evitando que precisa enfrentar?',
  'Qual pequena vitÃ³ria merece ser celebrada?',
];
const IDIOMA_MAP={
  ingles:{name:'InglÃªs',icon:'ðŸ‡¬ðŸ‡§'},espanhol:{name:'Espanhol',icon:'ðŸ‡ªðŸ‡¸'},
  alemao:{name:'AlemÃ£o',icon:'ðŸ‡©ðŸ‡ª'},japones:{name:'JaponÃªs',icon:'ðŸ‡¯ðŸ‡µ'},
  frances:{name:'FrancÃªs',icon:'ðŸ‡«ðŸ‡·'},italiano:{name:'Italiano',icon:'ðŸ‡®ðŸ‡¹'},
  mandarin:{name:'Mandarim',icon:'ðŸ‡¨ðŸ‡³'},coreano:{name:'Coreano',icon:'ðŸ‡°ðŸ‡·'},
  russo:{name:'Russo',icon:'ðŸ‡·ðŸ‡º'},arabe:{name:'Ãrabe',icon:'ðŸ‡¸ðŸ‡¦'},
  libras:{name:'Libras',icon:'ðŸ¤Ÿ'},
};
const ACHIEVEMENTS=[
  {id:'primeiro',icon:'ðŸŒ±',name:'Primeiro passo',desc:'Primeiro check-in',check:(l,s)=>l.length>=1},
  {id:'semana1',icon:'ðŸ”¥',name:'7 dias',desc:'7 dias consecutivos',check:(l,s)=>s>=7},
  {id:'mes1',icon:'âš¡',name:'30 dias',desc:'30 dias consecutivos',check:(l,s)=>s>=30},
  {id:'mes3',icon:'ðŸ’Ž',name:'90 dias',desc:'90 dias consecutivos',check:(l,s)=>s>=90},
  {id:'treino10',icon:'ðŸ¥Š',name:'10 treinos',desc:'10 treinos feitos',check:(l,s)=>l.filter(e=>e.habits&&e.habits.treino).length>=10},
  {id:'check30',icon:'ðŸ“…',name:'30 registros',desc:'30 check-ins totais',check:(l,s)=>l.length>=30},
  {id:'check100',icon:'ðŸ†',name:'100 registros',desc:'100 check-ins totais',check:(l,s)=>l.length>=100},
  {id:'perfeito',icon:'âœ¨',name:'Semana perfeita',desc:'Todos os hÃ¡bitos numa semana',check:(l,s)=>{
    const sorted=[...l].sort((a,b)=>a.date.localeCompare(b.date));
    for(let i=0;i<=sorted.length-7;i++){
      if(sorted.slice(i,i+7).every(e=>Object.values(e.habits||{}).some(Boolean)))return true;
    }
    return false;
  }},
  {id:'idioma30',icon:'ðŸ—£ï¸',name:'30 dias de idioma',desc:'30 dias estudando idioma',check:(l,s)=>{
    return l.filter(e=>e.habits&&Object.keys(e.habits).some(k=>IDIOMA_MAP[k]&&e.habits[k])).length>=30;
  }},
];

let currentUser=null,userCfg={},userHabits=[],log=[],period='semana',authMode='login';
let ts={habits:{},energy:0,nota:'',idiomDetails:{}};
let obData={areas:[],exercicios:[],idiomas:[],idiomasAtivos:[],aprender:[],horario:'',tempoLivre:'',corpoNivel:'',treinoDias:[],idiomaDias:[0,1,2,3,4,5,6],estudoDias:[],situation:'',metas:[],meta:''};
let pomodoro={timer:null,seconds:25*60,isRunning:false,isBreak:false,sessions:0,subject:''};
let reviewData={feel:'',adjust:[]};

// TOAST GLOBAL
let _toastTimer=null;
function showToast(msg,type='suc',duration){
  const el=document.getElementById('g-toast');
  if(!el)return;
  const d=duration||(type==='err'?6000:3000);
  if(_toastTimer)clearTimeout(_toastTimer);
  el.textContent=msg;
  el.className='g-toast '+type+' show';
  if(type==='err'){el.onclick=()=>{el.classList.remove('show');};}
  else{el.onclick=null;}
  _toastTimer=setTimeout(()=>el.classList.remove('show'),d);
}

// INLINE FIELD ERROR HELPERS
function showFieldErr(fieldId,errId,msg){
  const input=document.getElementById(fieldId);
  const err=document.getElementById(errId);
  if(input)input.classList.add('invalid');
  if(err){err.textContent=msg;err.classList.add('show');}
}
function clearFieldErr(errId){
  const err=document.getElementById(errId);
  if(err){err.textContent='';err.classList.remove('show');}
  const input=document.getElementById(errId.replace('-err',''));
  if(input)input.classList.remove('invalid');
}

// DATE
const todayKey=()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const fmtDate=iso=>new Date(iso+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'});
const isExpected=(h,date)=>{
  if(h.allDays)return true;
  if(h.weekdays)return h.weekdays.includes(new Date(date+'T12:00:00').getDay());
  return false;
};

// STORAGE
const getCfg=()=>{try{return JSON.parse(localStorage.getItem('voce_sa_cfg_'+(currentUser?.id||''))||'{}')}catch(e){return{}}};
const saveCfgLocal=()=>{try{localStorage.setItem('voce_sa_cfg_'+(currentUser?.id||''),JSON.stringify(userCfg));return true;}catch(e){return false;}};
async function saveCfgRemote(){
  if(!currentUser)return false;
  try{
    const{error}=await sb.from('user_config').upsert({user_id:currentUser.id,config:userCfg},{onConflict:'user_id'});
    if(error)throw error;
    return true;
  }catch(e){
    setSyncStatus('err','Sem conexÃ£o');
    return false;
  }
}
async function saveCfgAll(showFeedback){
  saveCfgLocal();
  setSyncStatus('syncing','Salvando...');
  const ok=await saveCfgRemote();
  if(ok){setSyncStatus('ok','Sincronizado');if(showFeedback)showToast('ConfiguraÃ§Ãµes salvas');}
  else{if(showFeedback)showToast('Salvo localmente. Sem conexÃ£o com o servidor.','info');}
}
async function loadCfgRemote(){
  try{
    const{data}=await sb.from('user_config').select('config').eq('user_id',currentUser.id).single();
    if(data?.config&&data.config.name){
      userCfg=data.config;
      saveCfgLocal();
      return true;
    }
  }catch(e){}
  return false;
}

// SYNC
function setSyncStatus(s,msg){
  document.getElementById('sync-dot').className='sync-dot '+s;
  document.getElementById('sync-txt').textContent=msg;
}

function getActiveQ(s){
  if(!s)return 1;
  const m=Math.floor((new Date()-new Date(s))/86400000/30);
  return m<3?1:m<6?2:m<9?3:4;
}

function calcStreak(lg){
  let s=0;let d=new Date();d.setDate(d.getDate()-1);
  while(s<365){const k=dateKey(d);const e=lg.find(x=>x.date===k);if(!e||!Object.values(e.habits||{}).some(Boolean))break;s++;d.setDate(d.getDate()-1);}
  const te=lg.find(x=>x.date===todayKey());if(te&&Object.values(te.habits||{}).some(Boolean))s++;
  return s;
}

function getBestStreak(lg){
  let best=0,cur=0;
  const sorted=[...lg].sort((a,b)=>a.date.localeCompare(b.date));
  sorted.forEach((e,i)=>{
    if(Object.values(e.habits||{}).some(Boolean)){
      if(i===0){cur=1;}else{const diff=(new Date(e.date+'T12:00:00')-new Date(sorted[i-1].date+'T12:00:00'))/86400000;cur=diff===1?cur+1:1;}
      if(cur>best)best=cur;
    }
  });
  return best;
}

function getPeriodDates(p){
  const today=new Date();const days=[];
  if(p==='semana'){for(let i=6;i>=0;i--){const d=new Date(today);d.setDate(today.getDate()-i);days.push(dateKey(d));}}
  else if(p==='mes'){const y=today.getFullYear(),m=today.getMonth();const dim=new Date(y,m+1,0).getDate();for(let i=1;i<=dim;i++){days.push(dateKey(new Date(y,m,i)));}}
  else if(p==='trimestre'){const aq=getActiveQ(userCfg.startDate);const start=new Date(userCfg.startDate||todayKey());const qs=new Date(start);qs.setMonth(start.getMonth()+(aq-1)*3);const qe=new Date(qs);qe.setMonth(qs.getMonth()+3);let d=new Date(qs);while(d<=today&&d<qe){days.push(dateKey(d));d.setDate(d.getDate()+1);}}
  else{const start=new Date(userCfg.startDate||todayKey());let d=new Date(start);while(d<=today){days.push(dateKey(d));d.setDate(d.getDate()+1);}}
  return days;
}

// AUTH
function toggleAuthMode(){
  authMode=authMode==='login'?'signup':'login';
  const isLogin=authMode==='login';
  document.getElementById('auth-btn').textContent=isLogin?'Entrar':'Criar conta';
  document.getElementById('auth-toggle').innerHTML=isLogin?'NÃ£o tem conta? <span>Criar conta grÃ¡tis</span>':'JÃ¡ tem conta? <span>Entrar</span>';
  document.getElementById('auth-err').textContent='';
}

async function submitAuth(){
  const emailEl=document.getElementById('auth-email');
  const passEl=document.getElementById('auth-pass');
  const email=emailEl.value.trim();
  const pass=passEl.value;
  const errEl=document.getElementById('auth-err');
  const btn=document.getElementById('auth-btn');
  const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let hasErr=false;
  clearFieldErr('auth-email-err');clearFieldErr('auth-pass-err');errEl.textContent='';
  if(!email){showFieldErr('auth-email','auth-email-err','Informe seu email.');hasErr=true;}
  else if(!emailRegex.test(email)){showFieldErr('auth-email','auth-email-err','Email invÃ¡lido.');hasErr=true;}
  if(!pass){showFieldErr('auth-pass','auth-pass-err','Informe sua senha.');hasErr=true;}
  else if(pass.length<6){showFieldErr('auth-pass','auth-pass-err','Senha deve ter pelo menos 6 caracteres.');hasErr=true;}
  if(hasErr)return;
  btn.disabled=true;btn.textContent='Aguarde...';
  const result=authMode==='login'
    ?await sb.auth.signInWithPassword({email,password:pass})
    :await sb.auth.signUp({email,password:pass});
  btn.disabled=false;btn.textContent=authMode==='login'?'Entrar':'Criar conta';
  if(result.error){
    const msg=result.error.message;
    const isEmailErr=msg.toLowerCase().includes('email')||msg.toLowerCase().includes('user');
    const isPassErr=msg.toLowerCase().includes('password')||msg.toLowerCase().includes('invalid login');
    if(isEmailErr&&!isPassErr)showFieldErr('auth-email','auth-email-err',msg);
    else if(isPassErr)showFieldErr('auth-pass','auth-pass-err','Email ou senha incorretos.');
    else errEl.textContent=msg;
    return;
  }
  if(authMode==='signup'&&!result.data.session){
    errEl.style.color='var(--suc-txt)';errEl.textContent='Conta criada! Confirme seu email para entrar.';return;
  }
  currentUser=result.data.user;await afterLogin();
}

async function signOut(){
  await sb.auth.signOut();
  currentUser=null;log=[];userCfg={};userHabits=[];
  document.getElementById('app').style.display='none';
  document.getElementById('pg-auth').style.display='block';
}

async function afterLogin(){
  userCfg=getCfg();
  if(!userCfg.name||!userCfg.startDate){
    const found=await loadCfgRemote();
    if(found){
      document.getElementById('pg-auth').style.display='none';
      buildHabitsFromCfg();startApp();return;
    }
    document.getElementById('pg-auth').style.display='none';
    startOnboarding();
  } else {
    document.getElementById('pg-auth').style.display='none';
    buildHabitsFromCfg();startApp();
  }
}

// HABITS
function buildHabitsFromCfg(){
  userHabits=[];
  userHabits.push({id:'sono',icon:'ðŸŒ™',name:'Sono 7h+',days:'todo dia',allDays:true,hasDetail:false});
  const idiomasAtivos=userCfg.idiomasAtivos||['ingles'];
  const idiomaDias=userCfg.idiomaDias||[0,1,2,3,4,5,6];
  idiomasAtivos.forEach(id=>{
    if(IDIOMA_MAP[id]){
      const daysLabel=idiomaDias.length===7?'todo dia':idiomaDias.map(d=>DLABELS[d]).join(', ');
      userHabits.push({
        id,icon:IDIOMA_MAP[id].icon,name:IDIOMA_MAP[id].name,
        days:daysLabel,allDays:idiomaDias.length===7,
        weekdays:idiomaDias.length<7?idiomaDias:undefined,
        hasDetail:true,
        detailOptions:{
          time:['10min','15min','20min','30min','45min','60min'],
          method:['Podcast','Duolingo','Shadowing','SÃ©rie','Aula','Anki','Livro']
        }
      });
    }
  });
  const areas=userCfg.areas||['corpo'];
  if(areas.includes('corpo')){
    const treinoDias=userCfg.treinoDias||[2,4,6];
    const daysLabel=treinoDias.map(d=>['Dom','Seg','Ter','Qua','Qui','Sex','SÃ¡b'][d]).join(', ');
    const exercLabel=userCfg.exercicios&&userCfg.exercicios.length?userCfg.exercicios[0]:'Treino';
    userHabits.push({
      id:'treino',icon:'ðŸ¥Š',name:'Treino',days:daysLabel,
      allDays:false,weekdays:treinoDias,hasDetail:true,
      detailOptions:{time:['30min','45min','60min','90min'],method:userCfg.exercicios&&userCfg.exercicios.length?userCfg.exercicios:['Academia','Corrida','Ciclismo']}
    });
  }
  if(areas.includes('mente')&&(userCfg.aprender||[]).length){
    const estudoDias=userCfg.estudoDias||[0,1,3];
    const daysLabel=estudoDias.map(d=>DLABELS[d]).join(', ');
    userHabits.push({
      id:'estudo',icon:'ðŸ“š',name:'Estudo',days:daysLabel,
      allDays:false,weekdays:estudoDias,hasDetail:true,
      detailOptions:{time:['30min','45min','60min','90min','2h'],method:['Livro','Curso','VÃ­deo','Podcast','PrÃ¡tica']}
    });
  }
  if(areas.includes('negocio')){
    userHabits.push({id:'negocio',icon:'ðŸ’¼',name:'Foco no negÃ³cio',days:'seg a sex',allDays:false,weekdays:[1,2,3,4,5],hasDetail:false});
  }
}

// ONBOARDING
function startOnboarding(){
  document.getElementById('pg-onboard').style.display='block';
  renderObProgress();showObStep(1);
}

function renderObProgress(){
  const total=3;let html='';
  for(let i=1;i<=total;i++){html+=`<div class="ob-prog-dot ${i<=(obData._step||0)?'done':''}"></div>`;}
  document.getElementById('ob-progress').innerHTML=html;
}

function showObStep(n){
  const current=document.querySelector('.ob-step.on');
  const next=document.getElementById('obs-'+n);
  if(!next)return;
  if(current&&current!==next){
    current.classList.add('out-left');
    setTimeout(()=>{current.classList.remove('on','out-left');},280);
  }
  setTimeout(()=>{
    if(current&&current!==next)current.style.display='none';
    next.style.display='block';
    next.classList.add('on');
  },current?100:0);
  obData._step=n;
  let html='';const total=3;
  for(let i=1;i<=total;i++){html+=`<div class="ob-prog-dot ${i<=n?'done':''}"></div>`;}
  document.getElementById('ob-progress').innerHTML=html;
  // Step 3: mostrar/ocultar seÃ§Ãµes condicionais
  if(n===3){
    const treinoSec=document.getElementById('ob-treino-section');
    const estudoSec=document.getElementById('ob-estudo-section');
    if(treinoSec)treinoSec.style.display=obData.areas.includes('corpo')?'block':'none';
    if(estudoSec)estudoSec.style.display=obData.areas.includes('mente')?'block':'none';
  }
}

function obNext(step){
  if(step===1){
    if(!obData.situation){showToast('Selecione como estÃ¡ sua vida hoje.','info',3000);return;}
    obData.name=currentUser?.email?.split('@')[0]||'UsuÃ¡rio';
    showObStep(2);
  }
  else if(step===2){
    if(!obData.areas.length){showToast('Selecione pelo menos uma Ã¡rea para desenvolver.','info',3000);return;}
    if(!obData.metas||!obData.metas.length){showToast('Selecione sua maior prioridade em 12 meses.','info',3000);return;}
    showObStep(3);
  }
  else if(step===3){
    obData.meta=(obData.metas||[]).join(', ');
    // Defaults para campos removidos
    obData.corpoNivel=obData.corpoNivel||'irregular';
    obData.exercicios=obData.exercicios.length?obData.exercicios:['academia'];
    obData.horario='comercial';
    obData.tempoLivre='1h';
    obData.idiomas=obData.idiomas.length?obData.idiomas:['ingles'];
    showObStep(4);generatePlan();
  }
}

function obBack(step){
  if(step===2)showObStep(1);
  else if(step===3)showObStep(2);
}

function obToggleOpt(group,btn){
  btn.classList.toggle('on');
  const val=btn.dataset.val;
  if(!obData.metas)obData.metas=[];
  const idx=obData.metas.indexOf(val);
  if(idx>=0)obData.metas.splice(idx,1);else obData.metas.push(val);
}

function obSingleMeta(btn){
  const parent=btn.closest('.ob-options');
  if(parent)parent.querySelectorAll('.ob-option').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  obData.metas=[btn.dataset.val];
  checkObStep2();
}

function checkObStep2(){
  const btn=document.getElementById('ob-next-2');
  if(btn)btn.disabled=!(obData.areas.length>=1&&obData.metas&&obData.metas.length>=1);
}

function obToggleArea(btn){
  const val=btn.dataset.val;const idx=obData.areas.indexOf(val);
  if(idx>=0){obData.areas.splice(idx,1);btn.classList.remove('on');}
  else{obData.areas.push(val);btn.classList.add('on');}
  checkObStep2();
}

function obToggleChip(group,btn){
  const val=btn.dataset.val;
  let arr=group==='exercicio'?obData.exercicios:group==='idioma'?obData.idiomas:obData.aprender;
  const idx=arr.indexOf(val);
  if(idx>=0){arr.splice(idx,1);btn.classList.remove('on');}
  else{arr.push(val);btn.classList.add('on');}
}

function obToggleDay(group,btn){
  const val=parseInt(btn.dataset.val);
  let arr=group==='treino'?obData.treinoDias:group==='idioma'?obData.idiomaDias:obData.estudoDias;
  const idx=arr.indexOf(val);
  if(idx>=0){arr.splice(idx,1);btn.classList.remove('on');}
  else{arr.push(val);btn.classList.add('on');}
}

function obSingle(group,btn){
  const parent=btn.closest('.ob-options,.ob-chips');
  if(parent)parent.querySelectorAll('.ob-option,.ob-chip').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  if(group==='horario')obData.horario=btn.dataset.val;
  else if(group==='tempo-livre')obData.tempoLivre=btn.dataset.val;
  else if(group==='corpo-nivel')obData.corpoNivel=btn.dataset.val;
  else if(group==='situation'){obData.situation=btn.dataset.val;const nb=document.getElementById('ob-next-1');if(nb)nb.disabled=false;}
  else if(group==='livro-tipo')newLivroTipo=btn.dataset.val;
  else if(group==='pomo-sub')pomodoro.subject=btn.dataset.val;
}

async function generatePlan(){
  const msgs=['Analisando seu perfil...','Definindo pilares...','Gerando OKRs...','Montando rotina...','Finalizando...'];
  let i=0;const el=document.getElementById('ob-generating');
  const iv=setInterval(()=>{if(i<msgs.length){el.textContent=msgs[i];i++;}},600);
  const idiomasAtivos=obData.idiomas.length?obData.idiomas.slice(0,2):['ingles'];
  const cfg={
    name:obData.name,startDate:todayKey(),areas:obData.areas,meta:obData.meta,
    situation:obData.situation,
    exercicios:obData.exercicios.length?obData.exercicios:['academia'],
    idiomasAtivos,idiomasPlano:obData.idiomas.length?obData.idiomas:['ingles'],aprender:[],
    horario:'comercial',tempoLivre:'1h',
    corpoNivel:obData.corpoNivel||'irregular',
    treinoDias:obData.treinoDias.length?obData.treinoDias:[2,4,6],
    idiomaDias:obData.idiomaDias.length?obData.idiomaDias:[0,1,2,3,4,5,6],
    estudoDias:obData.estudoDias.length?obData.estudoDias:[0,1,3],
    sonoMeta:7,inglesMeta:20,
  };
setTimeout(async()=>{
    clearInterval(iv);
    userCfg=cfg;
    saveCfgLocal();
    setSyncStatus('syncing','Salvando...');
    const ok=await saveCfgRemote();
    if(ok){setSyncStatus('ok','Sincronizado');}
    else{setSyncStatus('err','Salvo localmente');}
    document.getElementById('pg-onboard').style.display='none';
    buildHabitsFromCfg();startApp();
  },3200);}

// APP
function startApp(){
  document.getElementById('app').style.display='block';
  document.getElementById('user-info').textContent=currentUser?.email?.split('@')[0]||'';
applyDarkIfSaved();initReminder();loadLog();
}

async function loadLog(){
  if(!currentUser)return;
  setSyncStatus('syncing','Sincronizando...');
  const{data,error}=await sb.from('checkins').select('*').eq('user_id',currentUser.id).order('date',{ascending:false}).limit(365);
  if(error){
    setSyncStatus('err','Sem conexÃ£o');
    showToast('NÃ£o foi possÃ­vel sincronizar dados. Trabalhando offline.','info');
    // Tenta usar cache local se disponÃ­vel
    renderCheckin();renderDashboard();renderHistorico();renderOKRs();renderPerfil();renderConquistas();
    return;
  }
  log=data.map(r=>({date:r.date,habits:r.habits||{},energy:r.energy||0,nota:r.nota||'',idiomDetails:r.idiomDetails||{}}));
  setSyncStatus('ok','Sincronizado');
  renderCheckin();renderDashboard();renderHistorico();renderOKRs();renderPerfil();renderConquistas();
}

// CHECK-IN
function renderCheckin(){
  const today=todayKey();
  const ex=log.find(e=>e.date===today);
  ts=ex?{habits:{...ex.habits},energy:ex.energy||0,nota:ex.nota||'',idiomDetails:{...ex.idiomDetails||{}}}:{habits:{},energy:0,nota:'',idiomDetails:{}};
  const h=new Date().getHours();
  document.getElementById('greeting').textContent=(h<12?'Bom dia':h<18?'Boa tarde':'Boa noite')+', '+userCfg.name;
  document.getElementById('sub-date').textContent=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
  document.getElementById('streak-val').textContent=calcStreak(log)+'d';
  document.getElementById('reflection-q').textContent=REFLECTIONS[new Date().getDay()%REFLECTIONS.length];
  if(new Date().getDay()===5){document.getElementById('weekly-review-banner').style.display='block';renderWeeklyReview();}
  else document.getElementById('weekly-review-banner').style.display='none';
  if(!userHabits.length){
    document.getElementById('habit-list').innerHTML='<div class="empty-state"><strong>Nenhum hÃ¡bito configurado</strong>VÃ¡ em ConfiguraÃ§Ãµes (âš™ï¸) para definir suas Ã¡reas e hÃ¡bitos do plano de 12 meses.</div>';
  } else {
  document.getElementById('habit-list').innerHTML=userHabits.map(h=>{
    const done=!!ts.habits[h.id];const exp=isExpected(h,today);const isExtra=done&&!exp;
    return`<div class="habit-card ${done?'done':''} ${!exp&&!done?'skip':''}" id="hcard-${h.id}">
      <div class="habit-main" onclick="toggleHabit('${h.id}')">
        <div class="habit-left"><div class="habit-icon">${h.icon}</div>
        <div><div class="habit-name">${h.name}${isExtra?'<span class="habit-extra-tag">extra</span>':''}</div><div class="habit-days">${exp?h.days:'toque para registrar como extra'}</div></div></div>
        <div class="habit-toggle">${done?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':''}</div>
      </div>
      ${h.hasDetail?`<div class="habit-detail ${done?'open':''}" id="hdetail-${h.id}">
        <div class="hd-label">Tempo</div>
        <div class="hd-chips">${h.detailOptions.time.map(t=>`<button class="hd-chip ${(ts.idiomDetails[h.id]||{}).time===t?'on':''}" onclick="setHabitDetail('${h.id}','time','${t}')">${t}</button>`).join('')}</div>
        <div class="hd-label">MÃ©todo</div>
        <div class="hd-chips">${h.detailOptions.method.map(m=>`<button class="hd-chip ${(ts.idiomDetails[h.id]||{}).method===m?'on':''}" onclick="setHabitDetail('${h.id}','method','${m}')">${m}</button>`).join('')}</div>
      </div>`:''}
    </div>`;
  }).join('');
  }
  [1,2,3].forEach(i=>{const b=document.getElementById('e'+i);if(b)b.className='e-btn'+(ts.energy===i?' '+ECLASS[i]:'');});
  const na=document.getElementById('nota-area');if(na)na.value=ts.nota;
}

function toggleHabit(id){
  ts.habits[id]=!ts.habits[id];const done=ts.habits[id];
  const card=document.getElementById('hcard-'+id);if(!card)return;
  const h=userHabits.find(x=>x.id===id);
  const exp=h?isExpected(h,todayKey()):true;const isExtra=done&&!exp;
  card.className='habit-card'+(done?' done':'');
  card.querySelector('.habit-toggle').innerHTML=done?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':'';
  const nameEl=card.querySelector('.habit-name');if(nameEl&&h)nameEl.innerHTML=h.name+(isExtra?'<span class="habit-extra-tag">extra</span>':'');
  const detail=document.getElementById('hdetail-'+id);if(detail)detail.classList.toggle('open',done);
  if(done){card.classList.add('pop');setTimeout(()=>card.classList.remove('pop'),200);}
}

function setHabitDetail(habitId,key,val){
  if(!ts.idiomDetails[habitId])ts.idiomDetails[habitId]={};
  ts.idiomDetails[habitId][key]=val;
  const detail=document.getElementById('hdetail-'+habitId);if(!detail)return;
  const groups=detail.querySelectorAll('.hd-chips');
  groups.forEach((group,gi)=>{
    const gKey=gi===0?'time':'method';
    if(gKey===key){group.querySelectorAll('.hd-chip').forEach(chip=>{chip.classList.toggle('on',chip.textContent===val);});}
  });
}

function setEnergy(val){
  ts.energy=val;
  [1,2,3].forEach(i=>{const b=document.getElementById('e'+i);if(b)b.className='e-btn'+(i===val?' '+ECLASS[i]:'');});
}

async function saveDay(){
  if(!currentUser){showToast('SessÃ£o expirada. FaÃ§a login novamente.','err');return;}
  const na=document.getElementById('nota-area');ts.nota=na?na.value:'';
  const btn=document.getElementById('save-btn');btn.disabled=true;btn.textContent='Salvando...';
  const entry={date:todayKey(),habits:{...ts.habits},energy:ts.energy,nota:ts.nota,idiomDetails:{...ts.idiomDetails}};
  const idx=log.findIndex(e=>e.date===todayKey());
  if(idx>=0)log[idx]=entry;else log.unshift(entry);
  const prevStreak=calcStreak(log.filter(e=>e.date!==todayKey()));
  const newStreak=calcStreak(log);
  document.getElementById('streak-val').textContent=newStreak+'d';
  setSyncStatus('syncing','Salvando...');
  try{
    const{error}=await sb.from('checkins').upsert({
      user_id:currentUser.id,date:todayKey(),
      habits:ts.habits,energy:ts.energy,nota:ts.nota,idiomDetails:ts.idiomDetails
    },{onConflict:'user_id,date'});
    btn.disabled=false;btn.textContent='Salvar check-in';
    if(error){
      setSyncStatus('err','Erro ao salvar');
      showToast('Erro ao salvar: '+error.message,'err');
    } else {
      setSyncStatus('ok','Sincronizado');
      const t=document.getElementById('toast');if(t)t.textContent='';
      showToast('Check-in salvo com sucesso!');
      btn.classList.add('saved');setTimeout(()=>btn.classList.remove('saved'),1200);
    }
  }catch(e){
    btn.disabled=false;btn.textContent='Salvar check-in';
    setSyncStatus('err','Sem conexÃ£o');
    showToast('Check-in salvo localmente. Sem conexÃ£o com o servidor.','info');
  }
  if(newStreak>0&&newStreak>=prevStreak)showBoom(newStreak);
  renderDashboard();renderHistorico();renderConquistas();
}

// REVISÃƒO SEMANAL
function renderWeeklyReview(){
  const dates=getPeriodDates('semana');let html='';
  userHabits.forEach(h=>{
    let done=0,possible=0;
    dates.forEach(date=>{if(isExpected(h,date)){possible++;const e=log.find(x=>x.date===date);if(e&&e.habits[h.id])done++;}});
    const pct=possible>0?Math.round(done/possible*100):0;
    const cls=pct>=80?'rs-ok':pct>=50?'rs-warn':'rs-bad';
    html+=`<div class="review-stat"><div class="rs-label">${h.icon} ${h.name}</div><div class="rs-val ${cls}">${done}/${possible}</div></div>`;
  });
  document.getElementById('review-stats').innerHTML=html;
}

function setReviewFeel(val,btn){
  reviewData.feel=val;
  document.querySelectorAll('#review-feel .review-opt').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
  const box=document.getElementById('review-impact');
  if(val==='pesada'){box.style.display='block';box.textContent='âš ï¸ Semanas pesadas sÃ£o normais. O importante Ã© nÃ£o pular 2 dias seguidos do mesmo hÃ¡bito. Reduza a intensidade, nÃ£o a frequÃªncia.';}
  else box.style.display='none';
}

function toggleReviewAdjust(val,btn){
  btn.classList.toggle('on');const idx=reviewData.adjust.indexOf(val);
  if(idx>=0)reviewData.adjust.splice(idx,1);else reviewData.adjust.push(val);
}

function saveWeeklyReview(){
  document.getElementById('weekly-review-banner').style.display='none';
  const t=document.getElementById('toast');t.textContent='âœ“ RevisÃ£o salva!';setTimeout(()=>{t.textContent='';},2000);
  showToast('RevisÃ£o da semana salva!');
}

// DASHBOARD
function generateDashboardInsight(){
  const today=todayKey();const streak=calcStreak(log);
  const dates7=getPeriodDates('semana');
  let done7=0,possible7=0;
  dates7.forEach(date=>{const entry=log.find(e=>e.date===date);userHabits.forEach(h=>{if(isExpected(h,date)){possible7++;if(entry&&entry.habits[h.id])done7++;}});});
  const pct7=possible7>0?Math.round(done7/possible7*100):0;
  const aq=getActiveQ(userCfg.startDate);
  const ql=['','FundaÃ§Ã£o','AceleraÃ§Ã£o','Escala','Colheita'];
  // Calcular dias do trimestre
  const start=new Date(userCfg.startDate||today);
  const qs=new Date(start);qs.setMonth(start.getMonth()+(aq-1)*3);
  const qe=new Date(qs);qe.setMonth(qs.getMonth()+3);
  const trimTotal=Math.round((qe-qs)/86400000);
  const trimPassed=Math.min(Math.round((new Date()-qs)/86400000),trimTotal);
  const trimPct=Math.round(trimPassed/trimTotal*100);
  // Encontrar hÃ¡bito mais atrasado
  let worstHabit=null,worstPct=100;
  userHabits.forEach(h=>{
    let hd=0,hp=0;
    dates7.forEach(date=>{if(isExpected(h,date)){hp++;const e=log.find(x=>x.date===date);if(e&&e.habits[h.id])hd++;}});
    const p=hp>0?Math.round(hd/hp*100):0;
    if(hp>0&&p<worstPct){worstPct=p;worstHabit=h;}
  });
  // Mensagem principal
  let msg,sub,color,label;
  if(streak===0){
    msg='Hora de comeÃ§ar. O primeiro passo Ã© o mais importante.';
    sub='FaÃ§a seu check-in de hoje e plante a semente da consistÃªncia.';
    color='roxo';label='Vamos lÃ¡';
  } else if(streak>=30){
    msg=`${streak} dias consecutivos. VocÃª estÃ¡ construindo algo sÃ³lido.`;
    sub='Esse nÃ­vel de consistÃªncia jÃ¡ coloca vocÃª na frente de 95% das pessoas. Continue.';
    color='verde';label='Streak impressionante';
  } else if(streak>=7){
    msg=`${streak} dias. A sequÃªncia estÃ¡ tomando forma.`;
    sub=streak<14?'Mais uma semana assim e o hÃ¡bito comeÃ§a a se instalar no automÃ¡tico.':'VocÃª estÃ¡ no ritmo. Proteja essa sequÃªncia â€” ela vale muito.';
    color='verde';label='SequÃªncia ativa';
  } else if(pct7>=80){
    msg='Semana forte. VocÃª estÃ¡ dentro da meta.';
    sub='Manter esse ritmo por mais 3 semanas instala o hÃ¡bito no piloto automÃ¡tico.';
    color='verde';label='Semana no verde';
  } else if(pct7>=50){
    msg='Semana ok, mas dÃ¡ para mais.';
    sub=worstHabit?`O ${worstHabit.name.toLowerCase()} estÃ¡ em ${worstPct}% essa semana. Um empurrÃ£o aqui faz diferenÃ§a.`:'Pequenos ajustes nos prÃ³ximos dias resolvem.';
    color='ambar';label='Pode melhorar';
  } else if(log.length>0){
    msg='A semana foi difÃ­cil. Tudo bem.';
    sub='Semanas ruins acontecem. O que importa Ã© nÃ£o deixar 2 dias seguidos sem registrar. ComeÃ§a agora.';
    color='coral';label='Hora de retomar';
  } else {
    msg='Plano criado. Agora Ã© hora de colocar em prÃ¡tica.';
    sub='FaÃ§a seu primeiro check-in hoje. O plano de 12 meses comeÃ§a com um Ãºnico dia.';
    color='roxo';label='Pronto para comeÃ§ar';
  }
  return{msg,sub,color,label,streak,pct7,worstHabit,worstPct,trimPct,trimPassed,trimTotal,aq,ql};
}

function renderDashboard(){
  const today=todayKey();
  const insight=generateDashboardInsight();
  // Hero
  document.getElementById('dash-hero-wrap').innerHTML=`
    <div class="dash-hero ${insight.color}">
      <div class="dash-hero-label">${insight.label}</div>
      <div class="dash-hero-msg">${insight.msg}</div>
      <div class="dash-hero-sub">${insight.sub}</div>
    </div>`;
  // Foco da semana
  if(insight.worstHabit&&insight.worstPct<80){
    document.getElementById('dash-focus-wrap').innerHTML=`
      <div class="dash-focus">
        <div class="dash-focus-label">Foco desta semana</div>
        <div class="dash-focus-text">${insight.worstHabit.icon} ${insight.worstHabit.name} â€” ${insight.worstPct}% concluÃ­do. EstÃ¡ abaixo da meta.</div>
      </div>`;
  } else {
    document.getElementById('dash-focus-wrap').innerHTML='';
  }
  // Barra do trimestre
  document.getElementById('dash-trim-wrap').innerHTML=`
    <div class="trim-bar-wrap">
      <div class="trim-label">
        <span>Q${insight.aq} â€” ${insight.ql[insight.aq]}</span>
        <span>${insight.trimPct}% do trimestre</span>
      </div>
      <div class="trim-bar-bg"><div class="trim-bar-fill" style="width:${insight.trimPct}%"></div></div>
      <div class="trim-days"><span>${insight.trimPassed} dias passados</span><span>${insight.trimTotal-insight.trimPassed} dias restantes</span></div>
    </div>`;
  // Quick stats inline
  const streak2=calcStreak(log);
  const thisWeekQS=getPeriodDates('semana');
  let qsDone=0,qsPoss=0;
  thisWeekQS.forEach(date=>{const entry=log.find(e=>e.date===date);userHabits.forEach(h=>{if(isExpected(h,date)){qsPoss++;if(entry&&entry.habits[h.id])qsDone++;}});});
  const qsPct=qsPoss>0?Math.round(qsDone/qsPoss*100):0;
  const qsEl=document.getElementById('dash-quick-stats');
  if(qsEl)qsEl.innerHTML=`
    <div class="dqs-item"><div class="dqs-val">${streak2}d</div><div class="dqs-label">streak</div></div>
    <div class="dqs-sep"></div>
    <div class="dqs-item"><div class="dqs-val">${qsPct}%</div><div class="dqs-label">semana</div></div>
    <div class="dqs-sep"></div>
    <div class="dqs-item"><div class="dqs-val">${log.length}</div><div class="dqs-label">registros</div></div>`;
  // Stats
  const dates=getPeriodDates(period);let td=0,tp=0;
  dates.forEach(date=>{const entry=log.find(e=>e.date===date);userHabits.forEach(h=>{if(isExpected(h,date)){tp++;if(entry&&entry.habits[h.id])td++;}});});
  const pct=tp>0?Math.round(td/tp*100):0;
  const streak=calcStreak(log);const best=getBestStreak(log);
  const eVals=log.filter(e=>e.energy>0).map(e=>e.energy);
  const avgE=eVals.length?Math.round(eVals.reduce((a,b)=>a+b,0)/eVals.length*10)/10:0;
  document.getElementById('dash-stats').innerHTML=`
    <div class="stat"><div class="stat-label">ConclusÃ£o</div><div class="stat-val">${pct}%</div><div class="stat-sub">${td}/${tp} hÃ¡bitos</div></div>
    <div class="stat"><div class="stat-label">Streak</div><div class="stat-val">${streak}d</div><div class="stat-sub">melhor: ${best}d</div></div>
    <div class="stat"><div class="stat-label">Registros</div><div class="stat-val">${log.length}</div><div class="stat-sub">de 365</div></div>
    <div class="stat"><div class="stat-label">Energia</div><div class="stat-val">${avgE>0?ENERGY[Math.round(avgE)]:'â€”'}</div><div class="stat-sub">${avgE>0?avgE.toFixed(1)+'/3':'â€”'}</div></div>`;
  // Heatmap
  const hDays=[];for(let i=83;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);hDays.push(dateKey(d));}
  document.getElementById('heatmap').innerHTML=hDays.map(date=>{
    if(date>today)return`<div class="hm-cell hm-future"></div>`;
    const entry=log.find(e=>e.date===date);if(!entry)return`<div class="hm-cell hm-0"></div>`;
    const done=userHabits.filter(h=>isExpected(h,date)&&entry.habits[h.id]).length;
    const exp=userHabits.filter(h=>isExpected(h,date)).length;
    return`<div class="hm-cell hm-${exp===0?0:Math.ceil(done/exp*4)}" title="${fmtDate(date)}: ${done}/${exp}"></div>`;
  }).join('');
  // Barras 7 dias
  const last7=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);last7.push(dateKey(d));}
  document.getElementById('bar-chart').innerHTML=last7.map(date=>{
    const entry=log.find(e=>e.date===date);
    const exp=userHabits.filter(h=>isExpected(h,date)).length;
    const done=entry?userHabits.filter(h=>isExpected(h,date)&&entry.habits[h.id]).length:0;
    const p2=exp>0?done/exp:0;
    const color=p2>=0.8?'var(--verde)':p2>=0.5?'var(--ambar)':'var(--borda)';
    const dow=new Date(date+'T12:00:00').getDay();
    return`<div class="bc-col"><div class="bc-val">${entry?done:''}</div><div class="bc-bar" style="height:${Math.max(done/(userHabits.length||1)*68,2)}px;background:${color}"></div><div class="bc-label">${DLABELS[dow]}</div></div>`;
  }).join('');
renderEnergyChart();
  // Por hÃ¡bito
  const showDots=period==='semana';
  document.getElementById('dash-habits').innerHTML=userHabits.map(h=>{
    let hd=0,hp=0,extras=0;
    dates.forEach(date=>{const entry=log.find(e=>e.date===date);const exp=isExpected(h,date);if(exp){hp++;if(entry&&entry.habits[h.id])hd++;}else if(entry&&entry.habits[h.id])extras++;});
    const p2=hp>0?Math.round(hd/hp*100):0;
    const color=p2>=80?'var(--verde)':p2>=50?'var(--ambar)':'#E24B4A';
const dots=showDots?('<div class="week-dots">'+dates.map(date=>{const dow=new Date(date+'T12:00:00').getDay();const entry=log.find(e=>e.date===date);const done=entry&&entry.habits[h.id];const isT=date===today;const exp=isExpected(h,date);const cls=(done&&exp?'done ':[])+(done&&!exp?'extra ':[])+(isT&&!done?'today ':[])+((!exp&&!done)?'skip':'');return'<div class="wd '+cls+'">'+DLABELS[dow]+'</div>';}).join('')+'</div>'):'';    return`<div class="card" style="padding:12px 14px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <div style="font-size:13px;font-weight:500">${h.icon} ${h.name}${extras>0?` <span style="font-size:10px;color:var(--ambar);font-weight:600">+${extras} extra</span>`:''}</div>
        <div style="font-size:11px;color:var(--cinza)">${hd}/${hp} Â· ${p2}%</div>
      </div>
      <div class="bar-bg"><div class="bar-fill" style="width:${p2}%;background:${color}"></div></div>${dots}
    </div>`;
  }).join('');
}

function setPeriod(p,el){period=p;document.querySelectorAll('.ptab').forEach(b=>b.classList.remove('on'));el.classList.add('on');renderDashboard();}

// OKRs
function renderOKRs(){
  const aq=getActiveQ(userCfg.startDate);
  const ql=['','FundaÃ§Ã£o','AceleraÃ§Ã£o','Escala','Colheita'];
  const colors=[,'var(--info-bg)','var(--suc-bg)','var(--warn-bg)','var(--dan-bg)'];
  const txts=[,'var(--info-txt)','var(--suc-txt)','var(--warn-txt)','var(--dan-txt)'];
  const qc=['','q1b','q2b','q3b','q4b'];
  document.getElementById('q-badge').innerHTML=`<div class="q-badge-active" style="background:${colors[aq]};color:${txts[aq]}">Q${aq} â€” ${ql[aq]} Â· trimestre ativo</div>`;
  if(userCfg.meta)document.getElementById('user-mission').textContent='"'+userCfg.meta+'"';
  const areas=userCfg.areas||['corpo','mente','negocio','tempo'];
  const areaIcons={corpo:'ðŸƒ',mente:'ðŸ§ ',negocio:'ðŸ’¼',financas:'ðŸ’°',tempo:'â±',relacoes:'â¤ï¸'};
  const areaNames={corpo:'Corpo',mente:'Mente',negocio:'NegÃ³cio',financas:'FinanÃ§as',tempo:'Tempo',relacoes:'RelaÃ§Ãµes'};
  const okrMap={
    corpo:{quarters:[{q:'Q1',label:'Instalar movimento',krs:['Treinar nos dias escolhidos consistentemente','Dormir 7h em 5 dias/semana','Tela off 30 min antes de dormir']},{q:'Q2',label:'Elevar frequÃªncia',krs:['Adicionar mais 1 dia de treino','Sono 7h em 6/7 dias']},{q:'Q3â€“Q4',label:'Alta performance',krs:['4+ treinos/semana','Participar de evento esportivo']}]},
    mente:{quarters:[{q:'Q1',label:'HÃ¡bito diÃ¡rio de aprendizado',krs:['Idioma nos dias escolhidos','Streak de 30 dias','1 livro por mÃªs']},{q:'Q2',label:'ConversaÃ§Ã£o bÃ¡sica',krs:['Conversa simples no idioma principal','Segundo idioma iniciado']},{q:'Q3â€“Q4',label:'FluÃªncia progressiva',krs:['Uso do idioma no trabalho/vida','Terceiro idioma base']}]},
    negocio:{quarters:[{q:'Q1',label:'DiagnÃ³stico + meta',krs:['Mapear receita atual','Definir meta anual','Identificar 3 gargalos']},{q:'Q2',label:'Crescimento',krs:['Aumentar ticket mÃ©dio ou captaÃ§Ã£o','1 tÃ©cnica nova de venda/mÃªs']},{q:'Q3â€“Q4',label:'Escala',krs:['Processos documentados','80% da meta atÃ© setembro']}]},
    financas:{quarters:[{q:'Q1',label:'Controle e diagnÃ³stico',krs:['Mapear todas as despesas','Criar fundo de emergÃªncia']},{q:'Q2',label:'Investimento',krs:['Investir % fixo todo mÃªs','Estudar produto financeiro']},{q:'Q3â€“Q4',label:'Crescimento patrimonial',krs:['Meta de patrimÃ´nio atingida','Renda passiva iniciada']}]},
    tempo:{quarters:[{q:'Q1',label:'Estruturar semana',krs:['Blocos fixos na agenda','RevisÃ£o toda sexta','Eliminar 1 atividade improdutiva']},{q:'Q2',label:'ProteÃ§Ã£o do tempo',krs:['Deep work diÃ¡rio de 90 min','Delegar 1 tarefa operacional']},{q:'Q3â€“Q4',label:'Piloto automÃ¡tico',krs:['HÃ¡bitos sem forÃ§a de vontade','FÃ©rias de 3â€“5 dias']}]},
    relacoes:{quarters:[{q:'Q1',label:'PresenÃ§a e qualidade',krs:['1 encontro intencional/semana','Reduzir tempo de tela social']},{q:'Q2',label:'Aprofundamento',krs:['Cultivar 3 relaÃ§Ãµes importantes','Novas conexÃµes profissionais']},{q:'Q3â€“Q4',label:'Comunidade',krs:['Grupo com propÃ³sito','Relacionamentos que energizam']}]},
  };
  document.getElementById('pillar-list').innerHTML=areas.map(area=>{
    const okr=okrMap[area];if(!okr)return'';
    return`<div class="pillar-card">
      <div class="pillar-header" onclick="togglePillar(this)"><div class="pillar-title">${areaIcons[area]||'â­'} ${areaNames[area]||area}</div><div class="pillar-chev">â€º</div></div>
      <div class="pillar-body">${okr.quarters.map(qo=>{const qn=parseInt(qo.q);const isA=qn===aq||(qo.q.includes('â€“')&&aq>=3);return`<div class="okr-q ${isA?'aq':''}"><div class="okr-q-lbl">${qo.q}${isA?' â† vocÃª estÃ¡ aqui':''}</div><div class="okr-q-title"><span class="qbadge ${qc[qn]||'q3b'}">${qo.q}</span> ${qo.label}</div>${qo.krs.map(kr=>`<div class="kr">${kr}</div>`).join('')}</div>`;}).join('')}</div>
    </div>`;
  }).join('');
}

function togglePillar(hdr){const body=hdr.nextElementSibling;const chev=hdr.querySelector('.pillar-chev');body.classList.toggle('open');chev.style.transform=body.classList.contains('open')?'rotate(90deg)':'';}

// HISTÃ“RICO
function renderHistorico(){
  const hl=document.getElementById('history-list');
  if(!log.length){hl.innerHTML='<div class="empty-state"><strong>Nenhum registro ainda</strong>FaÃ§a seu primeiro check-in na aba <b>Hoje</b> para comeÃ§ar a construir seu histÃ³rico.<br><br>Cada dia registrado Ã© um tijolo do seu progresso de 12 meses.</div>';return;}
  hl.innerHTML=log.slice(0,30).map(e=>{
    const done=userHabits.filter(h=>e.habits&&e.habits[h.id]&&isExpected(h,e.date));
    const extras=userHabits.filter(h=>e.habits&&e.habits[h.id]&&!isExpected(h,e.date));
    const miss=userHabits.filter(h=>isExpected(h,e.date)&&!(e.habits&&e.habits[h.id]));
    const eLabel=e.energy?ENERGY[e.energy]:'';const nota=e.nota?e.nota.slice(0,60)+(e.nota.length>60?'â€¦':''):'';
    return`<div class="hi-item"><div class="hi-date">${fmtDate(e.date)}</div>
      <div class="hi-tags">
        ${done.map(h=>`<span class="hi-tag done">${h.icon} ${h.name}</span>`).join('')}
        ${extras.map(h=>`<span class="hi-tag extra">${h.icon} extra</span>`).join('')}
        ${miss.map(h=>`<span class="hi-tag miss">${h.icon} ${h.name}</span>`).join('')}
      </div>
      ${eLabel||nota?`<div class="hi-meta">${eLabel?'Energia: '+eLabel:''}${eLabel&&nota?' Â· ':''}${nota}</div>`:''}</div>`;
  }).join('');
}

// CONQUISTAS
function renderConquistas(){
  const streak=calcStreak(log);const best=getBestStreak(log);
  document.getElementById('streak-big-num').textContent=streak;
  let bestLabel='';
  if(streak===0&&log.length===0){bestLabel='FaÃ§a seu primeiro check-in hoje para iniciar sua sequÃªncia.';}
  else if(streak===0&&log.length>0){bestLabel=best>0?`Sua melhor sequÃªncia foi ${best} dias. Hora de recomeÃ§ar.`:'FaÃ§a um check-in hoje para iniciar sua sequÃªncia.';}
  else if(best>streak){bestLabel=`Melhor sequÃªncia: ${best} dias`;}
  else if(best>0&&best===streak){bestLabel=`Esse Ã© seu recorde!`;}
  document.getElementById('streak-best-label').textContent=bestLabel;
  document.getElementById('achiev-grid').innerHTML=ACHIEVEMENTS.map(a=>{
    const unlocked=a.check(log,streak);
    return`<div class="achiev-card ${unlocked?'unlocked':''}"><div class="achiev-icon">${a.icon}</div><div class="achiev-name">${a.name}</div><div class="achiev-desc">${a.desc}</div></div>`;
  }).join('');
}

// POMODORO
function pomodoroToggle(){
  if(pomodoro.isRunning){clearInterval(pomodoro.timer);pomodoro.isRunning=false;document.getElementById('pomo-start').textContent='Continuar';document.getElementById('pomo-circle').classList.remove('running','break');}
  else{pomodoro.isRunning=true;document.getElementById('pomo-start').textContent='Pausar';const circle=document.getElementById('pomo-circle');circle.classList.toggle('running',!pomodoro.isBreak);circle.classList.toggle('break',pomodoro.isBreak);
    pomodoro.timer=setInterval(()=>{pomodoro.seconds--;if(pomodoro.seconds<=0){clearInterval(pomodoro.timer);pomodoro.isRunning=false;if(!pomodoro.isBreak){pomodoro.sessions++;pomodoro.isBreak=true;pomodoro.seconds=5*60;document.getElementById('pomo-label').textContent='Pausa';document.getElementById('pomo-complete').style.display='block';renderPomodoroSessions();}else{pomodoro.isBreak=false;pomodoro.seconds=25*60;document.getElementById('pomo-label').textContent='Foco';}document.getElementById('pomo-start').textContent='Iniciar';circle.classList.remove('running','break');}renderPomodoroTime();},1000);}
}

function pomodoroReset(){clearInterval(pomodoro.timer);pomodoro.isRunning=false;pomodoro.isBreak=false;pomodoro.seconds=25*60;document.getElementById('pomo-start').textContent='Iniciar';document.getElementById('pomo-label').textContent='Foco';document.getElementById('pomo-circle').classList.remove('running','break');renderPomodoroTime();}
function renderPomodoroTime(){const m=Math.floor(pomodoro.seconds/60);const s=pomodoro.seconds%60;document.getElementById('pomo-time').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
function renderPomodoroSessions(){let html='';for(let i=0;i<4;i++){html+=`<div class="pomo-dot ${i<pomodoro.sessions?'done':''}"></div>`;}document.getElementById('pomo-sessions').innerHTML=html;}

// PERFIL
function renderPerfil(){
  const aq=getActiveQ(userCfg.startDate);
  const ql=['','FundaÃ§Ã£o','AceleraÃ§Ã£o','Escala','Colheita'];
  document.getElementById('prof-nome').textContent=userCfg.name||'';
  document.getElementById('prof-email').textContent=currentUser?.email||'';
  document.getElementById('prof-inicio').textContent=userCfg.startDate?new Date(userCfg.startDate+'T12:00:00').toLocaleDateString('pt-BR'):'â€”';
  document.getElementById('prof-trimestre').textContent=`Q${aq} â€” ${ql[aq]}`;
  if(userCfg.sonoMeta)document.getElementById('pref-sono').value=userCfg.sonoMeta;
  if(userCfg.inglesMeta)document.getElementById('pref-ingles').value=userCfg.inglesMeta;
  const allIdiomas=Object.entries(IDIOMA_MAP).map(([id,v])=>({id,...v}));
  const ativos=userCfg.idiomasAtivos||['ingles'];
  document.getElementById('idiom-toggles').innerHTML=allIdiomas.map(id=>{
    const on=ativos.includes(id.id);
    return`<div class="idiom-row"><div class="idiom-info"><div style="font-size:18px">${id.icon}</div><div><div class="idiom-name">${id.name}</div></div></div><div class="toggle-switch ${on?'on':''}" onclick="toggleIdioma('${id.id}',this)"></div></div>`;
  }).join('');
document.getElementById('dark-toggle').classList.toggle('on',localStorage.getItem('voce_sa_dark')==='1');
  if(userCfg.lembreteHora)document.getElementById('pref-lembrete').value=userCfg.lembreteHora;
  document.getElementById('lembrete-toggle').classList.toggle('on',!!userCfg.lembreteAtivo);
  document.getElementById('notif-status').textContent=userCfg.lembreteAtivo?'Lembrete ativo âœ“':'';
  const activePlan=getPlans().find(p=>p.id===getActivePlanId());
  if(activePlan)document.getElementById('plan-badge').textContent=activePlan.emoji+' '+activePlan.name;}

async function toggleIdioma(id,el){
  el.classList.toggle('on');const ativos=userCfg.idiomasAtivos||['ingles'];const idx=ativos.indexOf(id);
  if(idx>=0&&ativos.length>1)ativos.splice(idx,1);else if(idx<0)ativos.push(id);
  userCfg.idiomasAtivos=ativos;
  await saveCfgAll(false);
  buildHabitsFromCfg();renderCheckin();
}

async function savePerfil(){
  userCfg.sonoMeta=parseInt(document.getElementById('pref-sono').value)||7;
  userCfg.inglesMeta=parseInt(document.getElementById('pref-ingles').value)||20;
  await saveCfgAll(true);
}

function toggleDark(){document.body.classList.toggle('dark');const isDark=document.body.classList.contains('dark');localStorage.setItem('voce_sa_dark',isDark?'1':'0');document.getElementById('dark-toggle').classList.toggle('on',isDark);}
function applyDarkIfSaved(){if(localStorage.getItem('voce_sa_dark')==='1')document.body.classList.add('dark');}

function exportCSV(){
  const headers='Data,'+userHabits.map(h=>h.name).join(',')+',Energia,Nota';
  const rows=log.map(e=>{const habits=userHabits.map(h=>e.habits&&e.habits[h.id]?'Sim':'NÃ£o').join(',');return`${e.date},${habits},${e.energy?ENERGY[e.energy]:''},${(e.nota||'').replace(/,/g,';')}`;});
  const csv=[headers,...rows].join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='voce_sa_historico.csv';a.click();URL.revokeObjectURL(url);
}

// STREAK BOOM
function showBoom(streak){
  const el=document.getElementById('streak-boom');
  document.getElementById('streak-boom-num').textContent='ðŸ”¥ '+streak;
  document.getElementById('streak-boom-label').textContent=streak===1?'primeiro dia!':streak<7?'dias seguidos!':streak<30?'dias! Continue!':'dias! IncrÃ­vel!';
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),3500);
}
function hideBoom(){document.getElementById('streak-boom').classList.remove('show');}

// ENERGIA CHART
function renderEnergyChart(){
  const days=[];for(let i=13;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push(dateKey(d));}
  const colors=['','#E24B4A','#BA7517','#1D9E75'];
  const chart=document.getElementById('energy-chart');
  if(!chart)return;
  chart.innerHTML=days.map(date=>{
    const entry=log.find(e=>e.date===date);
    const e=entry?entry.energy||0:0;
    const h=e>0?[0,18,34,52][e]:4;
    const dow=new Date(date+'T12:00:00').getDay();
    return`<div class="ec-col"><div class="ec-bar" style="height:${h}px;background:${e>0?colors[e]:'var(--borda)'}"></div><div class="ec-lbl">${DLABELS[dow]}</div></div>`;
  }).join('');
  // Melhor dia da semana
  const dayScores=[0,0,0,0,0,0,0];const dayCounts=[0,0,0,0,0,0,0];
  log.forEach(e=>{const dow=new Date(e.date+'T12:00:00').getDay();const done=userHabits.filter(h=>isExpected(h,e.date)&&e.habits[h.id]).length;const exp=userHabits.filter(h=>isExpected(h,e.date)).length;if(exp>0){dayScores[dow]+=done/exp;dayCounts[dow]++;}});
  let bestDay=-1,bestScore=0;
  dayScores.forEach((s,i)=>{if(dayCounts[i]>0){const avg=s/dayCounts[i];if(avg>bestScore){bestScore=avg;bestDay=i;}}});
  const dayNames=['domingo','segunda','terÃ§a','quarta','quinta','sexta','sÃ¡bado'];
  const el=document.getElementById('energy-best-day');
  if(el&&bestDay>=0&&log.length>=7)el.textContent=`Melhor dia: ${dayNames[bestDay]}`;
}

// BIBLIOTECA
let newLivroTipo='livro';
function showAddLivro(){
  const f=document.getElementById('add-livro-form');
  f.style.display=f.style.display==='none'?'block':'none';
  newLivroTipo='livro';
}
function obSingleLivroTipo(btn){
  newLivroTipo=btn.dataset.val;
}

async function saveLivro(){
  const tituloEl=document.getElementById('livro-titulo');
  const titulo=tituloEl.value.trim();
  if(!titulo){tituloEl.classList.add('invalid');tituloEl.focus();showToast('Informe o tÃ­tulo antes de salvar.','info',3000);return;}
  tituloEl.classList.remove('invalid');
  const nota=document.getElementById('livro-nota').value.trim();
  const item={user_id:currentUser.id,tipo:newLivroTipo,titulo,nota};
  setSyncStatus('syncing','Salvando...');
  const{error}=await sb.from('biblioteca').insert(item);
  if(error){setSyncStatus('err','Sem conexÃ£o');showToast('Erro ao salvar: '+error.message,'err');return;}
  setSyncStatus('ok','Sincronizado');
  showToast('Item adicionado Ã  biblioteca!');
  document.getElementById('livro-titulo').value='';
  document.getElementById('livro-nota').value='';
  document.getElementById('add-livro-form').style.display='none';
  renderBiblioteca();
}

async function renderBiblioteca(){
  const list=document.getElementById('biblioteca-list');
  if(!list)return;
  list.innerHTML='<div class="empty-state" style="padding:24px 0"><span style="opacity:.5">Carregando...</span></div>';
  const{data,error}=await sb.from('biblioteca').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false});
  if(error){list.innerHTML='<div class="empty-state"><strong>Erro ao carregar</strong>NÃ£o foi possÃ­vel buscar os itens. Verifique sua conexÃ£o e tente novamente.</div>';return;}
  if(!data||!data.length){list.innerHTML='<div class="empty-state"><strong>Biblioteca vazia</strong>Registre tudo que vocÃª consome: livros, cursos, podcasts e artigos.<br>Toque em <b>+ Adicionar</b> para comeÃ§ar.</div>';return;}
  const tipoIcons={livro:'ðŸ“˜',curso:'ðŸŽ“',video:'â–¶ï¸',podcast:'ðŸŽ™ï¸',artigo:'ðŸ“„'};
  const tipoNomes={livro:'Livro',curso:'Curso',video:'VÃ­deo',podcast:'Podcast',artigo:'Artigo'};
  // Stats
  const stats=document.getElementById('bib-stats');
  if(stats){
    const counts={};data.forEach(i=>{counts[i.tipo]=(counts[i.tipo]||0)+1;});
    stats.innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap">${Object.entries(counts).map(([t,c])=>`<div style="background:var(--card);border:1px solid var(--borda);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:500">${tipoIcons[t]||'ðŸ“„'} ${c} ${tipoNomes[t]||t}</div>`).join('')}</div>`;
  }
  list.innerHTML=data.map(i=>`<div class="bib-item">
    <div class="bib-tipo">${tipoIcons[i.tipo]||'ðŸ“„'} ${tipoNomes[i.tipo]||i.tipo}</div>
    <div class="bib-titulo">${i.titulo}</div>
    ${i.nota?`<div class="bib-nota">${i.nota}</div>`:''}
    <div class="bib-date">${fmtDate(i.created_at?.slice(0,10)||todayKey())}</div>
  </div>`).join('');
}

// MÃšLTIPLOS PLANOS
function getPlans(){return userCfg.plans||[{id:'principal',name:'Principal',emoji:'â¬¡'}];}
function getActivePlanId(){return userCfg.activePlan||'principal';}

function openPlanModal(){
  const plans=getPlans();const active=getActivePlanId();
  document.getElementById('plan-list').innerHTML=plans.map(p=>`
    <div class="plan-row ${p.id===active?'active':''}" onclick="switchPlan('${p.id}')">
      <div class="plan-row-left"><span style="font-size:18px">${p.emoji}</span> ${p.name}</div>
      ${p.id===active?'<span style="font-size:11px;color:var(--roxo);font-weight:600">ativo</span>':'<span style="font-size:11px;color:var(--cinza)">trocar</span>'}
    </div>`).join('');
  document.getElementById('plan-modal').style.display='flex';
}

function closePlanModal(e){
  if(!e||e.target===document.getElementById('plan-modal'))document.getElementById('plan-modal').style.display='none';
}

async function switchPlan(id){
  if(!userCfg.planConfigs)userCfg.planConfigs={};
  userCfg.planConfigs[getActivePlanId()]={...userCfg};
  const plans=getPlans();const target=plans.find(p=>p.id===id);
  if(!target)return;
  const saved=userCfg.planConfigs[id];
  if(saved){Object.assign(userCfg,saved);}
  userCfg.activePlan=id;
  await saveCfgAll(false);
  document.getElementById('plan-badge').textContent=target.emoji+' '+target.name;
  document.getElementById('plan-modal').style.display='none';
  buildHabitsFromCfg();renderCheckin();renderDashboard();renderOKRs();
}

async function addPlan(){
  const name=prompt('Nome do novo plano:');
  if(!name)return;
  const emojis=['ðŸŒŸ','ðŸ’¡','ðŸŽ¯','ðŸ‹ï¸','ðŸ’¼','ðŸ§˜','ðŸš€','ðŸŒ±'];
  const emoji=emojis[Math.floor(Math.random()*emojis.length)];
  const id='plan_'+Date.now();
  const plans=getPlans();plans.push({id,name,emoji});
  userCfg.plans=plans;
  if(!userCfg.planConfigs)userCfg.planConfigs={};
  userCfg.planConfigs[id]={name:userCfg.name,startDate:todayKey(),areas:['corpo','mente'],idiomasAtivos:['ingles'],idiomaDias:[0,1,2,3,4,5,6],treinoDias:[2,4,6],estudoDias:[0,1,3],sonoMeta:7,inglesMeta:20};
  await saveCfgAll(false);
  showToast('Plano "'+name+'" criado!');
  openPlanModal();
}

// NOTIFICAÃ‡Ã•ES
async function saveReminder(){
  userCfg.lembreteHora=document.getElementById('pref-lembrete').value;
  await saveCfgAll(false);
  if(userCfg.lembreteAtivo)scheduleReminder();
}

async function toggleReminder(el){
  if(Notification.permission==='denied'){document.getElementById('notif-status').textContent='NotificaÃ§Ãµes bloqueadas no navegador.';showToast('NotificaÃ§Ãµes bloqueadas. Verifique as permissÃµes do navegador.','err');return;}
  if(Notification.permission!=='granted'){
    const perm=await Notification.requestPermission();
    if(perm!=='granted'){document.getElementById('notif-status').textContent='PermissÃ£o negada.';showToast('PermissÃ£o de notificaÃ§Ã£o negada.','err');return;}
  }
  userCfg.lembreteAtivo=!userCfg.lembreteAtivo;
  el.classList.toggle('on',userCfg.lembreteAtivo);
  await saveCfgAll(false);
  document.getElementById('notif-status').textContent=userCfg.lembreteAtivo?'Lembrete ativo âœ“':'Lembrete desativado';
  if(userCfg.lembreteAtivo){scheduleReminder();showToast('Lembrete ativado!');}
}

function scheduleReminder(){
  if(!userCfg.lembreteAtivo||!userCfg.lembreteHora)return;
  const[h,m]=userCfg.lembreteHora.split(':').map(Number);
  const now=new Date();const target=new Date();
  target.setHours(h,m,0,0);
  if(target<=now)target.setDate(target.getDate()+1);
  const ms=target-now;
  clearTimeout(window._reminderTimer);
  window._reminderTimer=setTimeout(()=>{
    const today=todayKey();const checkedIn=log.some(e=>e.date===today&&Object.values(e.habits||{}).some(Boolean));
    if(!checkedIn&&Notification.permission==='granted'){
      new Notification('VocÃª S.A. ðŸ”¥',{body:'Hora do seu check-in! NÃ£o deixe o streak quebrar.',icon:'/favicon.ico'});
    }
    scheduleReminder();
  },ms);
}

function initReminder(){
  if(userCfg.lembreteAtivo&&Notification.permission==='granted')scheduleReminder();
}

// NAV
function nav(id,el){
  ['checkin','dashboard','okrs','historico','conquistas','biblioteca','pomodoro','perfil','manual'].forEach(p=>{const pg=document.getElementById('pg-'+p);if(pg)pg.style.display='none';});
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('on'));
  const target=document.getElementById('pg-'+id);
  if(target){
    target.style.display='block';
    target.classList.remove('fade-in');
    void target.offsetWidth;
    target.classList.add('fade-in');
  }
  if(el)el.classList.add('on');
  if(id==='dashboard')renderDashboard();
  if(id==='historico')renderHistorico();
  if(id==='conquistas')renderConquistas();
  if(id==='perfil'){renderPerfil();}
  if(id==='pomodoro'){renderPomodoroTime();renderPomodoroSessions();}
  if(id==='biblioteca')renderBiblioteca();
}
// INIT
async function init(){
  const{data:{session}}=await sb.auth.getSession();
  if(session){currentUser=session.user;await afterLogin();}
  else document.getElementById('pg-auth').style.display='block';
  sb.auth.onAuthStateChange(async(event,session)=>{if(event==='SIGNED_IN'&&session&&!currentUser){currentUser=session.user;await afterLogin();}});
}
init();

*/
