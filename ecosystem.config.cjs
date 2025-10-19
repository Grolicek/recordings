module.exports = {
  apps: [
    {
      name: 'recordings',
      script: 'node_modules/.bin/tsx',
      args: 'server/index.ts',
      cwd: '/var/www/recordings.muni.oga.sk',
      user: 'www-data',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '/var/log/pm2/recordings-error.log',
      out_file: '/var/log/pm2/recordings-out.log',
      time: true,
    },
  ],
};
