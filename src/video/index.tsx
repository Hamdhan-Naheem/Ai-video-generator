import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {EducationVideo} from './EducationVideo.js';
import type {VideoProps} from '../contracts.js';
const defaults:VideoProps={title:'Education prototype',format:'landscape',durationFrames:1800,audioFile:'narration.wav',scenes:[],captions:[],mouthCues:[],burnedCaptions:false};
const Root:React.FC=()=> <Composition id="Education" component={EducationVideo} durationInFrames={1800} fps={30} width={1280} height={720} defaultProps={defaults} calculateMetadata={({props})=>({durationInFrames:props.durationFrames,width:props.format==='portrait'?720:1280,height:props.format==='portrait'?1280:720})}/>;
registerRoot(Root);
