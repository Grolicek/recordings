import {Request, Response, Router} from 'express';
import {requireAdmin} from '../middleware/auth-middleware';
import {AccessLevel, RecordingModel} from '../db/models/recording';
import * as fs from 'fs/promises';
import * as path from 'path';
import {SERVER_CONFIG} from '../config';

const router = Router();

// PUT /api/admin/recordings/:foldername/access - set recording access level
router.put('/:foldername/access', requireAdmin, async (req: Request, res: Response) => {
    try {
        const {foldername} = req.params;
        const {access_level} = req.body;

        // validate access level
        if (!access_level || !['public', 'authenticated', 'admin'].includes(access_level)) {
            return res.status(400).json({error: 'invalid access_level, must be "public", "authenticated", or "admin"'});
        }

        // check if recording exists in database
        let recording = RecordingModel.findByFolderName(foldername);

        if (!recording) {
            // check if folder exists in filesystem
            const recordingPath = path.join(SERVER_CONFIG.recordingsDir, foldername);
            try {
                await fs.access(recordingPath);
                // folder exists, create database entry
                recording = RecordingModel.ensureExists(foldername, recordingPath);
            } catch {
                return res.status(404).json({error: 'recording not found'});
            }
        }

        // update access level
        const updated = RecordingModel.updateAccessLevel(foldername, access_level as AccessLevel);

        if (!updated) {
            return res.status(500).json({error: 'failed to update access level'});
        }

        console.log(`recording access level updated: ${foldername} -> ${access_level}`);
        res.json({message: 'access level updated successfully', folder_name: foldername, access_level});
    } catch (error) {
        console.error('error updating recording access level:', error);
        res.status(500).json({error: 'failed to update access level'});
    }
});

// GET /api/admin/recordings/:foldername - get recording details
router.get('/:foldername', requireAdmin, async (req: Request, res: Response) => {
    try {
        const {foldername} = req.params;

        // get recording from database or create if not exists
        const recordingPath = path.join(SERVER_CONFIG.recordingsDir, foldername);

        // check if folder exists in filesystem
        try {
            await fs.access(recordingPath);
        } catch {
            return res.status(404).json({error: 'recording not found'});
        }

        // ensure recording exists in database
        const recording = RecordingModel.ensureExists(foldername, recordingPath);

        // get filesystem stats
        const stats = await fs.stat(recordingPath);

        // try to get duration from m3u8 file
        let duration: number | null = null;
        let m3u8File: string | null = null;
        try {
            const files = await fs.readdir(recordingPath);
            m3u8File = files.find((f) => f.endsWith('.m3u8')) || null;
            if (m3u8File) {
                const m3u8Path = path.join(recordingPath, m3u8File);
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

        res.json({
            recording: {
                id: recording.id,
                folder_name: recording.folder_name,
                name: recording.name,
                access_level: recording.access_level,
                created_at: recording.created_at,
                file_path: recording.file_path,
                file_size: stats.size,
                modified: stats.mtime,
                duration,
                m3u8_file: m3u8File,
            },
        });
    } catch (error) {
        console.error('error fetching recording details:', error);
        res.status(500).json({error: 'failed to fetch recording details'});
    }
});

// GET /api/admin/recordings - list all recordings (including those not in database)
router.get('/', requireAdmin, async (req: Request, res: Response) => {
    try {
        // get all recordings from database
        const dbRecordings = RecordingModel.findAll();
        const dbFolders = new Set(dbRecordings.map((r) => r.folder_name));

        // get all folders from filesystem
        const files = await fs.readdir(SERVER_CONFIG.recordingsDir);
        const fsFolders: string[] = [];

        for (const file of files) {
            const filePath = path.join(SERVER_CONFIG.recordingsDir, file);
            const stats = await fs.stat(filePath);
            if (stats.isDirectory()) {
                fsFolders.push(file);
            }
        }

        // combine database and filesystem recordings
        const recordings = [];

        // add database recordings
        for (const recording of dbRecordings) {
            try {
                const stats = await fs.stat(recording.file_path);
                recordings.push({
                    id: recording.id,
                    folder_name: recording.folder_name,
                    name: recording.name,
                    access_level: recording.access_level,
                    created_at: recording.created_at,
                    in_database: true,
                    exists_in_filesystem: true,
                    modified: stats.mtime,
                });
            } catch {
                // folder doesn't exist in filesystem
                recordings.push({
                    id: recording.id,
                    folder_name: recording.folder_name,
                    name: recording.name,
                    access_level: recording.access_level,
                    created_at: recording.created_at,
                    in_database: true,
                    exists_in_filesystem: false,
                    modified: null,
                });
            }
        }

        // add filesystem recordings not in database
        for (const folder of fsFolders) {
            if (!dbFolders.has(folder)) {
                try {
                    const folderPath = path.join(SERVER_CONFIG.recordingsDir, folder);
                    const stats = await fs.stat(folderPath);
                    recordings.push({
                        id: null,
                        folder_name: folder,
                        name: folder,
                        access_level: 'authenticated', // default
                        created_at: stats.birthtime.toISOString(),
                        in_database: false,
                        exists_in_filesystem: true,
                        modified: stats.mtime,
                    });
                } catch {
                    // ignore errors
                }
            }
        }

        res.json({recordings});
    } catch (error) {
        console.error('error listing admin recordings:', error);
        res.status(500).json({error: 'failed to list recordings'});
    }
});

export default router;
