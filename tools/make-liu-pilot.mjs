import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = new URL("../", import.meta.url).pathname;
const dir = join(root, "episodes/liu-secret");
const audio = join(dir, "audio");
const cues = join(dir, "cues");
mkdirSync(audio, { recursive: true }); mkdirSync(cues, { recursive: true });
const scenes = [
  { id:"secret", lines:[
    ["a_secret","我告诉你一个秘密。","bright"],["b_what","什么秘密？","deep"],["a_reveal","柳如烟，昨天居然逃学了！","bright"],["b_shock","什么？真的假的？","deep"]
  ]},
  { id:"canteen", lines:[
    ["a_proof","真的，她还去了小卖部。","bright"],["b_guess","她去买学习用品？","deep"],["a_sausage","不，她买了两个烤肠。","bright"]
  ]},
  { id:"punchline", lines:[["b_two","两个？","deep"],["b_fall","她堕落得好彻底！","deep"]] }
];
function run(bin,args){
  for(let attempt=1; attempt<=3; attempt++) {
    const r=spawnSync(bin,args,{stdio:"inherit"});
    if(!r.status) return;
    if(bin === "edge-tts" && attempt < 3) { console.error(`edge-tts retry ${attempt}/2`); continue; }
    throw new Error(`${bin} failed`);
  }
}
function probe(p){ const r=spawnSync("ffprobe",["-v","error","-show_entries","format=duration","-of","csv=p=0",p],{encoding:"utf8"}); return Number(r.stdout.trim()); }
let cursor=0; const timeline=[];
for(const scene of scenes){
  const parts=[]; let rel=0;
  for(const [id,text,voice] of scene.lines){
    const mp3=join(audio,`${id}.mp3`); const p=join(audio,`${id}.wav`);
    run("edge-tts",["--voice",voice==="deep"?"zh-CN-YunxiaNeural":"zh-CN-YunxiNeural",`--rate=${voice==="deep"?"-2%":"+2%"}`,`--pitch=${voice==="deep"?"-2Hz":"+1Hz"}`,"--text",text,"--write-media",mp3]);
    run("ffmpeg",["-y","-v","error","-i",mp3,"-ar","44100","-ac","1","-c:a","pcm_s16le",p]);
    const d=probe(p); writeFileSync(join(cues,`${id}.json`),JSON.stringify({lineId:id,offset:rel,cues:[{start:0,end:d,viseme:"A"}]},null,2)); parts.push(p); rel+=d;
    if(id!==scene.lines.at(-1)[0]) { const silence=join(audio,`${id}-gap.wav`); run("ffmpeg",["-y","-v","error","-f","lavfi","-i","anullsrc=r=22050:cl=mono","-t","0.24","-c:a","pcm_s16le",silence]); parts.push(silence); rel+=0.24; }
  }
  const list=join(audio,`${scene.id}.txt`); writeFileSync(list,parts.map(p=>`file '${p}'`).join("\n")+"\n");
  const out=join(audio,`narr-${scene.id}.wav`); run("ffmpeg",["-y","-v","error","-f","concat","-safe","0","-i",list,"-ar","44100","-ac","1","-c:a","pcm_s16le",out]);
  const d=probe(out); timeline.push({id:scene.id,display:"",mood:scene.id==="punchline"?"triumphant":"festive",start:cursor,narrAt:cursor,narrDur:d,dur:d+0.35,end:cursor+d+0.35}); cursor+=d+0.35;
}
writeFileSync(join(dir,"timeline.json"),JSON.stringify({title:"柳如烟居然逃学了？",subtitle:"小卖部现场",total:cursor,scenes:timeline},null,2)+"\n");
run("ffmpeg",["-y","-v","error","-i",join(audio,"narr-secret.wav"),"-i",join(audio,"narr-canteen.wav"),"-i",join(audio,"narr-punchline.wav"),"-filter_complex",`[0:a]adelay=${Math.round(timeline[0].start*1000)}:all=1[a0];[1:a]adelay=${Math.round(timeline[1].start*1000)}:all=1[a1];[2:a]adelay=${Math.round(timeline[2].start*1000)}:all=1[a2];[a0][a1][a2]amix=inputs=3:duration=longest,apad=whole_dur=${cursor}[out]`,"-map","[out]","-ar","44100","-ac","2",join(audio,"mix.wav")]);
console.log(`pilot audio ready: ${cursor.toFixed(2)}s`);
