import "server-only";
import {existsSync,readFileSync,statSync} from "node:fs";
import {join} from "node:path";
import {CapabilitiesDtoSchema,VoicesDtoSchema,DURATIONS,ORIENTATIONS,MODES,LIMITS} from "@contracts";
// Deliberately outside public/: installing a reviewed sample is an explicit operator action.
export const koreSamplePath=join(process.cwd(),"voice-samples","Kore.wav");
export function koreSample(){try {const size=statSync(koreSamplePath).size;if(size<44 || size>2_000_000)return null;const bytes=readFileSync(koreSamplePath);if(bytes.length>2_000_000 || bytes.toString("ascii",0,4)!=="RIFF" || bytes.toString("ascii",8,12)!=="WAVE")return null;return bytes;}catch{return null;}}
export function videoCatalog(){const preview=existsSync(koreSamplePath)&&koreSample()!==null;
 return {capabilities:CapabilitiesDtoSchema.parse({modes:MODES.map(id=>({id,draftAvailable:true,generationAvailable:false})),durations:DURATIONS,orientations:ORIENTATIONS,uploadLimits:{enabled:false,images:LIMITS.images,imageBytes:LIMITS.imageBytes,recordingBytes:LIMITS.recordingBytes,recordingSeconds:LIMITS.recordingSeconds,combinedBytes:LIMITS.uploadBytes},educationCapabilities:{drafts:true,generation:false,voicePreview:preview},limitsVersion:"v1"}),voices:VoicesDtoSchema.parse({items:[{id:"Kore",label:"Kore",language:"en",description:"English narration. A fallback may use a different voice, identified in the result. No regional accent is guaranteed.",previewUrl:preview?"/api/v1/voices/Kore/preview":null,available:true}],nextCursor:null})};
}
