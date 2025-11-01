import * as schedule from 'node-schedule';
import {v4 as uuidv4} from 'uuid';
import {RecordingParams, vlcRecordingService} from './vlc-recording-service';
import {hlsTranscodingService} from './hls-transcoding-service';
import * as fs from 'fs/promises';
import {SERVER_CONFIG} from '../config';
import * as path from 'path';
import {RecordingModel} from '../db/models/recording';

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

// serializable version for storage
interface StoredRecording {
    id: string;
    streamUrl: string;
    playlistName: string;
    lengthSeconds: number;
    startTime: string;
    status: 'pending' | 'recording' | 'transcoding' | 'completed' | 'failed';
    createdAt: string;
    error?: string;
}

class RecordingScheduler {
  private scheduledRecordings: Map<string, ScheduledRecording> = new Map();
  private jobs: Map<string, schedule.Job> = new Map();
    private dbPath: string = SERVER_CONFIG.schedulesDbPath;

    constructor() {
        // load persisted schedules on startup
        this.loadFromDisk().catch((error) => {
            console.error('failed to load persisted schedules:', error);
        });
    }

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

      // persist to disk
      this.saveToDisk();

      return recording;
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
      this.saveToDisk();
    console.log(`cancelled recording ${id}`);
    return true;
  }

    // save schedules to disk
    private async saveToDisk(): Promise<void> {
        try {
            const storedRecordings: StoredRecording[] = Array.from(this.scheduledRecordings.values()).map(
                (rec) => ({
                    id: rec.id,
                    streamUrl: rec.streamUrl,
                    playlistName: rec.playlistName,
                    lengthSeconds: rec.lengthSeconds,
                    startTime: rec.startTime.toISOString(),
                    status: rec.status,
                    createdAt: rec.createdAt.toISOString(),
                    error: rec.error,
                }),
            );
            await fs.writeFile(this.dbPath, JSON.stringify(storedRecordings, null, 2), 'utf-8');
        } catch (error) {
            console.error('failed to save schedules to disk:', error);
        }
    }

    // load schedules from disk
    private async loadFromDisk(): Promise<void> {
        try {
            const data = await fs.readFile(this.dbPath, 'utf-8');
            const storedRecordings: StoredRecording[] = JSON.parse(data);

            for (const stored of storedRecordings) {
                const recording: ScheduledRecording = {
                    id: stored.id,
                    streamUrl: stored.streamUrl,
                    playlistName: stored.playlistName,
                    lengthSeconds: stored.lengthSeconds,
                    startTime: new Date(stored.startTime),
                    status: stored.status,
                    createdAt: new Date(stored.createdAt),
                    error: stored.error,
                };

                this.scheduledRecordings.set(recording.id, recording);

                // reschedule pending jobs that haven't started yet
                if (recording.status === 'pending' && recording.startTime > new Date()) {
                    const job = schedule.scheduleJob(recording.startTime, async () => {
                        await this.executeRecording(recording.id);
                    });
                    this.jobs.set(recording.id, job);
                    console.log(
                        `restored scheduled recording ${recording.id} for ${recording.startTime.toISOString()}`,
                    );
                } else if (recording.status === 'pending') {
                    // mark as failed if start time has passed
                    recording.status = 'failed';
                    recording.error = 'missed scheduled time due to server restart';
                }
            }

            // save updated state
            await this.saveToDisk();
            console.log(`loaded ${storedRecordings.length} scheduled recordings from disk`);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                console.log('no existing schedules file found, starting fresh');
            } else {
                throw error;
            }
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
        this.saveToDisk();

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
            this.saveToDisk();
          console.log(`starting transcoding for recording ${id}`);
          await hlsTranscodingService.transcode(outputFile);

          try {
            const folderName = recording.playlistName;
            const folderPath = path.join(SERVER_CONFIG.recordingsDir, folderName);
            const dbRec = RecordingModel.ensureExists(folderName, folderPath);
            console.log(`ensured recording in DB: id=${dbRec.id}, folder=${folderName}`);
          } catch (dbErr) {
            console.error('failed to ensure recording in database:', dbErr);
          }

          recording.status = 'completed';
            this.saveToDisk();
          console.log(`recording ${id} completed successfully`);
        } catch (error) {
          recording.status = 'failed';
          recording.error = error instanceof Error ? error.message : 'transcoding failed';
            this.saveToDisk();
          console.error(`transcoding failed for recording ${id}:`, error);
        }
      }, transcodingDelay);

    } catch (error) {
      recording.status = 'failed';
      recording.error = error instanceof Error ? error.message : 'recording failed';
        this.saveToDisk();
      console.error(`recording ${id} failed:`, error);
    }
  }
}

export const recordingScheduler = new RecordingScheduler();
