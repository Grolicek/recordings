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

Node.js/Express API for scheduling, managing, and streaming recordings with role-based access control.

### Architecture

#### Database

- **Location**: `/var/www/data.oga.sk/muni/recordings/recordings.db`
- **Type**: SQLite
- **Schema**:
    - `recordings` table:
        - `id` - primary key
        - `folder_name` - unique folder identifier
        - `name` - display name
        - `access_level` - access control (public/authenticated/admin)
        - `created_at` - creation timestamp
        - `file_path` - filesystem path

#### Authentication

- **Method**: HTTP Basic Authentication
- **Users file**: `/var/www/auth/muni_oga_sk_users.htpasswd` (APR1 format)
- **Groups file**: `/var/www/auth/muni_oga_sk_groups`
- **Roles**: `admin` (full access) and `user` (limited access)

#### Access Control

- **Public**: No authentication required
- **Authenticated**: Any authenticated user (admin or user role)
- **Admin**: Admin role only
- **Default**: New recordings default to `authenticated` access level

### API Endpoints

#### Public/Optional Auth
- `GET /api/health` - health check (no auth)
- `GET /api/recordings-list` - list recordings filtered by access level
- `GET /api/stream/:foldername/playlist.m3u8` - serve HLS playlist
- `GET /api/stream/:foldername/segments/:filename` - serve HLS segments
- `GET /api/stream/:foldername/init.mp4` - serve HLS init file

#### Admin Only

- `POST /api/schedule-recording` - schedule new recording
- `GET /api/scheduled-recordings` - list scheduled recordings
- `GET /api/scheduled-recordings/:id` - get recording details
- `DELETE /api/scheduled-recordings/:id` - cancel recording
- `GET /api/user` - get authenticated user info

#### Admin User Management

- `POST /api/admin/users` - create new user
    - Body: `{username, password, role}`
    - Role: `admin` or `user`
- `GET /api/admin/users` - list all users
- `DELETE /api/admin/users/:username` - delete user

#### Admin Recording Management

- `GET /api/admin/recordings` - list all recordings (including unindexed)
- `GET /api/admin/recordings/:foldername` - get recording details
- `PUT /api/admin/recordings/:foldername/access` - update access level
    - Body: `{access_level: 'public'|'authenticated'|'admin'}`

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

- Backend process needs read/write access to `/var/www/auth/` files (htpasswd, groups)
- Backend process needs write access to `/var/www/data.oga.sk/muni/recordings/playlists/`
- Backend process needs write access to `/var/www/data.oga.sk/muni/recordings/` (for database)
- Server must have `screen`, `vlc`, `ffmpeg` installed

### HLS Streaming

- Recordings are served via `/api/stream/` endpoints with access control
- Frontend uses HLS.js to play recordings with authentication support
- Browser automatically handles Basic Auth credentials for segment requests
- Public recordings are accessible without authentication
