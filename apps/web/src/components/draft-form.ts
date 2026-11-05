import type {DraftInput,Preferences} from "@contracts";
export type DraftFormBinding={input:DraftInput;preferences:Preferences;title:string;pending:boolean;conflict:boolean;onTitleChange:(value:string)=>void;onDirty:()=>void;onSave:(input:unknown,preferences:unknown)=>void};
