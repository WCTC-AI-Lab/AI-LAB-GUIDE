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
    {
      name: 'TeachableTrainer',
      script: '.venv/Scripts/streamlit.exe',
      args: 'run app/main.py --server.port 8501',
      cwd: 'C:/Users/AI-Lab/Desktop/image-classifier',
      autorestart: true,
      watch: false,
    },
  ],
};
