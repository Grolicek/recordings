import * as schedule from 'node-schedule';
import {v4 as uuidv4} from 'uuid';
import {vlcRecordingService, RecordingParams} from './vlc-recording-service';
import {hlsTranscodingService} from './hls-transcoding-service';

export interface ScheduledRecording {
  id: string;
  streamUrl: string;
  playlistName: string;
  lengthSeconds: number;
  startTime: Date;
  status: 'pending' | 'recording' | 'transcoding' | 'completed' | 'failed';
  createdAt: Date;
  error?: string;
}

class RecordingScheduler {
  private scheduledRecordings: Map<string, ScheduledRecording> = new Map();
  private jobs: Map<string, schedule.Job> = new Map();

  // schedule a new recording
  scheduleRecording(
    streamUrl: string,
    playlistName: string,
    lengthSeconds: number,
    startTime: Date,
  ): ScheduledRecording {
    const id = uuidv4();
    const recording: ScheduledRecording = {
      id,
      streamUrl,
      playlistName,
      lengthSeconds,
      startTime,
      status: 'pending',
      createdAt: new Date(),
    };

    this.scheduledRecordings.set(id, recording);

    // schedule the job to run at specified time
    const job = schedule.scheduleJob(startTime, async () => {
      await this.executeRecording(id);
    });

    this.jobs.set(id, job);

    console.log(`scheduled recording ${id} for ${startTime.toISOString()}`);
    return recording;
  }

  // execute recording when scheduled time arrives
  private async executeRecording(id: string): Promise<void> {
    const recording = this.scheduledRecordings.get(id);
    if (!recording) {
      console.error(`recording ${id} not found`);
      return;
    }

    try {
      console.log(`executing recording ${id}: ${recording.playlistName}`);
      recording.status = 'recording';

      const params: RecordingParams = {
        streamUrl: recording.streamUrl,
        playlistName: recording.playlistName,
        lengthSeconds: recording.lengthSeconds,
      };

      // start vlc recording
      const outputFile = await vlcRecordingService.startRecording(params);

      // schedule transcoding after recording completes
      // add some buffer time for VLC to finish and write the file
      const transcodingDelay = recording.lengthSeconds * 1000 + 30000; // +30 seconds buffer

      setTimeout(async () => {
        try {
          recording.status = 'transcoding';
          console.log(`starting transcoding for recording ${id}`);
          await hlsTranscodingService.transcode(outputFile);
          
          recording.status = 'completed';
          console.log(`recording ${id} completed successfully`);
        } catch (error) {
          recording.status = 'failed';
          recording.error = error instanceof Error ? error.message : 'transcoding failed';
          console.error(`transcoding failed for recording ${id}:`, error);
        }
      }, transcodingDelay);

    } catch (error) {
      recording.status = 'failed';
      recording.error = error instanceof Error ? error.message : 'recording failed';
      console.error(`recording ${id} failed:`, error);
    }
  }

  // get all scheduled recordings
  getScheduledRecordings(): ScheduledRecording[] {
    return Array.from(this.scheduledRecordings.values());
  }

  // get a specific recording by ID
  getRecording(id: string): ScheduledRecording | undefined {
    return this.scheduledRecordings.get(id);
  }

  // cancel a scheduled recording
  cancelRecording(id: string): boolean {
    const recording = this.scheduledRecordings.get(id);
    if (!recording) {
      return false;
    }

    // only allow cancelling pending recordings
    if (recording.status !== 'pending') {
      return false;
    }

    const job = this.jobs.get(id);
    if (job) {
      job.cancel();
      this.jobs.delete(id);
    }

    this.scheduledRecordings.delete(id);
    console.log(`cancelled recording ${id}`);
    return true;
  }
}

export const recordingScheduler = new RecordingScheduler();
