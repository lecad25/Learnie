import sys
import time
from pathlib import Path

def main():
    # Parse arguments
    topic = sys.argv[1] if len(sys.argv) > 1 else "unknown_topic"
    character = sys.argv[2] if len(sys.argv) > 2 else "unknown_character"

    # Simulate generating a video
    output_dir = Path(__file__).parent.parent / "output"
    output_dir.mkdir(exist_ok=True)

    filename = f"{character}_{topic}.mp4"
    filepath = output_dir / filename

    print(f"Generating {filename}...")
    time.sleep(2)  # simulate processing delay

    # Create a dummy file for now
    with open(filepath, "w") as f:
        f.write(f"Mock video: {character} teaching {topic}")

    print(f"Video created at: {filepath}")

if __name__ == "__main__":
    main()