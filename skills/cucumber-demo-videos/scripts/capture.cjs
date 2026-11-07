'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const {spawn,execFileSync}=require('node:child_process');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function inside(root,target){const r=path.relative(root,target);return !r||(!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r));}
function realTarget(target){let p=path.resolve(target),tail=[];while(!fs.existsSync(p)){tail.unshift(path.basename(p));p=path.dirname(p);}return path.join(fs.realpathSync(p),...tail);}
function snapshot(repo){
  const files=execFileSync('git',['-c','safe.directory='+repo,'ls-files','--cached','--others','--exclude-standard','-z'],{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','pipe']}).split('\0').filter(Boolean);
  function add(name){const f=path.join(repo,name);if(!fs.existsSync(f)||fs.lstatSync(f).isSymbolicLink())return;if(fs.statSync(f).isDirectory())for(const n of fs.readdirSync(f))add(path.join(name,n));else files.push(name.replaceAll('\\','/'));}
  ['.env','results','grupos/grupo-05-01-ahorros-depositos/results'].forEach(add);
  return Object.fromEntries([...new Set(files)].sort().filter(f=>fs.existsSync(path.join(repo,f))&&fs.statSync(path.join(repo,f)).isFile()).map(f=>[f,hash(path.join(repo,f))]));
}
function options(argv){
  const o={repo:process.cwd(),config:'cucumber.js',feature:'grupos/grupo-05-01-ahorros-depositos/features/ahorros-depositos.feature',tags:'@grupo-05-01 and @web and not @wip',worldProperty:'grupo0501',slow:300,stepPause:250,headless:false,dryRun:false};
  const keys={'--repo':'repo','--config':'config','--feature':'feature','--tags':'tags','--output':'output','--channel':'channel','--world-property':'worldProperty','--slow':'slow','--step-pause':'stepPause'};
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--headless')o.headless=true;
    else if(argv[i]==='--dry-run')o.dryRun=true;
    else if(keys[argv[i]]){const k=keys[argv[i]];if(!argv[i+1]||argv[i+1].startsWith('--'))throw Error('Falta valor para '+argv[i]);o[k]=argv[++i];}
    else throw Error('Opcion desconocida: '+argv[i]);
  }
  for(const k of ['slow','stepPause']){o[k]=Number(o[k]);if(!Number.isInteger(o[k])||o[k]<0||o[k]>1000)throw Error(k+' debe estar entre 0 y 1000 ms');}
  if(!o.output)throw Error('Indicar --output fuera del repositorio.');
  o.repo=fs.realpathSync(path.resolve(o.repo));o.output=realTarget(o.output);
  if(inside(o.repo,o.output)||o.output.split(/[\\/]/).some(x=>x.toLowerCase()==='auxiliares'))throw Error('Salida dentro del repositorio o de auxiliares.');
  return o;
}
function register(){
  const o=JSON.parse(process.env.CUCUMBER_DEMO_OPTIONS||'{}');
  if(!o.repo||!o.run)throw Error('Usar capture.cjs como lanzador.');
  const req=createRequire(path.join(o.repo,'package.json'));
  const {chromium}=req('@playwright/test'),{After,AfterStep}=req('@cucumber/cucumber');
  const videos=[],errors=[],launch=chromium.launch.bind(chromium);
  chromium.launch=async function(settings={}){
    const b=await launch({...settings,headless:o.headless,slowMo:o.slow,...(o.channel?{channel:o.channel}:{})});
    const create=b.newContext.bind(b);
    b.newContext=settings=>create({...settings,viewport:{width:1280,height:720},recordVideo:{dir:path.join(o.run,'originales'),size:{width:1280,height:720}}});
    return b;
  };
  // Los After originales limpian/cierra(n) primero, por orden inverso de registro.
  After({tags:o.tags,timeout:60000},async function({pickle}){
    try{
      const video=this[o.worldProperty]?.page?.video();
      if(!video)throw Error('No hay pagina grabada en this.'+o.worldProperty+'.page');
      const id=pickle.tags.map(t=>t.name.slice(1)).find(t=>/^S6-/.test(t))||'caso';
      const slug=(id+'-'+pickle.name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-]+/g,'-').slice(0,110);
      const file=String(videos.length+1).padStart(2,'0')+'-'+slug+'.webm';
      await video.saveAs(path.join(o.run,'videos',file));
      videos.push({scenario:pickle.name,file});
      fs.writeFileSync(path.join(o.run,'videos.json'),JSON.stringify(videos,null,2));
      await this.attach('Video del caso: videos/'+file,'text/plain');
    }catch(e){errors.push({scenario:pickle.name,message:e.message});fs.writeFileSync(path.join(o.run,'errores-captura.json'),JSON.stringify(errors,null,2));throw e;}
  });
  if(o.stepPause)AfterStep({tags:o.tags,timeout:5000},async()=>{await new Promise(r=>setTimeout(r,o.stepPause));});
}
function statusOf(s){
  const states=[...(s.steps||[]),...(s.before||[]),...(s.after||[])].map(x=>x.result?.status);
  if(states.some(x=>['failed','undefined','pending','ambiguous'].includes(x)))return 'failed';
  return states.length&&states.every(x=>x==='passed')?'passed':'skipped';
}
async function main(){
  if(process.argv.includes('--help')){console.log('node capture.cjs --output CARPETA_EXTERNA [--slow 300] [--step-pause 250] [--channel chrome] [--headless] [--dry-run]\nSeleccion: --repo RUTA --config cucumber.js --feature archivo.feature --tags EXPRESION --world-property grupo0501');return;}
  const o=options(process.argv.slice(2)),config=path.resolve(o.repo,o.config),feature=path.resolve(o.repo,o.feature);
  if(!fs.existsSync(config)||!fs.existsSync(feature))throw Error('No existe la configuracion o feature.');
  const req=createRequire(path.join(o.repo,'package.json')),base=req(config).default;
  if(!base||typeof base!=='object')throw Error('Se requiere perfil default como objeto.');
  const secrets=[process.env.API_KEY],envFile=path.join(o.repo,'.env');
  if(fs.existsSync(envFile))secrets.push(req('dotenv').parse(fs.readFileSync(envFile)).API_KEY);
  const redact=text=>secrets.filter(Boolean).reduce((s,k)=>s.split(k).join('[REDACTED]'),text);
  const before=snapshot(o.repo);
  fs.mkdirSync(o.output,{recursive:true});
  o.run=fs.mkdtempSync(path.join(o.output,'captura-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'));
  for(const d of ['videos','originales'])fs.mkdirSync(path.join(o.run,d));
  const json=path.join(o.run,'cucumber-report.json'),report=path.join(o.run,'cucumber-report.html'),external=path.join(o.run,'cucumber-externo.cjs');
  const format=(name,file)=>JSON.stringify(name)+':'+JSON.stringify(file.replaceAll('\\','/'));
  const conf={...base,paths:[feature],require:[__filename,...(base.require||[])],tags:o.tags,retry:0,parallel:0,dryRun:o.dryRun,format:['progress',format('json',json),format('html',report)]};
  fs.writeFileSync(external,'module.exports={default:'+JSON.stringify(conf)+'};\n');
  console.log('Salida: '+o.run+'\n'+(o.dryRun?'Dry-run sin navegador.':'Grabando '+(o.headless?'headless':'con ventana visible')+'; slowMo='+o.slow+' ms.'));
  const child=spawn(process.execPath,[path.join(o.repo,'node_modules/@cucumber/cucumber/bin/cucumber.js'),'--config',path.relative(o.repo,external)],{cwd:o.repo,env:{...process.env,HEADED:o.headless?'0':'1',CUCUMBER_DEMO_OPTIONS:JSON.stringify(o)},stdio:['ignore','pipe','pipe'],windowsHide:true});
  const chunks=[];child.stdout.on('data',b=>chunks.push(b));child.stderr.on('data',b=>chunks.push(b));
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',c=>resolve(c??1));});
  fs.writeFileSync(path.join(o.run,'ejecucion.log'),redact(Buffer.concat(chunks).toString('utf8')));
  for(const f of [json,report])if(fs.existsSync(f))fs.writeFileSync(f,redact(fs.readFileSync(f,'utf8')));
  const features=fs.existsSync(json)?JSON.parse(fs.readFileSync(json,'utf8')):[];
  const scenarios=features.flatMap(f=>(f.elements||[]).filter(e=>e.type==='scenario'));
  const videoFile=path.join(o.run,'videos.json'),videos=fs.existsSync(videoFile)?JSON.parse(fs.readFileSync(videoFile,'utf8')):[],used=new Set();
  const cases=scenarios.map(s=>{
    // El adjunto identifica el video exacto incluso si dos ejemplos tienen el
    // mismo titulo o un Before fallo antes de crear una pagina.
    const attachments=[...(s.steps||[]),...(s.before||[]),...(s.after||[])].flatMap(x=>x.embeddings||[]);
    const marker=attachments.filter(x=>x.mime_type==='text/plain').map(x=>Buffer.from(x.data,'base64').toString('utf8')).find(x=>x.startsWith('Video del caso: videos/'));
    const file=marker?.slice('Video del caso: videos/'.length);
    const i=videos.findIndex((v,i)=>!used.has(i)&&v.file===file);if(i>=0)used.add(i);
    return {scenario:s.name,status:statusOf(s),steps:(s.steps||[]).filter(x=>!x.hidden).map(x=>({text:x.name,status:x.result?.status})),...(i>=0?{video:videos[i].file}:{})};
  });
  const after=snapshot(o.repo),changed=[...new Set([...Object.keys(before),...Object.keys(after)])].filter(f=>before[f]!==after[f]);
  const missing=o.dryRun?[]:cases.filter(s=>!s.video).map(s=>s.scenario);
  const summary={createdAt:new Date().toISOString(),tags:o.tags,headed:!o.headless,slowMoMs:o.slow,dryRun:o.dryRun,cucumberExitCode:code,scenarios:cases.length,passed:cases.filter(s=>s.status==='passed').length,failed:cases.filter(s=>s.status==='failed').length,skipped:cases.filter(s=>s.status==='skipped').length,steps:cases.flatMap(s=>s.steps).length,stepsPassed:cases.flatMap(s=>s.steps).filter(s=>s.status==='passed').length,scenarioVideos:videos.length,missingVideos:missing,unmatchedVideos:videos.length-used.size,repositoryUnchanged:!changed.length,changedFiles:changed,cases};
  fs.writeFileSync(path.join(o.run,'resumen.json'),redact(JSON.stringify(summary,null,2)));
  const cards=cases.map(s=>'<article><h2>'+esc(s.scenario)+'</h2><p>Resultado final: <strong>'+s.status+'</strong></p><details><summary>Pasos y ejemplo</summary><ol>'+s.steps.map(x=>'<li>'+esc(x.text)+' — '+esc(x.status)+'</li>').join('')+'</ol></details>'+(s.video?'<video controls preload="metadata" src="videos/'+encodeURIComponent(s.video)+'"></video>':'<p>Sin video'+(o.dryRun?' (dry-run)':'')+'.</p>')+'</article>').join('\n');
  fs.writeFileSync(path.join(o.run,'index.html'),redact('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cucumber + Playwright · videos</title><style>body{font:17px/1.5 system-ui;max-width:1100px;margin:32px auto;padding:0 20px;background:#f4f8fb;color:#16374a}article{background:white;border:1px solid #ccdce6;border-radius:12px;padding:22px;margin:24px 0}video{width:100%;background:#112b3d;margin-top:15px}h2{font-size:22px}a{color:#07677e}</style></head><body><h1>Demostracion web · Cucumber + Playwright</h1><p>Fecha: '+esc(summary.createdAt)+' · Tags: '+esc(o.tags)+'</p><p>'+summary.passed+'/'+cases.length+' casos aprobados. Codigo Cucumber: '+code+'. '+(o.dryRun?'Dry-run: no se ejecuto la aplicacion.':'Videos de esta ejecucion; reproducirlos no realiza operaciones.')+'</p><p><a href="cucumber-report.html">HTML de Cucumber</a> · <a href="resumen.json">Resumen</a></p>'+cards+'</body></html>'));
  console.log(JSON.stringify({run:o.run,cucumberExitCode:code,scenarios:cases.length,passed:summary.passed,failed:summary.failed,videos:videos.length,missingVideos:missing,changedFiles:changed},null,2));
  process.exitCode=code||(!cases.length||changed.length||missing.length||summary.unmatchedVideos||(!o.dryRun&&summary.passed!==cases.length)?1:0);
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});else register();
