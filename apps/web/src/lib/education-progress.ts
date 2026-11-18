import type {EducationRun} from "../../../../shared/contracts/execution.ts";
export const EDUCATION_STEPS=[
 {id:"understand",title:"Understand your content",description:"Reviewing your topic, audience and reference notes."},
 {id:"story",title:"Create your story",description:"Planning narration and illustrated scenes."},
 {id:"voice",title:"Create voice and captions",description:"Preparing narration, captions and teacher timing."},
 {id:"render",title:"Animate and prepare video",description:"Animating, rendering and checking the finished video."},
] as const;
export function isEducationActive(run:EducationRun|null){return !!run&&["queued","waiting_worker","running","waiting_quota","cancel_requested"].includes(run.status);}
export function educationPollDelay(run:EducationRun|null){
 if(!isEducationActive(run))return null;
 return run!.status==="running"&&run!.workerStatus==="online"?5000:15000;
}
export function educationStepStates(run:EducationRun){
 const index=EDUCATION_STEPS.findIndex(step=>step.id===run.stage);
 return EDUCATION_STEPS.map((_,i)=>{
  if(run.status==="succeeded"||run.status==="expired")return "complete" as const;
  if(!run.startedAt)return "upcoming" as const;
  if(i===index&&run.status==="cancel_requested")return "stopping" as const;
  if(i===index&&run.status==="cancelled")return "cancelled" as const;
  if(i<index)return "complete" as const;
  if(i>index)return "upcoming" as const;
  if(!isEducationActive(run))return "stopped" as const;
  if(run.status!=="running"||run.workerStatus!=="online")return "waiting" as const;
  return "current" as const;
 });
}
export function educationStatus(run:EducationRun){
 if(run.status==="succeeded")return "Your Education video is ready.";
 if(run.status==="expired")return "This video has expired.";
 if(run.status==="failed")return "Generation stopped. Your saved draft is preserved.";
 if(run.status==="needs_input")return "Review the saved input before trying again.";
 if(run.status==="cancelled")return "Generation was cancelled.";
 if(run.status==="cancel_requested")return "Generation is stopping.";
 if(run.status==="waiting_quota")return "Processing is waiting for provider availability.";
 if(run.status==="running")return run.workerStatus==="online"?"Your Education video is processing.":"The processing computer is unavailable. Your request is saved.";
 if(run.claimsPaused)return "Starting queued videos is temporarily paused. Your request is saved.";
 if(run.status==="waiting_worker"||run.workerStatus!=="online")return "Waiting for a processing computer.";
 return "Your video is queued.";
}
