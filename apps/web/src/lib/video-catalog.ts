import "server-only";
import {readFileSync,statSync} from "node:fs";
import {join} from "node:path";
import {CapabilitiesDtoSchema,VoicesDtoSchema,DURATIONS,ORIENTATIONS,MODES,LIMITS} from "@contracts";
// Private local samples stay ignored. The deployed fallback derives only from our approved public demo.
export const koreSamplePath=join(process.cwd(),"voice-samples","Kore.wav");
export const showcaseKoreSamplePath=join(process.cwd(),"assets","voice","kore-showcase.wav");
function validWave(bytes:Buffer){return bytes.length<=2_000_000&&bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WAVE";}
export function koreSample(){
 // Explicit paths keep Next.js tracing bounded; do not replace with a dynamic filesystem loop.
 try{const size=statSync(koreSamplePath).size;if(size>=44&&size<=2_000_000){const bytes=readFileSync(koreSamplePath);if(validWave(bytes))return bytes;}}catch{/* A private local sample is optional. */}
 try{const size=statSync(showcaseKoreSamplePath).size;if(size>=44&&size<=2_000_000){const bytes=readFileSync(showcaseKoreSamplePath);if(validWave(bytes))return bytes;}}catch{/* Fail closed if the curated fallback is absent. */}
 return null;
}
export function videoCatalog(educationAvailable=false){const preview=koreSample()!==null;
 return {capabilities:CapabilitiesDtoSchema.parse({modes:MODES.map(id=>({id,draftAvailable:true,generationAvailable:id==="education"&&educationAvailable})),durations:DURATIONS,orientations:ORIENTATIONS,uploadLimits:{enabled:true,images:LIMITS.images,imageBytes:LIMITS.imageBytes,recordingBytes:LIMITS.recordingBytes,recordingSeconds:LIMITS.recordingSeconds,combinedBytes:LIMITS.uploadBytes},educationCapabilities:{drafts:true,generation:educationAvailable,voicePreview:preview},limitsVersion:"v1"}),voices:VoicesDtoSchema.parse({items:[{id:"Kore",label:"Kore",language:"en",description:"English narration. A fallback may use a different voice, identified in the result. No regional accent is guaranteed.",previewUrl:preview?"/api/v1/voices/Kore/preview":null,available:true}],nextCursor:null})};
}
