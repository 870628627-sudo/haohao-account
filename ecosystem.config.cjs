module.exports = {
  apps: [
    {
      name: 'haohudget',
      script: 'server.cjs',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 5177
      }
    }
  ]
}
