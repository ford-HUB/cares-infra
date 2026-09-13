"""
Keyword prototypes per interest code, mirroring the server's `InterestCode` enum.

The embedding model does the heavy lifting, but CARES events are written in a mix of
English, Filipino and Cebuano ("brigada", "pahinungod", "barangay") that a general
English sentence model only half understands. These lexicons give each interest a
literal vocabulary so a term the model has never seen still lands on the right tag.

Unknown codes simply get no lexicon — the service still scores them semantically.
"""

INTEREST_LEXICON: dict[str, tuple[str, ...]] = {
    "SCHOOL": (
        "school", "campus", "academic", "students", "classroom", "tutoring", "tutorial",
        "brigada eskwela", "brigada", "enrollment", "orientation", "intramurals",
        "university", "college", "faculty", "reading program", "literacy",
    ),
    "COMMUNITY": (
        "community", "barangay", "neighborhood", "sitio", "purok", "residents",
        "clean-up", "cleanup", "clean up", "coastal", "tree planting", "environment",
        "beautification", "fiesta", "livelihood", "kapitbahay", "bayanihan",
    ),
    "EMERGENCY": (
        "emergency", "disaster", "typhoon", "bagyo", "flood", "baha", "earthquake",
        "linog", "fire", "sunog", "evacuation", "evacuees", "rescue", "first aid",
        "first responders", "search and rescue", "calamity", "storm surge",
    ),
    "DONATION_DRIVE": (
        "donation drive", "donation", "donate", "drive", "collect", "collection",
        "in-kind", "goods", "supplies", "canned goods", "clothes", "school supplies",
        "drop-off", "drop off", "pledge", "sponsor", "fundraiser", "fundraising",
    ),
    "CHARITY": (
        "charity", "charitable", "fundraiser", "fundraising", "benefit", "gift-giving",
        "gift giving", "orphanage", "elderly", "home for the aged", "scholarship",
        "giving", "alms", "philanthropy", "sponsorship", "pahinungod",
    ),
    "RELIEF_PROGRAM": (
        "relief", "relief goods", "relief packs", "relief operation", "aid",
        "distribution", "affected families", "repacking", "repack", "food packs",
        "rice", "victims", "displaced", "recovery", "rehabilitation",
    ),
    "HEALTH": (
        "health", "medical", "medical mission", "wellness", "clinic", "blood donation",
        "bloodletting", "blood drive", "dental", "vaccination", "vaccine", "check-up",
        "checkup", "nutrition", "feeding program", "feeding", "mental health",
        "hygiene", "sanitation", "doctors", "nurses", "hospital",
    ),
    "OUTREACH": (
        "outreach", "visit", "visitation", "immersion", "indigenous", "far-flung",
        "remote", "mountain", "island", "community service", "mission", "sitio",
        "underserved", "marginalized", "families in need", "uplift",
    ),
    "TRAINING": (
        "training", "workshop", "skills", "hands-on", "bootcamp", "certification",
        "capacity building", "drill", "simulation", "basic life support", "bls",
        "cpr", "first aid training", "mentoring", "coaching", "practicum",
    ),
    "SEMINAR": (
        "seminar", "webinar", "talk", "lecture", "forum", "symposium", "conference",
        "awareness", "orientation", "briefing", "speaker", "keynote", "panel",
        "information drive", "info drive", "campaign", "summit",
    ),
    "OTHERS": (),
    # Legacy codes kept inactive in the catalog; harmless if the server ever sends them.
    "ACADEMIC_ACTIVITIES": ("academic", "school", "students", "campus", "tutoring"),
    "DONATION_DRIVES": ("donation", "drive", "donate", "goods", "supplies"),
    "ENVIRONMENT": (
        "environment", "environmental", "tree planting", "clean-up", "cleanup",
        "coastal", "mangrove", "recycling", "waste", "climate", "green",
    ),
}


# Short example blurbs written the way CARES events are actually announced. The
# catalog's one-line descriptions are too terse to embed well on their own — "Medical
# missions and wellness drives" sits far from "Free eye exams for seniors" — while a
# few concrete sentences per interest land close to real event copy.
INTEREST_PROTOTYPES: dict[str, tuple[str, ...]] = {
    "SCHOOL": (
        "Brigada Eskwela: repaint classrooms and repair chairs before classes open.",
        "Tutoring program for grade school pupils struggling with reading and math.",
        "Campus orientation and enrollment assistance for incoming freshmen.",
        "Intramurals and student organization activities on campus.",
        "Donating books and setting up a reading corner for a public elementary school.",
    ),
    "COMMUNITY": (
        "Coastal clean-up and tree planting with the barangay residents.",
        "Mangrove planting to restore the shoreline of a fishing village.",
        "Community beautification, painting murals and fixing the barangay hall.",
        "Livelihood workshop for mothers and out-of-school youth in the sitio.",
        "Bayanihan day: residents and volunteers work together on neighborhood projects.",
    ),
    "EMERGENCY": (
        "Rapid response volunteers needed after the typhoon flooded low-lying areas.",
        "Evacuation center support for families displaced by the earthquake.",
        "Fire victims need volunteers to assist rescue and first aid teams.",
        "Disaster preparedness drill with the city rescue unit.",
        "Emergency response team deployment for storm surge affected coastal barangays.",
    ),
    "DONATION_DRIVE": (
        "Donation drive: collect canned goods, clothes, and school supplies at the drop-off booth.",
        "Bring your old textbooks and notebooks for the school supplies drive.",
        "Fundraising campaign to sponsor Christmas gifts for orphaned children.",
        "Collecting in-kind donations and pledges for families hit by the flood.",
        "Coin bank challenge to raise funds for the scholarship fund.",
    ),
    "CHARITY": (
        "Gift-giving and feeding at the home for the aged.",
        "Charity fundraiser benefit concert for the children's cancer ward.",
        "Visit the orphanage with gifts, games, and a Christmas party.",
        "Scholarship fundraising dinner for underprivileged students.",
        "Pahinungod: giving back to the elderly and persons with disabilities.",
    ),
    "RELIEF_PROGRAM": (
        "Relief goods repacking of rice, canned goods, and water for typhoon victims.",
        "Distribution of relief packs to families affected by the flooding.",
        "Aid delivery to displaced families staying in evacuation centers.",
        "Recovery and rehabilitation assistance for communities after the calamity.",
        "Food pack distribution for households affected by the landslide.",
    ),
    "HEALTH": (
        "Free medical check-ups, eye and dental screening for residents.",
        "Bloodletting drive with the Red Cross: donate blood and save lives.",
        "Medical mission with doctors and nurses giving free consultations and medicine.",
        "Vaccination and nutrition program for children in the barangay.",
        "Feeding program serving hot meals to malnourished children.",
        "Mental health awareness and wellness check for students.",
        "Free eye exams, reading glasses, and cataract screening for senior citizens.",
    ),
    "OUTREACH": (
        "Outreach visit to an indigenous community in the mountains.",
        "Immersion program with families in a far-flung island barangay.",
        "Visiting and supporting the residents of an underserved coastal sitio.",
        "Community service mission bringing supplies to remote villages.",
        "Uplifting marginalized families through a weekend outreach.",
    ),
    "TRAINING": (
        "Basic life support and CPR training for volunteers.",
        "Hands-on first aid workshop with the city health office.",
        "Skills development bootcamp on leadership and project management.",
        "Capacity building workshop for barangay health workers.",
        "Disaster response simulation drill and certification.",
    ),
    "SEMINAR": (
        "Seminar on mental health awareness with a guest psychologist.",
        "Cybersecurity awareness talk: how to spot phishing and protect your accounts.",
        "Webinar and forum on climate change and disaster resilience.",
        "Lecture series with keynote speakers from the industry.",
        "Information drive and orientation on voter registration.",
    ),
    "OTHERS": (
        "General assembly of members to review the year and elect officers.",
        "Team building and fellowship day for the volunteer corps.",
        "Anniversary celebration and recognition night for volunteers.",
    ),
}
