import ollama

# Using a non-instruct model often works better for autocomplete
# but this will fix gpt-oss too.
MODEL = "gpt-oss:20b" 

def get_next_token(prefix: str) -> str:
    """Get exactly one next token using RAW mode."""
    try:
        response = ollama.generate(
            model=MODEL,
            prompt=prefix,
            raw=True,       # CRITICAL: Disables the chat template 
            stream=False,   # No streaming needed for 1 token
            options={
                "num_predict": 1,    # Stop immediately after 1 token
                "temperature": 0.0,  # 0.0 makes it deterministic (best for testing)
                "stop": ["\n"]       # Stop if it tries to start a new line
            }
        )
        return response.get('response', '')
    except Exception as e:
        print(f"Error: {e}")
        return ""

def main():
    history = ""
    print("=" * 60)
    print("AUTCOMPLETE MODE: Press Enter to Predict")
    print("=" * 60)
    
    while True:
        # Prompt user for input
        user_input = input("Current: " + history + " > ")
        
        if user_input.lower() == "exit": break
        if user_input.lower() == "clear":
            history = ""
            continue
            
        # Add user text or predict if input is empty (just hit Enter)
        if user_input:
            history += user_input
        else:
            token = get_next_token(history)
            if not token:
                # Fallback: some models need a tiny bit of temp to avoid 'empty' loops
                # Or they might be predicting a space.
                print("[No token predicted]")
            else:
                history += token
                # Show you exactly what token was added (useful for spotting spaces)
                print(f"Added: '{token}'")

if __name__ == "__main__":
    main()