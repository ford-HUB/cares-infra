"""Manual probe: python scripts/test_match.py [http://localhost:8004]"""
import json
import sys
import urllib.request

base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8004"

payload = {
    "events": [
        {
            "id": 1,
            "title": "Bloodletting Drive with Cebu Red Cross",
            "description": "Donate blood at the UCLM gym. Nurses on site, free check-up.",
        },
        {
            "id": 2,
            "title": "Relief Goods Repacking for Typhoon Victims",
            "description": "Help repack rice and canned goods for families affected in Bantayan.",
        },
        {
            "id": 3,
            "title": "Brigada Eskwela 2026",
            "description": "Paint classrooms and fix chairs before the school year opens.",
        },
    ],
    "interests": [
        {"code": "SCHOOL", "label": "School", "description": "Academic activities and campus programs"},
        {"code": "HEALTH", "label": "Health", "description": "Medical missions and wellness drives"},
        {"code": "RELIEF_PROGRAM", "label": "Relief Program", "description": "Distributing aid to affected families"},
        {"code": "DONATION_DRIVE", "label": "Donation Drive", "description": "Collecting goods, funds, and supplies"},
    ],
}

req = urllib.request.Request(
    f"{base}/api/v1/match",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json"},
)
with urllib.request.urlopen(req) as res:
    print(json.dumps(json.load(res), indent=2))
