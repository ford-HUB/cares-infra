"""Manual probe: POST a handful of survey rows and print the grouping.

    python scripts/test_cluster.py [http://localhost:8006]
"""

import json
import random
import sys
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8006"

NEEDS = ["food", "healthcare", "education", "livelihood", "financial"]
BARRIERS = ["money", "services", "distance", "information", "documents", "opportunities"]
BARANGAYS = ["Looc", "Umapad", "Opao", "Paknaan"]

rng = random.Random(7)
households = []
for i in range(40):
    archetype = i % 3
    households.append(
        {
            "id": f"hh-{i:03d}",
            "familyName": f"Family {i}",
            "barangay": BARANGAYS[archetype] if rng.random() < 0.8 else rng.choice(BARANGAYS),
            "members": rng.randint(6, 10) if archetype == 0 else rng.randint(2, 5),
            "survey": {
                "needs": rng.sample(NEEDS, k=[4, 2, 1][archetype]),
                "seriousness": [5, 4, 2][archetype],
                "barriers": rng.sample(BARRIERS, k=2),
                "communityProblem": "food",
            },
            "surveyedAt": "2026-09-01T00:00:00Z",
        }
    )

payload = json.dumps({"households": households, "k": 3, "seed": 7}).encode()
req = urllib.request.Request(
    f"{BASE}/api/v1/cluster-needs", data=payload, headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as res:
    body = json.load(res)

data = body["data"]
print(f"k={data['k']} iterations={data['iterations']} converged={data['converged']} inertia={data['inertia']}")
for c in data["clusters"]:
    print(
        f"  #{c['index']} n={len(c['householdIds'])} need={c['dominantNeed']} "
        f"priority={c['priority']} barrier={c['topBarrier']} "
        f"barangay={c['barangay']['name']} ({c['barangay']['share']:.0%}) level={c['needLevel']}"
    )
