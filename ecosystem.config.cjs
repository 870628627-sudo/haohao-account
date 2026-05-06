module.exports = {
  apps: [
    {
      name: 'haohao-account',
      script: 'server.cjs',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 5177
      }
    }
  ]
}
