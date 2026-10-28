const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/routes/live.tsx';
let s = fs.readFileSync(p,'utf8');
const start = s.indexOf('async function save()');
const end = s.indexOf('function LiveSessionPage()');
if (start >= 0 && end > start) {
  const rep = "async function save(){setPaused(true);if(!user){try{signIn();}catch(e){}setNotice('Sign in to save.');return;}setSaving(true);try{const res=await (supabase.from('training_sessions') as any).insert({user_id:(user as any)?.id,discipline:'MMA',duration_seconds:seconds,strikes:count,max_speed:12.4,simulated:true} as any);setSaving(false);if(res&&res.error){setNotice((res.error as any).message||'Error');return;}setEnded(true);setNotice('Session saved.');try{(navigate as any)({to:'/analytics'});}catch(e){}}catch(e:any){setSaving(false);setNotice(e?.message||'Error');}}\n\n";
  s = s.slice(0,start) + rep + s.slice(end);
  fs.writeFileSync(p,s,'utf8');
  console.log('ok');
} else {
  console.log('no');
}
