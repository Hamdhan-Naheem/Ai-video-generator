"use client";
import {useEffect,useId,useRef,useState} from 'react';
import Link from 'next/link';
import type {UserDto} from '@contracts';
import {SignOutAction} from '@/components/sign-out-action';
export function AccountMenu({identity,compact=false}:{identity:UserDto;compact?:boolean}){
 const [open,setOpen]=useState(false),box=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null),id=useId();const initials=[...identity.displayName].slice(0,2).join('').toUpperCase();
 useEffect(()=>{if(!open)return;panel.current?.querySelector<HTMLElement>('a,button')?.focus();const outside=(event:PointerEvent)=>{if(!document.querySelector('dialog[open]')&&!box.current?.contains(event.target as Node))setOpen(false);};const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')){setOpen(false);trigger.current?.focus();}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};},[open]);
 return <div ref={box} className={`account-menu ${compact?'account-menu-mobile':'account-menu-desktop'}`}><button ref={trigger} type="button" className={`account-trigger ${compact?'account-trigger-compact':'sidebar-footer'}`} aria-label={`Account options for ${identity.displayName}`} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(v=>!v)}><span className="account-mark" aria-hidden="true">{initials}</span>{!compact&&<><span className="account-identity"><span>{identity.displayName}</span><small>Your account</small></span><span className="profile-chevron" aria-hidden="true">⌄</span></>}</button>{open&&<div id={id} ref={panel} className="account-options" aria-label="Account options"><Link className="button button-secondary" href="/settings" onClick={()=>setOpen(false)}>Account settings</Link><SignOutAction/></div>}</div>;
}
