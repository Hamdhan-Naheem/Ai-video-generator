import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {SoftwareShowcase} from './SoftwareShowcase.js';
import type {ShowcaseProps} from '../showcase-contracts.js';
const defaults:ShowcaseProps={plan:{product:'Make My Marriage',scenes:[]},scenes:[],durationFrames:1050,captions:[]};
registerRoot(()=> <Composition id="Showcase" component={SoftwareShowcase} width={1280} height={720} fps={30} durationInFrames={1050} defaultProps={defaults} calculateMetadata={({props})=>({durationInFrames:props.durationFrames})}/>);
