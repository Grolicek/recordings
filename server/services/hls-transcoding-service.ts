import {spawn} from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export class HlsTranscodingService {
  private scriptPath: string;

  constructor(scriptPath: string) {
    this.scriptPath = scriptPath;
  }

  // execute HLS transcoding script
  async transcode(mp4FilePath: string): Promise<void> {
    console.log(`starting HLS transcoding for: ${mp4FilePath}`);

    if (!fs.existsSync(this.scriptPath)) {
      throw new Error(`transcoding script not found: ${this.scriptPath}`);
    }

    return new Promise((resolve, reject) => {
      const process = spawn('bash', [this.scriptPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
        console.log(`[transcode] ${data.toString().trim()}`);
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
        console.error(`[transcode error] ${data.toString().trim()}`);
      });

      process.on('close', (code) => {
        if (code === 0) {
          console.log(`HLS transcoding completed successfully for: ${mp4FilePath}`);
          resolve();
        } else {
          console.error(`HLS transcoding failed with code ${code}`);
          console.error(`stderr: ${stderr}`);
          reject(new Error(`transcoding failed with exit code ${code}`));
        }
      });

      process.on('error', (error) => {
        console.error(`failed to start transcoding:`, error);
        reject(error);
      });
    });
  }
}

// script path will be at server/scripts/make-hls.sh
const scriptPath = path.join(__dirname, '..', 'scripts', 'make-hls.sh');
export const hlsTranscodingService = new HlsTranscodingService(scriptPath);
