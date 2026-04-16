module.exports = {
  apps: [
    {
      name: 'AILabGuide',
      script: 'venv/Scripts/waitress-serve.exe',
      args: '--host 0.0.0.0 --port 5000 app:app',
      cwd: 'C:/Users/AI-Lab/Desktop/AI-LAB-GUIDE',
      autorestart: true,
      watch: false,
    },
  ],
};
