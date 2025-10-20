import {Request, Response, Router} from 'express';
import {RecordingModel} from '../db/models/recording';
import {AuthUser} from '../middleware/auth-middleware';
import * as fs from 'fs/promises';
import * as path from 'path';
import {SERVER_CONFIG} from '../config';

const router = Router();

// check if user has access to recording based on access level
function hasAccess(user: AuthUser | undefined, accessLevel: string): boolean {
    if (accessLevel === 'public') {
        return true;
    }
    if (accessLevel === 'authenticated' && user) {
        return true;
    }
    if (accessLevel === 'admin' && user?.role === 'admin') {
        return true;
    }
    return false;
}

// middleware to enforce access control for streaming
function enforceStreamAccess(req: Request, res: Response, next: Function) {
    const {foldername} = req.params;
    const user = (req as any).user as AuthUser | undefined;

    // get recording from database
    const recording = RecordingModel.findByFolderName(foldername);

    if (!recording) {
        return res.status(404).json({error: 'recording not found'});
    }

    // check access
    if (!hasAccess(user, recording.access_level)) {
        if (!user) {
            res.setHeader('WWW-Authenticate', 'Basic realm="Recordings API"');
            return res.status(401).json({error: 'authentication required'});
        }
        return res.status(403).json({error: 'access denied'});
    }

    // attach recording to request for use in route handler
    (req as any).recording = recording;
    next();
}

// GET /api/stream/:foldername/playlist.m3u8 - serve m3u8 playlist file
router.get('/:foldername/playlist.m3u8', async (req: Request, res: Response) => {
    try {
        const {foldername} = req.params;
        const user = (req as any).user as AuthUser | undefined;

        // get recording from database or create if not exists
        const recordingPath = path.join(SERVER_CONFIG.recordingsDir, foldername);
        const recording = RecordingModel.ensureExists(foldername, recordingPath);

        // check access
        if (!hasAccess(user, recording.access_level)) {
            if (!user) {
                res.setHeader('WWW-Authenticate', 'Basic realm="Recordings API"');
                return res.status(401).json({error: 'authentication required'});
            }
            return res.status(403).json({error: 'access denied'});
        }

        // find .m3u8 file in folder
        const files = await fs.readdir(recordingPath);
        const m3u8File = files.find((f) => f.endsWith('.m3u8'));

        if (!m3u8File) {
            return res.status(404).json({error: 'playlist file not found'});
        }

        const filePath = path.join(recordingPath, m3u8File);
        const fileContent = await fs.readFile(filePath, 'utf-8');

        // rewrite segment URLs to point to our API
        const modifiedContent = fileContent.replace(
            /^(seg-\d+-\w+\.m4s)$/gm,
            `/api/stream/${foldername}/segments/$1`,
        );

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(modifiedContent);
    } catch (error: any) {
        console.error('error serving playlist:', error);
        if (error.code === 'ENOENT') {
            return res.status(404).json({error: 'playlist not found'});
        }
        res.status(500).json({error: 'failed to serve playlist'});
    }
});

// GET /api/stream/:foldername/segments/:filename - serve m4s segment files
router.get('/:foldername/segments/:filename', async (req: Request, res: Response) => {
    try {
        const {foldername, filename} = req.params;
        const user = (req as any).user as AuthUser | undefined;

        // get recording from database
        const recordingPath = path.join(SERVER_CONFIG.recordingsDir, foldername);
        const recording = RecordingModel.findByFolderName(foldername);

        if (!recording) {
            return res.status(404).json({error: 'recording not found'});
        }

        // check access
        if (!hasAccess(user, recording.access_level)) {
            if (!user) {
                res.setHeader('WWW-Authenticate', 'Basic realm="Recordings API"');
                return res.status(401).json({error: 'authentication required'});
            }
            return res.status(403).json({error: 'access denied'});
        }

        // validate filename to prevent directory traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({error: 'invalid filename'});
        }

        const filePath = path.join(recordingPath, filename);

        // check if file exists
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({error: 'segment not found'});
        }

        // determine content type
        let contentType = 'video/iso.segment';
        if (filename.endsWith('.mp4')) {
            contentType = 'video/mp4';
        } else if (filename.endsWith('.m4s')) {
            contentType = 'video/iso.segment';
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // cache segments for 1 year

        // stream file
        const fileStream = await fs.readFile(filePath);
        res.send(fileStream);
    } catch (error: any) {
        console.error('error serving segment:', error);
        if (error.code === 'ENOENT') {
            return res.status(404).json({error: 'segment not found'});
        }
        res.status(500).json({error: 'failed to serve segment'});
    }
});

// GET /api/stream/:foldername/init.mp4 - serve init file
router.get('/:foldername/init.mp4', async (req: Request, res: Response) => {
    try {
        const {foldername} = req.params;
        const user = (req as any).user as AuthUser | undefined;

        // get recording from database
        const recordingPath = path.join(SERVER_CONFIG.recordingsDir, foldername);
        const recording = RecordingModel.findByFolderName(foldername);

        if (!recording) {
            return res.status(404).json({error: 'recording not found'});
        }

        // check access
        if (!hasAccess(user, recording.access_level)) {
            if (!user) {
                res.setHeader('WWW-Authenticate', 'Basic realm="Recordings API"');
                return res.status(401).json({error: 'authentication required'});
            }
            return res.status(403).json({error: 'access denied'});
        }

        const filePath = path.join(recordingPath, 'init.mp4');

        // check if file exists
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({error: 'init file not found'});
        }

        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // cache init for 1 year

        // stream file
        const fileStream = await fs.readFile(filePath);
        res.send(fileStream);
    } catch (error: any) {
        console.error('error serving init file:', error);
        if (error.code === 'ENOENT') {
            return res.status(404).json({error: 'init file not found'});
        }
        res.status(500).json({error: 'failed to serve init file'});
    }
});

export default router;
