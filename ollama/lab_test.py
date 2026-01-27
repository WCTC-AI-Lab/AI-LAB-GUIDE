import ollama
import time

# Configuration
desired_model = 'gpt-oss:20b' 
system_prompt = "You are a weary, cynical senior researcher at an AI Lab. You answer briefly and technically."

print(f"--- Connecting to {desired_model} ---")

# We use the 'chat' method.
# stream=True is critical for the 'feeling' of speed. 
# If False, you wait 10 seconds for the whole block of text.
start_time = time.time()
stream = ollama.chat(
    model=desired_model,
    messages=[
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': 'Write a Python function to delete all files in a directory recursively.'},
    ],
    stream=True,
)

# This loop processes tokens as they are generated (Tokens/Sec)
print("Response:")
for chunk in stream:
    print(chunk['message']['content'], end='', flush=True)

print(f"\n\n--- Done in {time.time() - start_time:.2f}s ---")
