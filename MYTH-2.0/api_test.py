import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_gemini_api():
    # Retrieve API key
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("❌ Error: GEMINI_API_KEY not found in environment variables.")
        print("Please ensure you have a .env file with GEMINI_API_KEY=<your_key>.")
        return

    print(f"✅ Found API Key: {api_key[:5]}...{api_key[-4:]}")

    # Configure Gemini
    genai.configure(api_key=api_key)

    try:
        model_name = "gemini-2.5-flash" 
        print(f"🤖 Connecting to Gemini Model: {model_name}...")
        
        model = genai.GenerativeModel(model_name)
        
        response = model.generate_content("Hello! This is a test. Are you working?")
        
        print("\n🎉 Success! API Response:")
        print("-" * 30)
        print(response.text)
        print("-" * 30)
        
    except Exception as e:
        print(f"\n❌ API Call Failed: {e}")

if __name__ == "__main__":
    test_gemini_api()
