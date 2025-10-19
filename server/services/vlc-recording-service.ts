import {spawn} from 'child_process';
import * as path from 'path';
import {SERVER_CONFIG} from '../config';

export interface RecordingParams {
  streamUrl: string;
  playlistName: string;
  lengthSeconds: number;
}

export class VlcRecordingService {
  // start recording with VLC in screen session
  async startRecording(params: RecordingParams): Promise<string> {
    const {streamUrl, playlistName, lengthSeconds} = params;
    const outputFile = path.join(SERVER_CONFIG.recordingsDir, `${playlistName}.mp4`);

    console.log(`starting recording: ${playlistName}`);
    console.log(`stream: ${streamUrl}`);
    console.log(`duration: ${lengthSeconds}s`);
    console.log(`output: ${outputFile}`);

    // build VLC command with sout and run-time options
    const vlcCommand = [
      'vlc',
      `"${streamUrl}"`,
      `--sout "#standard{access=file,mux=ts,dst=${outputFile}}"`,
      `--run-time=${lengthSeconds}`,
    ].join(' ');

    // execute in detached screen session
    const screenCommand = `screen -dmS vlc_record ${vlcCommand}`;

    return new Promise((resolve, reject) => {
      // use shell to execute screen command
      const process = spawn('sh', ['-c', screenCommand], {
        detached: true,
        stdio: 'ignore',
      });

      process.on('error', (error) => {
        console.error(`failed to start recording ${playlistName}:`, error);
        reject(error);
      });

      // screen session starts immediately, doesn't wait for vlc to finish
      process.on('spawn', () => {
        console.log(`recording started in screen session: ${playlistName}`);
        resolve(outputFile);
      });

      // unref to allow process to continue independently
      process.unref();
    });
  }
}

export const vlcRecordingService = new VlcRecordingService();
