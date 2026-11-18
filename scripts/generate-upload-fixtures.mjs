import {existsSync,readFileSync,writeFileSync,mkdirSync,statSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import ffmpeg from "ffmpeg-static";
const cache=fileURLToPath(new URL("../.cache/",import.meta.url));mkdirSync(cache,{recursive:true});const path=cache+"w11-recording.mp4",stamp=cache+"w11-recording.version";const version="w11-v1-h264-720p-12s";
if(!(existsSync(path)&&existsSync(stamp)&&readFileSync(stamp,"utf8")===version&&statSync(path).size>6291456&&statSync(path).size<45000000)){
 execFileSync(ffmpeg,["-hide_banner","-loglevel","error","-y","-f","lavfi","-i","testsrc2=size=1280x720:rate=30","-t","12","-c:v","libx264","-preset","ultrafast","-crf","16","-an",path],{windowsHide:true,stdio:["ignore","pipe","pipe"]});
 const size=statSync(path).size;if(size<=6291456||size>45000000)throw Error("Synthetic recording is outside test bounds");writeFileSync(stamp,version);
}
console.log("Synthetic local upload fixture ready. No provider requests.");
