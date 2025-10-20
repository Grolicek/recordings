import {Request, Response, Router} from 'express';
import {recordingScheduler} from '../services/recording-scheduler';

const router = Router();

// GET /api/user - get authenticated user info
router.get('/user', (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({error: 'not authenticated'});
    }

      const isAdmin = user.role === 'admin';

    res.json({
      username: user.username,
      isAdmin,
    });
  } catch (error) {
    console.error('error fetching user info:', error);
    res.status(500).json({error: 'failed to fetch user info'});
  }
});

// POST /api/schedule-recording - schedule a new recording
router.post('/schedule-recording', async (req: Request, res: Response) => {
  try {
    const {streamUrl, playlistName, lengthSeconds, startTime} = req.body;

    // validate required fields
    if (!streamUrl || !playlistName || !lengthSeconds || !startTime) {
      return res.status(400).json({
        error: 'missing required fields: streamUrl, playlistName, lengthSeconds, startTime',
      });
    }

    // validate types
    if (typeof streamUrl !== 'string' || typeof playlistName !== 'string') {
      return res.status(400).json({error: 'streamUrl and playlistName must be strings'});
    }

    if (typeof lengthSeconds !== 'number' || lengthSeconds <= 0) {
      return res.status(400).json({error: 'lengthSeconds must be a positive number'});
    }

    // parse and validate start time
    const startDate = new Date(startTime);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({error: 'invalid startTime format'});
    }

    // ensure start time is in the future
    if (startDate <= new Date()) {
      return res.status(400).json({error: 'startTime must be in the future'});
    }

    // schedule the recording
    const recording = recordingScheduler.scheduleRecording(
      streamUrl,
      playlistName,
      lengthSeconds,
      startDate,
    );

    console.log(`recording scheduled by ${(req as any).user?.username}: ${recording.id}`);

    res.status(201).json({
      message: 'recording scheduled successfully',
      recording: {
        id: recording.id,
        streamUrl: recording.streamUrl,
        playlistName: recording.playlistName,
        lengthSeconds: recording.lengthSeconds,
        startTime: recording.startTime,
        status: recording.status,
        createdAt: recording.createdAt,
      },
    });
  } catch (error) {
    console.error('error scheduling recording:', error);
    res.status(500).json({error: 'failed to schedule recording'});
  }
});

// GET /api/scheduled-recordings - list all scheduled recordings
router.get('/scheduled-recordings', (req: Request, res: Response) => {
  try {
    const recordings = recordingScheduler.getScheduledRecordings();
    res.json({recordings});
  } catch (error) {
    console.error('error fetching scheduled recordings:', error);
    res.status(500).json({error: 'failed to fetch scheduled recordings'});
  }
});

// GET /api/scheduled-recordings/:id - get a specific recording
router.get('/scheduled-recordings/:id', (req: Request, res: Response) => {
  try {
    const {id} = req.params;
    const recording = recordingScheduler.getRecording(id);

    if (!recording) {
      return res.status(404).json({error: 'recording not found'});
    }

    res.json({recording});
  } catch (error) {
    console.error('error fetching recording:', error);
    res.status(500).json({error: 'failed to fetch recording'});
  }
});

// DELETE /api/scheduled-recordings/:id - cancel a scheduled recording
router.delete('/scheduled-recordings/:id', (req: Request, res: Response) => {
  try {
    const {id} = req.params;
    const success = recordingScheduler.cancelRecording(id);

    if (!success) {
      return res.status(404).json({error: 'recording not found or cannot be cancelled'});
    }

    console.log(`recording cancelled by ${(req as any).user?.username}: ${id}`);
    res.json({message: 'recording cancelled successfully'});
  } catch (error) {
    console.error('error cancelling recording:', error);
    res.status(500).json({error: 'failed to cancel recording'});
  }
});


export default router;
