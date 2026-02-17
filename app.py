from flask import Flask, send_from_directory, request, jsonify
import os
import ollama

app = Flask(__name__, static_folder='frontend/dist', static_url_path='')

AVAILABLE_MODELS = ["gpt-oss:20b", "gemma3:27b"]

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route('/api/models', methods=['GET'])
def list_models():
    return jsonify({"models": AVAILABLE_MODELS})

@app.route('/api/predict-next-token', methods=['POST'])
def predict_next_token():
    data = request.get_json()
    model_name = data.get('model')
    prompt = data.get('prompt')
    
    # Defaulting to 0.0 for raw autocomplete consistency
    temperature = data.get('temperature', 0.0) 

    if not model_name or prompt is None:
        return jsonify({"error": "Missing 'model' or 'prompt' in request."}), 400

    try:
        # Replicating the successful console logic
        response = ollama.generate(
            model=model_name,
            prompt=prompt,
            raw=True,       # CRITICAL: Bypasses chat formatting
            stream=False,   # No streaming needed for a single token
            options={
                "num_predict": 1,    # Force 1 token stop
                "temperature": temperature,
                "num_gpu": 99        # Maximize Ada 4000 VRAM
            }
        )
        
        next_token = response.get('response', '')
        
        return jsonify({
            "next_token": next_token,
            "prompt": prompt,
            "model": model_name
        })

    except Exception as e:
        print(f"Error during prediction: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)