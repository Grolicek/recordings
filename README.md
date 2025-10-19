# recordings

## Frontend
React-based frontend for browsing and playing recorded streams.

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## Backend API
Node.js/Express API for scheduling and managing stream recordings.

### API Endpoints
- `GET /api/health` - health check (no auth)
- `POST /api/schedule-recording` - schedule new recording (admin only)
- `GET /api/scheduled-recordings` - list scheduled recordings (admin only)
- `GET /api/scheduled-recordings/:id` - get recording details (admin only)
- `DELETE /api/scheduled-recordings/:id` - cancel recording (admin only)
- `GET /api/recordings` - list completed recordings (admin only)

### Development
```bash
npm run dev:server
```

### Build
```bash
npm run build:server
```

### Production
```bash
npm run server
```

### Nginx Configuration
Add to nginx config to proxy API requests:
```nginx
location /api/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### PM2 Setup
```bash
pm2 start npm --name "recordings-api" -- run server
pm2 save
pm2 startup
```

### Required Permissions
- Backend process needs read access to `/var/www/auth/` files
- Backend process needs write access to `/var/www/data.oga.sk/muni/recordings/playlists/`
- Server must have `screen`, `vlc`, `ffmpeg` installed
