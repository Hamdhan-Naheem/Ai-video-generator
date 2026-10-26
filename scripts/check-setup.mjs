import {existsSync} from 'node:fs';
import path from 'node:path';

// Setup tooling only. Pipeline application code will be TypeScript.
// Never print credential values, raw provider responses, or request headers.
const configured = (name) => Boolean(process.env[name]?.trim());
const say = (name, status) => console.log(`${name}: ${status}`);
let failed = false;
say('Node.js', process.versions.node);
say('Environment file', existsSync(path.resolve('.env')) ? 'present' : 'missing');
say('Gemini API key', configured('GEMINI_API_KEY') ? 'configured' : 'missing');
say('ElevenLabs API key', configured('ELEVENLABS_API_KEY') ? 'configured' : 'not configured (optional)');
say('ElevenLabs voice', configured('ELEVENLABS_VOICE_ID') ? 'selected; API access requires verification' : 'not selected');
say('Prototype', 'education; local processing; no Python; no music');
say('Pipeline implementation', 'not built yet; this checks setup only');

async function requestJson(url, headers) {
  const response = await fetch(url, {headers, signal: AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

if (process.argv.includes('--providers')) {
  if (configured('GEMINI_API_KEY')) {
    try {
      const names = new Set();
      let pageToken;
      for (let page = 0; page < 10; page++) {
        const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
        url.searchParams.set('pageSize', '100');
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        const data = await requestJson(url, {'x-goog-api-key': process.env.GEMINI_API_KEY});
        for (const model of data.models ?? []) names.add(model.name?.replace(/^models\//, ''));
        pageToken = data.nextPageToken;
        if (!pageToken) break;
      }
      say('Gemini authentication', 'accepted for model listing');
      for (const variable of ['GEMINI_PLANNER_MODEL', 'GEMINI_TTS_MODEL']) {
        const available = names.has(process.env[variable]);
        say(variable, available ? 'listed' : 'not listed; configuration needs review');
        if (!available) failed = true;
      }
      say('Gemini generation/free quota', 'not tested by model listing');
    } catch (error) {
      say('Gemini check', /^HTTP \d+$/.test(error.message) ? error.message : 'connection failed or timed out');
      failed = true;
    }
  } else { failed = true; }

  if (configured('ELEVENLABS_API_KEY')) {
    try {
      const headers = {'xi-api-key': process.env.ELEVENLABS_API_KEY};
      const data = await requestJson('https://api.elevenlabs.io/v1/voices', headers);
      const voice = (data.voices ?? []).find(v => v.voice_id === process.env.ELEVENLABS_VOICE_ID);
      say('ElevenLabs authentication', 'accepted for voice listing');
      say('Selected fallback voice', voice ? 'listed' : 'not listed; do not enable fallback');
      say('ElevenLabs synthesis/usage rights', 'not tested by voice listing');
      if (!voice) failed = true;
    } catch (error) {
      say('ElevenLabs check', /^HTTP \d+$/.test(error.message) ? error.message : 'connection failed or timed out');
      failed = true;
    }
  }
}
if (!configured('GEMINI_API_KEY')) failed = true;
process.exitCode = failed ? 1 : 0;
