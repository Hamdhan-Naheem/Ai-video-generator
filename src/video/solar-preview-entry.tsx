import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {SolarExplainer} from './SolarExplainer.js';
const Root:React.FC=()=> <Composition id="SolarPreview" component={SolarExplainer} durationInFrames={1800} fps={30} width={1280} height={720} defaultProps={{stage:0,portrait:false}} calculateMetadata={({props})=>({width:props.portrait?720:1280,height:props.portrait?1280:720})}/>;
registerRoot(Root);
