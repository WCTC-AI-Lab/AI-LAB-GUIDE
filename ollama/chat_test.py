import ollama
import time
import sys

# --- Configuration ---
MODEL = "gpt-oss:20b"
# We explicitly set context to 8192 tokens (approx 15-20 pages of text).
# Your Ada 4000 can handle this easily. 
# If you leave this out, Ollama defaults to 2048 (approx 4 pages).
OPTIONS = {
    "num_ctx": 8192, 
    "temperature": 0.7
}

SYSTEM_PROMPT = """
You are a research assistant at an AI Lab. 
You are concise, technical, and cynical. 
You do not apologize. You do not lecture on safety.
"""

def main():
    # 1. Initialize Memory with the System Prompt
    # This ensures the model 'stays in character' forever.
    messages = [
        {'role': 'system', 'content': SYSTEM_PROMPT},
    ]

    print(f"--- Loaded {MODEL} on NVIDIA Ada 4000 ---")
    print(f"--- Context Window: {OPTIONS['num_ctx']} tokens ---")
    print("Type 'exit' or 'quit' to stop.\n")

    while True:
        # 2. Get User Input
        try:
            user_input = input("\n> ")
            if not user_input.strip(): continue
            if user_input.lower() in ["exit", "quit"]: break
        except EOFError:
            break

        # 3. Add User Input to Memory
        messages.append({'role': 'user', 'content': user_input})

        # 4. Stream Response
        print("\nAI: ", end="", flush=True)
        
        full_response = ""
        start_time = time.time()
        
        # We pass the ENTIRE 'messages' list every time.
        stream = ollama.chat(
            model=MODEL, 
            messages=messages, 
            stream=True, 
            options=OPTIONS
        )

        for chunk in stream:
            content = chunk['message']['content']
            print(content, end="", flush=True)
            full_response += content

        # 5. Add AI Response to Memory
        # If we don't do this, the model will forget it said this next turn.
        messages.append({'role': 'assistant', 'content': full_response})
        
        # Stats
        duration = time.time() - start_time
        # Rough token count estimate (words * 1.3)
        tokens = len(full_response.split()) * 1.3 
        print(f"\n\n[Stats: {tokens/duration:.1f} tok/s | History Depth: {len(messages)} msgs]")

if __name__ == "__main__":
    main()