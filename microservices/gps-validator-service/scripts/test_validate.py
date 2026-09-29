"""Manual probe: python scripts/test_validate.py [http://localhost:8005]

Builds four synthetic volunteers against a rectangular fence in Mandaue and
prints each verdict. Not a test suite — eyeball the output."""

import json
import sys
from datetime import datetime, timedelta, timezone

import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8005"

ZONE = {
    "type": "Polygon",
    "coordinates": [[[123.945, 10.34], [123.947, 10.34], [123.947, 10.342], [123.945, 10.342], [123.945, 10.34]]],
}
INSIDE = (10.341, 123.946)
OUTSIDE = (10.350, 123.960)

start = datetime(2026, 9, 19, 8, 0, tzinfo=timezone.utc)
end = start + timedelta(hours=2)


def walk(user, plan, step=1):
    """plan: list of (minutes_from_start, minutes_len, (lat, lng))."""
    pings = []
    for offset, length, (lat, lng) in plan:
        t0 = start + timedelta(minutes=offset)
        for s in range(0, int(length * 60), step):
            pings.append({
                "capturedAt": (t0 + timedelta(seconds=s)).isoformat(),
                "latitude": lat + (s % 7) * 1e-6,
                "longitude": lng + (s % 5) * 1e-6,
                "accuracyM": 8.0,
                "inArea": (lat, lng) == INSIDE,
            })
    return {"userId": user, "pings": pings}


body = {
    "event": {"id": 1, "startedAt": start.isoformat(), "endedAt": end.isoformat(), "geojson": ZONE},
    "participants": [
        walk("full-stay", [(0, 120, INSIDE)], step=5),
        walk("late-arrival", [(70, 50, INSIDE)], step=5),
        walk("left-early", [(0, 60, INSIDE), (60, 60, OUTSIDE)], step=5),
        walk("teleport", [(0, 30, INSIDE), (30, 1, OUTSIDE), (31, 89, INSIDE)], step=5),
        {"userId": "no-data", "pings": []},
    ],
}

req = urllib.request.Request(
    f"{BASE}/api/v1/validate",
    data=json.dumps(body).encode(),
    headers={"Content-Type": "application/json"},
)
with urllib.request.urlopen(req) as resp:
    payload = json.load(resp)

print(payload["message"], "| zone", payload["data"]["zoneAreaSqm"], "sqm")
for r in payload["data"]["results"]:
    print(f"\n{r['userId']:<14} {r['status']:<9} coverage={r['coverageRatio']:.2%} "
          f"in={r['timeIn']} out={r['timeOut']} late={r['isLate']}")
    for reason in r["reasons"]:
        print("   -", reason)
    for a in r["anomalies"]:
        print(f"   [{a['severity']}] {a['code']}: {a['message']}")
