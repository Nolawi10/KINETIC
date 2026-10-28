const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/routes/live.tsx';
let s = fs.readFileSync(p,'utf8');
const start = s.indexOf('async function save()');
if (start >= 0) {
  let end = s.indexOf('\nfunction Live', start);
  if (end < 0) end = s.indexOf('\nexport', start);
  if (end > start) {
    const rep = "async function save(){setPaused(true);if(!user){try{signIn();}catch(e){}setNotice('Sign in to save.');return;}setSaving(true);try{const res=await (supabase.from('training_sessions') as any).insert({user_id:(user as any)?.id,discipline:'MMA',duration_seconds:seconds,strikes:count,max_speed:12.4,simulated:true});setSaving(false);const err=res&&res.error;if(err){setNotice(err.message||'Error');return;}setEnded(true);setNotice('Session saved.');try{(navigate as any)({to:'/analytics'});}catch(e){}}catch(e){setSaving(false);setNotice((e as any)?.message||'Error');}}\n";
    s = s.slice(0,start) + rep + s.slice(end);
    fs.writeFileSync(p,s,'utf8');
    console.log('ok');
  } else console.log('noend');
} else console.log('nostart');
