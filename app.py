from flask import Flask, send_from_directory, request, jsonify
import os
import math
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
    
    # Cast to float to ensure Ollama accepts it correctly
    temperature = float(data.get('temperature', 0.0))

    if not model_name or prompt is None:
        return jsonify({"error": "Missing 'model' or 'prompt' in request."}), 400

    try:
        # Replicating the successful console logic
        response = ollama.generate(
            model=model_name,
            prompt=prompt,
            raw=True,       
            stream=False,   
            options={
                "num_predict": 1,    
                "temperature": temperature,
                "num_gpu": 99        
            },
            # These flags tell Ollama to expose the inner probability distribution
            logprobs=True,
            top_logprobs=5
        )
        
        next_token = response.get('response', '')
        
        # Parse the raw logprobs into human-readable percentages
        parsed_logprobs = []
        raw_logprobs = response.get('logprobs')
        
        # Ensure logprobs exist (requires a recent version of Ollama)
        if raw_logprobs and len(raw_logprobs) > 0:
            token_data = raw_logprobs[0] # Grab the data for the 1 token we generated
            top_candidates = token_data.get('top_logprobs', [])
            
            for candidate in top_candidates:
                # Convert the logprob into a percentage string
                prob_percent = math.exp(candidate.get('logprob', -100)) * 100
                parsed_logprobs.append({
                    "token": candidate.get('token', ''),
                    "prob_percent": round(prob_percent, 2)
                })
        
        return jsonify({
            "next_token": next_token,
            "prompt": prompt,
            "model": model_name,
            "logprobs": parsed_logprobs
        })

    except Exception as e:
        print(f"Error during prediction: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)