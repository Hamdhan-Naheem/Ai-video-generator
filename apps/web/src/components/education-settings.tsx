"use client";
import {useEffect,useState} from "react";
import {CapabilitiesDtoSchema,VoicesDtoSchema,type CapabilitiesDto,type VoicesDto} from "@contracts";
import {accountRequest} from "@/lib/auth-browser";
import {Notice} from "@/components/ui";
import {VideoSettings} from "@/components/video-settings";
type Props={duration:string;onDurationChange:(v:string)=>void;orientation:string;onOrientationChange:(v:string)=>void;voice:string;onVoiceChange:(v:string)=>void};
export function EducationSettings(props:Props){
 const [data,setData]=useState<{capabilities:CapabilitiesDto;voices:VoicesDto}|null>(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;Promise.all([accountRequest("capabilities"),accountRequest("voices")]).then(([capabilities,voices])=>{const value={capabilities:CapabilitiesDtoSchema.parse(capabilities),voices:VoicesDtoSchema.parse(voices)};if(active)setData(value);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[attempt]);
 if(!data)return <section className="education-settings ui-panel" aria-label="Video settings">{error?<Notice error onRetry={()=>{setError(false);setAttempt(v=>v+1);}}>Video settings could not load. Your draft can still be saved.</Notice>:<p role="status">Loading video settings…</p>}</section>;
 return <VideoSettings prefix="education" {...props} catalog={data}/>;
}
