import {Request, Response, Router} from 'express';
import {AccessLevel, RecordingModel} from '../db/models/recording';
import {AuthUser, optionalAuth} from '../middleware/auth-middleware';
import * as fs from 'fs/promises';
import * as path from 'path';

const router = Router();

// GET /api/recordings-list - list recordings filtered by user access level
router.get('/', optionalAuth, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user as AuthUser | undefined;

        // determine which access levels the user can see
        let accessLevels: AccessLevel[];
        if (user?.role === 'admin') {
            // admins see all recordings
            accessLevels = ['public', 'authenticated', 'admin'];
        } else if (user) {
            // authenticated users see public and authenticated recordings
            accessLevels = ['public', 'authenticated'];
        } else {
            // unauthenticated users see only public recordings
            accessLevels = ['public'];
        }

        // get recordings from database
        const recordings = RecordingModel.findByAccessLevel(accessLevels);

        // enrich with filesystem stats
        const enrichedRecordings = await Promise.all(
            recordings.map(async (recording) => {
                try {
                    const stats = await fs.stat(recording.file_path);

                    // try to get duration from m3u8 file if available
                    let duration: number | null = null;
                    try {
                        const files = await fs.readdir(recording.file_path);
                        const m3u8File = files.find((f) => f.endsWith('.m3u8'));
                        if (m3u8File) {
                            const m3u8Path = path.join(recording.file_path, m3u8File);
                            const content = await fs.readFile(m3u8Path, 'utf-8');
                            // parse #EXTINF lines to calculate total duration
                            const matches = content.matchAll(/#EXTINF:([\d.]+)/g);
                            let totalDuration = 0;
                            for (const match of matches) {
                                totalDuration += parseFloat(match[1]);
                            }
                            if (totalDuration > 0) {
                                duration = Math.round(totalDuration);
                            }
                        }
                    } catch {
                        // ignore errors reading duration
                    }

                    return {
                        id: recording.id,
                        folder_name: recording.folder_name,
                        name: recording.name,
                        access_level: recording.access_level,
                        created_at: recording.created_at,
                        file_size: stats.size,
                        modified: stats.mtime,
                        duration,
                    };
                } catch (error) {
                    // if folder doesn't exist, return without stats
                    return {
                        id: recording.id,
                        folder_name: recording.folder_name,
                        name: recording.name,
                        access_level: recording.access_level,
                        created_at: recording.created_at,
                        file_size: null,
                        modified: null,
                        duration: null,
                    };
                }
            }),
        );

        res.json({recordings: enrichedRecordings});
    } catch (error) {
        console.error('error listing recordings:', error);
        res.status(500).json({error: 'failed to list recordings'});
    }
});

export default router;
