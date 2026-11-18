"use client";
import {useEffect,useRef,useState} from "react";
import {Button} from "@/components/ui";
export function VoiceSample({url,hintId}:{url:string|null;hintId:string}) {
 const audio=useRef<HTMLAudioElement|null>(null),blob=useRef<string|null>(null),request=useRef<AbortController|null>(null),version=useRef(0);
 const timeout=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [state,setState]=useState<"idle"|"loading"|"playing"|"error">("idle");
 function dispose(){if(timeout.current)clearTimeout(timeout.current);timeout.current=null;version.current++;request.current?.abort();request.current=null;if(audio.current){audio.current.onended=null;audio.current.onerror=null;audio.current.pause();audio.current.src="";audio.current=null;}if(blob.current){URL.revokeObjectURL(blob.current);blob.current=null;}}
 useEffect(()=>{const stop=()=>{dispose();setState("idle");};const visibility=()=>{if(document.hidden)stop();};document.addEventListener("visibilitychange",visibility);window.addEventListener("account-session-expired",stop);return()=>{document.removeEventListener("visibilitychange",visibility);window.removeEventListener("account-session-expired",stop);dispose();};},[url]);
 async function play(){dispose();const current=version.current;setState("loading");const controller=new AbortController();request.current=controller;timeout.current=setTimeout(()=>{if(current===version.current){dispose();setState("error");}},15000);
  try {const response=await fetch(url!,{credentials:"same-origin",cache:"no-store",signal:controller.signal});if(response.status===401)window.dispatchEvent(new Event("account-session-expired"));if(!response.ok || !response.headers.get("content-type")?.startsWith("audio/"))throw Error();const data=await response.blob();if(current!==version.current)return;if(data.size>2_000_000)throw Error();blob.current=URL.createObjectURL(data);const player=new Audio(blob.current);audio.current=player;player.onended=()=>{dispose();setState("idle");};player.onerror=()=>{dispose();setState("error");};await player.play();if(current===version.current){if(timeout.current)clearTimeout(timeout.current);timeout.current=null;setState("playing");}
  }catch{if(current===version.current){dispose();setState("error");}}
 }
 return <><div className="education-voice-preview"><span>Voice sample</span><Button variant="secondary" disabled={!url} aria-describedby={hintId} onClick={()=>{if(state==="playing"||state==="loading"){dispose();setState("idle");}else void play();}}>{state==="loading"?"Cancel loading":state==="playing"?"Stop sample":state==="error"?"Retry sample":"Preview voice"}</Button></div><p className="field-hint" id={hintId} role="status">{!url?"A reviewed sample for this voice is not available yet.":state==="loading"?"Loading voice sample…":state==="playing"?"Playing cached voice sample.":state==="error"?"The sample could not play. Check your connection and try again.":"Play a cached sample. No new AI request is made."}</p></>;
}
