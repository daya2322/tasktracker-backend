module.exports = {
  apps: [{
    name: "tasktracker-backend",
    cwd: "/home/ec2-user/tasktracker-backend",
    script: "npm",
    args: "start",
    watch: true,
    ignore_watch: [
      "node_modules",
      ".git",
      "logs",
      "tmp",
      "uploads",
      ".pm2",
      "*.log"
    ],
    watch_options: {
      followSymlinks: false
    },
    max_restarts: 10,
    restart_delay: 500
  }]
}
