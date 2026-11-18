"use client";
import {useRef,useState} from 'react';
import {accountRequest} from '@/lib/auth-browser';
import {Button,Modal,Notice} from '@/components/ui';
export function SignOutAction(){
 const [open,setOpen]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState('');const busy=useRef(false);
 async function submit(){if(busy.current)return;busy.current=true;setPending(true);setError('');try{await accountRequest('auth/sign-out',{method:'POST',body:{scope:'local'}});window.dispatchEvent(new Event('account-signed-out'));if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('account-session');channel.postMessage('signed-out');channel.close();}window.location.replace('/sign-in');}catch(cause){setError(cause instanceof Error?cause.message:'Sign out could not be confirmed. Try again.');}finally{busy.current=false;setPending(false);}}
 return <><Button variant="secondary" onClick={()=>{setError('');setOpen(true);}}>Sign out</Button><Modal open={open} title="Sign out?" dismissible={!pending} onClose={()=>{if(!busy.current)setOpen(false);}}><p>Signing out ends your session on this device. Generation already in progress will continue.</p>{error&&<Notice error>{error}</Notice>}<div className="dialog-actions"><Button variant="secondary" data-initial-focus disabled={pending} onClick={()=>setOpen(false)}>Cancel</Button><Button pending={pending} pendingLabel="Signing out…" onClick={()=>void submit()}>Sign out</Button></div></Modal></>;
}
