import httpx
import asyncio
import json

async def test_report():
    url = "http://127.0.0.1:8000/incidents"
    payload = {
        "text": "There is a strong smell of smoke and visible flames in the East Wing chemistry lab near the storage cabinets!",
        "location": "East Wing",
        "reporter_id": "sensor_01_smoke",
        "source": "sensor"
    }
    
    print(f"Sending test report to {url}...")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, timeout=30.0)
            print(f"Status: {response.status_code}")
            print("Response:")
            print(json.dumps(response.json(), indent=2))
        except Exception as e:
            print(f"Request failed (is the server running?): {e}")

if __name__ == "__main__":
    asyncio.run(test_report())
