from pathlib import Path
p = Path(r'E:\Kinetic Models\Frontend\src\routes\live.tsx')
s = p.read_text(encoding='utf-8')
start = s.find('async function save()')
end = s.find('function Live')
if start > 0 and end > start:
    new_save = "async function save(){setPaused(true);if(!user){try{signIn();}catch(e){}setNotice('Sign in to save.');return;}setSaving(true);try{const res=await (supabase.from('training_sessions') as any).insert({user_id:(user as any)?.id,discipline:'MMA',duration_seconds:seconds,strikes:count,max_speed:12.4,simulated:true} as any);setSaving(false);const error=(res as any)?.error;if(error){setNotice(error?.message||'Error');return;}setEnded(true);setNotice('Session saved.');try{(navigate as any)({to:'/analytics'});}catch(e){}}catch(e:any){setSaving(false);setNotice(e?.message||'Error');}}\n"
    ns = s[:start] + new_save + s[end:]
    p.write_text(ns, encoding='utf-8')
    print('ok')
else:
    print('no')
