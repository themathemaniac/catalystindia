# ============================================================
#  CATALYST AI AGENCY — PM2 Ecosystem Config
#  Process manager for VPS deployment
# ============================================================

module.exports = {
  apps: [
    {
      name: 'catalyst-backend',
      script: './backend/server.js',
      cwd: '/var/www/catalystindia',
      instances: 'max',         // Use all CPU cores
      exec_mode: 'cluster',
      
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Logging
      log_file: '/var/log/catalyst/combined.log',
      out_file: '/var/log/catalyst/out.log',
      error_file: '/var/log/catalyst/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_size: '50M',
      retain: 7,

      // Auto-restart
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 4000,
      max_memory_restart: '300M',

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,

      // Health monitoring
      min_uptime: '10s',
    },
  ],
};
