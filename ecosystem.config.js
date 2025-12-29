module.exports = {
  apps: [
    {
      name: "nextjs-app",
      script: "node_modules/.bin/next",
      args: "start -p 4356",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
