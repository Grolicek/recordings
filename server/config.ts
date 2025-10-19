export const SERVER_CONFIG = {
  port: process.env.PORT || 3001,
  htpasswdPath: '/var/www/auth/muni_oga_sk_users.htpasswd',
  groupsPath: '/var/www/auth/muni_oga_sk_groups',
  recordingsDir: '/var/www/data.oga.sk/muni/recordings/playlists',
  adminGroup: 'admin',
};
