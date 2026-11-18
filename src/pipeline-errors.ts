export class RecoverablePipelineError extends Error {
 constructor(readonly code:'STORY_VALIDATION_FAILED'|'CAPTION_TIMING_INVALID',readonly issues:readonly string[]=[]){super(code);}
}
